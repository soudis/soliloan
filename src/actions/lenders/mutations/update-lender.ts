'use server';

import { Entity, Language, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getChangedFields, getLenderContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { lenderFormSchema } from '@/lib/schemas/lender';
import { getLenderName } from '@/lib/utils';
import { lenderAction } from '@/lib/utils/safe-action';

export const updateLenderAction = lenderAction
  .inputSchema(
    z.object({
      lenderId: z.string(),
      data: lenderFormSchema,
    }),
  )
  .action(async ({ parsedInput: { lenderId, data } }) => {
    // Fetch the lender
    const lender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            configuration: true,
          },
        },
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
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
    revalidatePath(`/${lender.projectId}/lenders/${updatedLender.id}`);
    revalidatePath(`/${lender.projectId}/lenders`);

    return { success: true };
  });
