'use server';

import { type Country, Entity, Language, Operation, SoliLoansTheme } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { lenderFormSchema } from '@/lib/schemas/lender';
import { getLenderName } from '@/lib/utils';
import { getNextLenderNumber } from '@/lib/utils/numbering';
import { projectAction } from '@/lib/utils/safe-action';

export const createLenderAction = projectAction.inputSchema(lenderFormSchema).action(async ({ parsedInput: data }) => {
  // Determine language (fetch project configuration if not available in context or data)
  // projectAction doesn't fetch valid project structure by default, so we might need to fetch language.
  // Optimization: we can just fetch language.
  const project = await db.project.findUnique({
    where: { id: data.projectId },
    select: { configuration: { select: { userLanguage: true, userTheme: true } } },
  });

  if (!project) throw new Error('error.project.notFound');
  if (!project.configuration) throw new Error('error.configuration.notFound');
  const configuration = project.configuration;

  const userLanguage = configuration.userLanguage ?? Language.de;
  const userTheme = configuration.userTheme ?? SoliLoansTheme.default;

  const lender = await db.$transaction(async (tx) => {
    const nextLenderNumber = await getNextLenderNumber(tx, data.projectId);

    return tx.lender.create({
      data: {
        lenderNumber: nextLenderNumber,
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
        country: data.country as Country,
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
                language: userLanguage,
                theme: userTheme,
              },
            },
          },
        }),
        project: {
          connect: {
            id: data.projectId,
          },
        },
      },
    });
  });

  // Create audit trail entry
  await createAuditEntry(db, {
    entity: Entity.lender,
    operation: Operation.CREATE,
    primaryKey: lender.id,
    before: {},
    after: removeNullFields(lender),
    context: getLenderContext(lender),
    projectId: data.projectId,
  });

  // Revalidate the lenders page
  revalidatePath('/lenders');

  return { id: lender.id };
});
