import { PaymentType, TransactionType } from '@prisma/client';
import { z } from 'zod';

import { createDateSchema, createNumberSchemaRequired, selectEnumRequired } from './common';

// Transaction type enum
export const transactionTypeEnum = selectEnumRequired(TransactionType);

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
