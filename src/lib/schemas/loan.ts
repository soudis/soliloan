import { z } from 'zod'
import {
  contractStatusEnum,
  interestMethodEnum,
  interestPaymentTypeEnum,
  interestPayoutTypeEnum,
  periodTypeEnum
} from './common'

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
    terminationPeriodType: periodTypeEnum.nullable().optional(),
    duration: z.number().nullable().optional(),
    durationType: periodTypeEnum.nullable().optional(),

    // Additional Information
    interestPaymentType: interestPaymentTypeEnum,
    interestPayoutType: interestPayoutTypeEnum,
    altInterestMethod: interestMethodEnum.nullable().optional(),
    contractStatus: contractStatusEnum.default('PENDING'),
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
    terminationPeriodType: periodTypeEnum.default('MONTHS'),
    duration: z.number().nullable().optional(),
    durationType: periodTypeEnum.nullable().optional(),

    // Additional Information
    interestPaymentType: interestPaymentTypeEnum,
    interestPayoutType: interestPayoutTypeEnum,
    altInterestMethod: interestMethodEnum.nullable().optional(),
    contractStatus: contractStatusEnum.default('PENDING'),
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
    terminationPeriodType: periodTypeEnum.nullable().optional(),
    duration: z.number().min(1, { message: 'Duration is required' }),
    durationType: periodTypeEnum,

    // Additional Information
    interestPaymentType: interestPaymentTypeEnum,
    interestPayoutType: interestPayoutTypeEnum,
    altInterestMethod: interestMethodEnum.nullable().optional(),
    contractStatus: contractStatusEnum.default('PENDING'),
  })
])

export type LoanFormData = z.infer<typeof loanFormSchema> 