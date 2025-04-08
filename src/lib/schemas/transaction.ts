import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum([
    'INTEREST',
    'DEPOSIT',
    'WITHDRAWAL',
    'TERMINATION',
    'INTERESTPAYMENT',
    'NOTRECLAIMEDPARTIAL',
    'NOTRECLAIMED'
  ]),
  date: z.coerce.date(),
  amount: z.number().min(0.01),
  paymentType: z.enum(['BANK', 'CASH', 'OTHER']),
})

export type TransactionFormData = z.infer<typeof transactionSchema> 