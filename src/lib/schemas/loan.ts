import { TerminationType } from '@prisma/client';
import { z } from 'zod';

import {
  additionalFieldValuesSchema,
  contractStatusEnum,
  createDateSchema,
  createNumberSchemaRequired,
  interestMethodEnum,
  optionalNumberSchema,
  periodTypeEnum,
} from './common';
// Define the loan form schema based on the Prisma model

export const validateTermination = (data: LoanTerminationData, ctx: z.RefinementCtx) => {
  if (data.terminationType === 'ENDDATE') {
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['endDate'],
      });
    }
  } else if (data.terminationType === 'TERMINATION') {
    if (!data.terminationPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['terminationPeriod'],
      });
    }
    if (!data.terminationPeriodType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['terminationPeriodType'],
      });
    }
  } else if (data.terminationType === 'DURATION') {
    if (!data.duration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['duration'],
      });
    }
    if (!data.durationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['durationType'],
      });
    }
  }
};

export const loanTerminationSchema = z.object({
  // Termination Information
  terminationType: z.nativeEnum(TerminationType),
  endDate: createDateSchema(false),
  terminationDate: createDateSchema(false),
  terminationPeriod: optionalNumberSchema,
  terminationPeriodType: periodTypeEnum.nullable().optional(),
  duration: optionalNumberSchema,
  durationType: periodTypeEnum.nullable().optional(),
});

export const loanFormSchema = z
  .object({
    // General Information
    lenderId: z.string().min(1, { message: 'validation.common.required' }),
    signDate: createDateSchema(true),
    amount: createNumberSchemaRequired(0.01),
    interestRate: createNumberSchemaRequired(0),

    // Termination Information
    ...loanTerminationSchema.shape,

    // Additional Information
    altInterestMethod: interestMethodEnum.nullable().optional(),
    contractStatus: contractStatusEnum.default('PENDING'),
    additionalFields: additionalFieldValuesSchema.default({}).optional().nullable(),
  })
  .superRefine(validateTermination);

export type LoanFormData = z.infer<typeof loanFormSchema>;
export type LoanTerminationData = z.infer<typeof loanTerminationSchema>;
