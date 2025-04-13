import { z } from 'zod'
import { createDateSchema, createNumberSchema } from './common'

// Transaction type enum
export const transactionTypeEnum = z.enum([
  'INTEREST',
  'DEPOSIT',
  'WITHDRAWAL',
  'TERMINATION',
  'INTERESTPAYMENT',
  'NOTRECLAIMEDPARTIAL',
  'NOTRECLAIMED'
])

// Payment type enum
export const paymentTypeEnum = z.enum(['BANK', 'CASH', 'OTHER'])

export const transactionFormSchema = z.object({
  type: transactionTypeEnum,
  date: createDateSchema(true),
  amount: createNumberSchema(),
  paymentType: paymentTypeEnum,
})

export type TransactionFormData = z.infer<typeof transactionFormSchema> 