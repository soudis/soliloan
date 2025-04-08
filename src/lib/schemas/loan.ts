import { z } from 'zod'

// Define the loan form schema based on the Prisma model
export const loanFormSchema = z.discriminatedUnion('terminationType', [
  // ENDDATE termination type
  z.object({
    // General Information
    lenderId: z.string().min(1, { message: 'Lender is required' }),
    signDate: z.coerce.date({ required_error: 'Sign date is required' }),
    amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
    interestRate: z.number().min(0, { message: 'Interest rate must be greater than or equal to 0' }),

    // Termination Information
    terminationType: z.literal('ENDDATE'),
    endDate: z.coerce.date({ required_error: 'End date is required' }),
    terminationDate: z.coerce.date().nullable().optional(),
    terminationPeriod: z.number().nullable().optional(),
    terminationPeriodType: z.enum(['MONTHS', 'YEARS']).nullable().optional(),
    duration: z.number().nullable().optional(),
    durationType: z.enum(['MONTHS', 'YEARS']).nullable().optional(),

    // Additional Information
    interestPaymentType: z.enum(['YEARLY', 'END']),
    interestPayoutType: z.enum(['MONEY', 'COUPON']),
    altInterestMethod: z.enum([
      'ACT_365_NOCOMPOUND',
      'E30_360_NOCOMPOUND',
      'ACT_360_NOCOMPOUND',
      'ACT_ACT_NOCOMPOUND',
      'ACT_365_COMPOUND',
      'E30_360_COMPOUND',
      'ACT_360_COMPOUND',
      'ACT_ACT_COMPOUND'
    ]).nullable().optional(),
    contractStatus: z.enum(['PENDING', 'COMPLETED']).default('PENDING'),
  }),

  // TERMINATION termination type
  z.object({
    // General Information
    lenderId: z.string().min(1, { message: 'Lender is required' }),
    signDate: z.coerce.date({ required_error: 'Sign date is required' }),
    amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
    interestRate: z.number().min(0, { message: 'Interest rate must be greater than or equal to 0' }),

    // Termination Information
    terminationType: z.literal('TERMINATION'),
    endDate: z.coerce.date().nullable().optional(),
    terminationDate: z.coerce.date().nullable().optional(),
    terminationPeriod: z.number().min(1, { message: 'Termination period is required' }),
    terminationPeriodType: z.enum(['MONTHS', 'YEARS']).default('MONTHS'),
    duration: z.number().nullable().optional(),
    durationType: z.enum(['MONTHS', 'YEARS']).nullable().optional(),

    // Additional Information
    interestPaymentType: z.enum(['YEARLY', 'END']),
    interestPayoutType: z.enum(['MONEY', 'COUPON']),
    altInterestMethod: z.enum([
      'ACT_365_NOCOMPOUND',
      'E30_360_NOCOMPOUND',
      'ACT_360_NOCOMPOUND',
      'ACT_ACT_NOCOMPOUND',
      'ACT_365_COMPOUND',
      'E30_360_COMPOUND',
      'ACT_360_COMPOUND',
      'ACT_ACT_COMPOUND'
    ]).nullable().optional(),
    contractStatus: z.enum(['PENDING', 'COMPLETED']).default('PENDING'),
  }),

  // DURATION termination type
  z.object({
    // General Information
    lenderId: z.string().min(1, { message: 'Lender is required' }),
    signDate: z.coerce.date({ required_error: 'Sign date is required' }),
    amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
    interestRate: z.number().min(0, { message: 'Interest rate must be greater than or equal to 0' }),

    // Termination Information
    terminationType: z.literal('DURATION'),
    endDate: z.coerce.date().nullable().optional(),
    terminationDate: z.coerce.date().nullable().optional(),
    terminationPeriod: z.number().nullable().optional(),
    terminationPeriodType: z.enum(['MONTHS', 'YEARS']).nullable().optional(),
    duration: z.number().min(1, { message: 'Duration is required' }),
    durationType: z.enum(['MONTHS', 'YEARS']),

    // Additional Information
    interestPaymentType: z.enum(['YEARLY', 'END']),
    interestPayoutType: z.enum(['MONEY', 'COUPON']),
    altInterestMethod: z.enum([
      'ACT_365_NOCOMPOUND',
      'E30_360_NOCOMPOUND',
      'ACT_360_NOCOMPOUND',
      'ACT_ACT_NOCOMPOUND',
      'ACT_365_COMPOUND',
      'E30_360_COMPOUND',
      'ACT_360_COMPOUND',
      'ACT_ACT_COMPOUND'
    ]).nullable().optional(),
    contractStatus: z.enum(['PENDING', 'COMPLETED']).default('PENDING'),
  })
])

export type LoanFormData = z.infer<typeof loanFormSchema> 