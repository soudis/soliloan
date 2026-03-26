'use server';

import { type Country, Entity, Language, Operation, SoliLoansTheme } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { lenderFormSchema } from '@/lib/schemas/lender';
import { getLenderName } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

async function getNextLenderNumber(projectId: string): Promise<number> {
  const result = await db.lender.aggregate({
    where: { projectId },
    _max: { lenderNumber: true },
  });
  return (result._max.lenderNumber ?? 0) + 1;
}

export const createLenderAction = projectAction.inputSchema(lenderFormSchema).action(async ({ parsedInput: data }) => {
  const project = await db.project.findUnique({
    where: { id: data.projectId },
    select: { configuration: { select: { userLanguage: true, userTheme: true } } },
  });

  if (!project) throw new Error('error.project.notFound');
  if (!project.configuration) throw new Error('error.configuration.notFound');
  const configuration = project.configuration;

  const userLanguage = configuration.userLanguage ?? Language.de;
  const userTheme = configuration.userTheme ?? SoliLoansTheme.default;

  const lenderNumber = data.lenderNumber ?? (await getNextLenderNumber(data.projectId));

  if (data.lenderNumber) {
    const existing = await db.lender.findFirst({
      where: { lenderNumber: data.lenderNumber, projectId: data.projectId },
      select: { id: true },
    });
    if (existing) return { fieldErrors: { lenderNumber: 'error.lender.numberAlreadyExists' } };
  }

  const lender = await db.lender.create({
    data: {
      lenderNumber,
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
      notificationType: data.notificationType,
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
