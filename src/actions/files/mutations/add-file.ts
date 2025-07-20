'use server';

import { exec } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
  createAuditEntry,
  getFileContext,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { FileFormData } from '@/lib/schemas/file';

const execAsync = promisify(exec);

export async function addFile(
  lenderId: string,
  loanId: string | undefined,
  data: FileFormData,
  base64Data: string,
  mimeType: string,
) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const lender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
          },
        },
        loans: true,
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }
    const loan = loanId ? lender.loans.find((loan) => loan.id === loanId) : undefined;

    if (loanId && !loan) {
      throw new Error('Loan not found');
    }

    const hasAccess = session.user.isAdmin || lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this lender');
    }

    // Convert base64 back to Uint8Array
    const binaryData = Buffer.from(base64Data, 'base64');

    // Generate thumbnail for image files and PDFs
    let thumbnailData: Uint8Array | undefined;
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      try {
        // Create temporary files
        const tempInputPath = join(tmpdir(), `${Date.now()}-input`);
        const tempOutputPath = join(tmpdir(), `${Date.now()}-output`);

        // Write the original file
        await writeFile(tempInputPath, binaryData);

        // Generate thumbnail using convert command
        if (mimeType === 'application/pdf') {
          // For PDFs, use higher density and explicit format
          await execAsync(
            `convert -density 300 "${tempInputPath}[0]" -background white -alpha remove -alpha off -resize 384x384^ -gravity center -extent 384x384 -quality 90 "${tempOutputPath}.png"`,
          );
          // Rename the output file to match the expected path
          await execAsync(`mv "${tempOutputPath}.png" "${tempOutputPath}"`);
        } else {
          // For images, use the standard conversion
          await execAsync(
            `convert "${tempInputPath}" -resize 384x384^ -gravity center -extent 384x384 "${tempOutputPath}"`,
          );
        }

        // Read the thumbnail
        thumbnailData = await readFile(tempOutputPath);

        // Clean up temporary files
        await Promise.all([unlink(tempInputPath), unlink(tempOutputPath)]);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Continue without thumbnail if generation fails
      }
    }

    // Create the file
    const file = await db.file.create({
      data: {
        name: data.name,
        mimeType,
        data: new Uint8Array(binaryData),
        thumbnail: thumbnailData,
        public: data.public ?? false,
        description: data.description,
        loan: loanId
          ? {
              connect: {
                id: loanId,
              },
            }
          : undefined,
        lender: {
          connect: {
            id: lenderId,
          },
        },
        createdBy: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });

    // Create audit trail entry
    const fileForAudit = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      public: file.public,
      description: file.description,
      lenderId: file.lenderId,
      loanId: file.loanId,
    };

    await createAuditEntry(db, {
      entity: Entity.file,
      operation: Operation.CREATE,
      primaryKey: file.id,
      before: {},
      after: removeNullFields(fileForAudit),
      context: {
        ...getLenderContext(lender),
        ...(loanId && loan && getLoanContext(loan)),
        ...getFileContext(file),
      },
      projectId: lender.project.id,
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { file };
  } catch (error) {
    console.error('Error creating file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create file',
    };
  }
}
