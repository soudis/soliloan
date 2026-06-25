import { Country } from '@prisma/client';
import { z } from 'zod';

export const getInstitutionsSchema = z.object({
  projectId: z.string().min(1),
  country: z.enum(Country),
});

export const createRequisitionSchema = z.object({
  projectId: z.string().min(1),
  institutionId: z.string().min(1, { message: 'validation.common.required' }),
});

export const deleteBankConnectionSchema = z.object({
  projectId: z.string().min(1),
  connectionId: z.string().min(1),
});

export type GetInstitutionsData = z.infer<typeof getInstitutionsSchema>;
export type CreateRequisitionData = z.infer<typeof createRequisitionSchema>;
export type DeleteBankConnectionData = z.infer<typeof deleteBankConnectionSchema>;
