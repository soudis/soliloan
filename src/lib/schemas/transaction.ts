import { PaymentType, TransactionType } from '@prisma/client'
import { z } from 'zod'
import { createDateSchema, createNumberSchema } from './common'

// Transaction type enum
export const transactionTypeEnum = z.nativeEnum(TransactionType)

// Payment type enum
export const paymentTypeEnum = z.nativeEnum(PaymentType)

export const transactionFormSchema = z.object({
  type: transactionTypeEnum,
  date: createDateSchema(true),
  amount: createNumberSchema(),
  paymentType: paymentTypeEnum,
})

export type TransactionFormData = z.infer<typeof transactionFormSchema> 