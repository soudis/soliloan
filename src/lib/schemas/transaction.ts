import { PaymentType, TransactionType } from "@prisma/client";
import { z } from "zod";

import {
  createDateSchema,
  createNumberSchema,
  selectEnumRequired,
} from "./common";

// Transaction type enum
export const transactionTypeEnum = selectEnumRequired(TransactionType);

// Payment type enum
export const paymentTypeEnum = selectEnumRequired(PaymentType);

export const transactionFormSchema = z.object({
  type: transactionTypeEnum,
  date: createDateSchema(true),
  amount: createNumberSchema(),
  paymentType: paymentTypeEnum,
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;
