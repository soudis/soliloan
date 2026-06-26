'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { createRequisition, getInstitution } from '@/lib/gocardless/client';
import { createRequisitionSchema } from '@/lib/schemas/gocardless';
import { getAppBaseUrl } from '@/lib/templates/system-merge-links';
import { projectAction } from '@/lib/utils/safe-action';

export const createRequisitionAction = projectAction
  .inputSchema(createRequisitionSchema)
  .action(async ({ parsedInput: { projectId, institutionId } }) => {
    // For now we only allow a single bank connection per project.
    const existing = await db.bankConnection.count({ where: { projectId } });
    if (existing > 0) {
      throw new Error('error.gocardless.alreadyLinked');
    }

    const baseUrl = getAppBaseUrl();
    if (!baseUrl) {
      throw new Error('error.gocardless.notConfigured');
    }

    // In dev always use the GoCardless sandbox institution, regardless of the
    // bank selected in the dialog, so the flow can be tested without a real bank.
    const resolvedInstitutionId = process.env.ENVIRONMENT === 'dev' ? 'SANDBOXFINANCE_SFIN0000' : institutionId;

    const institution = await getInstitution(resolvedInstitutionId);

    const reference = randomUUID();
    const requisition = await createRequisition({
      institutionId: resolvedInstitutionId,
      reference,
      redirect: `${baseUrl}/api/gocardless/callback`,
    });

    await db.bankConnection.create({
      data: {
        projectId,
        requisitionId: requisition.id,
        reference,
        institutionId: resolvedInstitutionId,
        institutionName: institution.name,
        institutionLogo: institution.logo ?? null,
        status: requisition.status,
        agreementId: requisition.agreement ?? null,
        accountIds: requisition.accounts ?? [],
      },
    });

    revalidatePath('/configuration');

    return { link: requisition.link };
  });
