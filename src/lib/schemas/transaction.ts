import { PaymentType, TransactionType } from '@prisma/client';
import { z } from 'zod';

import { BOOKABLE_TYPES } from '@/lib/loans/transaction-validation';

import { createDateSchema, createNumberSchemaRequired, selectEnumRequired } from './common';

/** Types a user can book. Interest rows are calculated, never stored, and the validator skips them. */
export const transactionTypeEnum = selectEnumRequired(TransactionType).refine((type) => BOOKABLE_TYPES.includes(type), {
  message: 'validation.common.required',
});

// Payment type enum
export const paymentTypeEnum = selectEnumRequired(PaymentType);

export const transactionFormSchema = z.object({
  // A Zinsübertrag is only booked by an Import (ADR 0010), never entered by hand.
  type: transactionTypeEnum.refine((type) => type !== TransactionType.INTERESTCARRYOVER, {
    message: 'validation.transaction.importOnly',
  }),
  date: createDateSchema(true),
  amount: createNumberSchemaRequired(),
  paymentType: paymentTypeEnum,
  /** Notify lender by email (system template `transaction-notification-email`); default off. */
  notifyLender: z.boolean().default(false),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;
