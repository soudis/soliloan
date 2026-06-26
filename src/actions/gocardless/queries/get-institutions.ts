'use server';

import { listInstitutions } from '@/lib/gocardless/client';
import { getInstitutionsSchema } from '@/lib/schemas/gocardless';
import { projectAction } from '@/lib/utils/safe-action';

export const getInstitutionsAction = projectAction
  .inputSchema(getInstitutionsSchema)
  .action(async ({ parsedInput: { country } }) => {
    const institutions = await listInstitutions(country);

    return institutions
      .map((institution) => ({
        id: institution.id,
        name: institution.name,
        bic: institution.bic ?? null,
        logo: institution.logo ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
