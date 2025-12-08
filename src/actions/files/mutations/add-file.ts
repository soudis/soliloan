'use server';

import { exec } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createAuditEntry,
  getFileContext,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { fileSchema } from '@/lib/schemas/file';
import { lenderAction } from '@/lib/utils/safe-action';

const execAsync = promisify(exec);

export const addFileAction = lenderAction
  .schema(
    z.object({
      lenderId: z.string(),
      loanId: z.string().optional(),
      data: fileSchema, // Fixed import
      base64Data: z.string(),
      mimeType: z.string(),
    }),
  )
  .action(async ({ parsedInput: { lenderId, loanId, data, base64Data, mimeType }, ctx }) => {
    // Fetch lender to ensure existence and get context
    // Casting to LenderWithRelations or verifying fields
    const lender = await db.lender.findUnique({
      where: { id: lenderId },
      include: {
        project: true,
        loans: true,
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    const loan = loanId ? lender.loans.find((l) => l.id === loanId) : undefined;
    if (!loan) {
      throw new Error('Loan not found');
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
        // Fix conditional connect syntax
        ...(loanId
          ? {
              loan: {
                connect: {
                  id: loanId,
                },
              },
            }
          : {}),
        lender: {
          connect: {
            id: lenderId,
          },
        },
        createdBy: {
          connect: {
            id: ctx.session.user.id,
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
        ...getLenderContext(lender), // Cast to handle complex includes
        ...(loanId && loan && getLoanContext(loan)),
        ...getFileContext(file),
      },
      projectId: lender.projectId,
    });

    // Revalidate paths
    if (loanId) {
      revalidatePath(`/loans/${loanId}`);
    }
    revalidatePath(`/lenders/${lenderId}`);

    return { fileId: file.id };
  });
