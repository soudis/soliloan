import { Country, TransactionType } from '@prisma/client';
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

export const loadImportBatchSchema = z.object({
  projectId: z.string().min(1),
  accountId: z.string().min(1),
});

export const updateImportRowSchema = z.object({
  projectId: z.string().min(1),
  rowId: z.string().min(1),
  selectedLenderId: z.string().nullable().optional(),
  selectedLoanId: z.string().nullable().optional(),
  selectedType: z.nativeEnum(TransactionType).nullable().optional(),
});

export const finalizeImportBatchSchema = z.object({
  projectId: z.string().min(1),
  rowIds: z.array(z.string().min(1)).min(1),
});

export type GetInstitutionsData = z.infer<typeof getInstitutionsSchema>;
export type CreateRequisitionData = z.infer<typeof createRequisitionSchema>;
export type DeleteBankConnectionData = z.infer<typeof deleteBankConnectionSchema>;
export type LoadImportBatchData = z.infer<typeof loadImportBatchSchema>;
export type UpdateImportRowData = z.infer<typeof updateImportRowSchema>;
export type FinalizeImportBatchData = z.infer<typeof finalizeImportBatchSchema>;
