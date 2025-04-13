import { z } from 'zod';
import {
  contractStatusEnum,
  createDateSchema,
  createNumberSchema,
  interestMethodEnum,
  interestPaymentTypeEnum,
  interestPayoutTypeEnum,
  optionalNumberSchema,
  periodTypeEnum
} from './common';

// Define the loan form schema based on the Prisma model
export const loanFormSchema = z.object({
  // General Information
  lenderId: z.string().min(1, { message: 'Lender is required' }),
  signDate: createDateSchema(true),
  amount: createNumberSchema(0.01),
  interestRate: createNumberSchema(0),

  // Termination Information
  terminationType: z.enum(['ENDDATE', 'TERMINATION', 'DURATION']),
  endDate: createDateSchema(false),
  terminationDate: createDateSchema(false),
  terminationPeriod: optionalNumberSchema,
  terminationPeriodType: periodTypeEnum.nullable().optional(),
  duration: optionalNumberSchema,
  durationType: periodTypeEnum.nullable().optional(),

  // Additional Information
  interestPaymentType: interestPaymentTypeEnum,
  interestPayoutType: interestPayoutTypeEnum,
  altInterestMethod: interestMethodEnum.nullable().optional(),
  contractStatus: contractStatusEnum.default('PENDING'),
}).superRefine((data, ctx) => {
  // Validate fields based on terminationType
  if (data.terminationType === 'ENDDATE') {
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is required for ENDDATE termination type',
        path: ['endDate'],
      });
    }
  } else if (data.terminationType === 'TERMINATION') {
    if (!data.terminationPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Termination period is required for TERMINATION termination type',
        path: ['terminationPeriod'],
      });
    }
    if (!data.terminationPeriodType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Termination period type is required for TERMINATION termination type',
        path: ['terminationPeriodType'],
      });
    }
  } else if (data.terminationType === 'DURATION') {
    if (!data.duration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duration is required for DURATION termination type',
        path: ['duration'],
      });
    }
    if (!data.durationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duration type is required for DURATION termination type',
        path: ['durationType'],
      });
    }
  }
});

export type LoanFormData = z.infer<typeof loanFormSchema> 