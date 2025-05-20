'use server';

import { Entity, Language, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getChangedFields, getLenderContext } from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LenderFormData } from '@/lib/schemas/lender';
import { getLenderName } from '@/lib/utils';

export async function updateLender(lenderId: string, data: LenderFormData) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the lender
    const lender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
            configuration: true,
          },
        },
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    // Check if the user has access to the lender's project
    const hasAccess = lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this lender');
    }

    // Update the lender
    const updatedLender = await db.lender.update({
      where: {
        id: lenderId,
      },
      data: {
        type: data.type,
        salutation: data.salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        organisationName: data.organisationName,
        titlePrefix: data.titlePrefix,
        titleSuffix: data.titleSuffix,
        street: data.street,
        addon: data.addon,
        zip: data.zip,
        place: data.place,
        country: data.country,
        telNo: data.telNo,
        iban: data.iban,
        bic: data.bic,
        additionalFields: data.additionalFields ?? {},
        ...(data.email && {
          user: {
            connectOrCreate: {
              where: { email: data.email },
              create: {
                email: data.email,
                name: getLenderName(data),
                language: lender.project.configuration?.userLanguage ?? Language.de,
              },
            },
          },
        }),
      },
    });

    // Create audit trail entry
    const { before, after } = getChangedFields(lender, updatedLender);
    if (Object.keys(before).length > 0) {
      await createAuditEntry(db, {
        entity: Entity.lender,
        operation: Operation.UPDATE,
        primaryKey: lenderId,
        before,
        after,
        context: getLenderContext(updatedLender),
        projectId: lender.projectId,
      });
    }

    // Revalidate the lenders page
    revalidatePath(`/lenders/${updatedLender.id}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating lender:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to update lender',
    };
  }
}
