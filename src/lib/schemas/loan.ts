import { TerminationType } from '@prisma/client';
import { z } from 'zod';

import {
  additionalFieldValuesSchema,
  contractStatusEnum,
  createDateSchema,
  createNumberSchemaRequired,
  interestMethodEnum,
  interestPaymentTypeEnum,
  interestPayoutTypeEnum,
  optionalNumberSchema,
  periodTypeEnum,
} from './common';
// Define the loan form schema based on the Prisma model
export const loanFormSchema = z
  .object({
    // General Information
    lenderId: z.string().min(1, { message: 'validation.common.required' }),
    signDate: createDateSchema(true),
    amount: createNumberSchemaRequired(0.01),
    interestRate: createNumberSchemaRequired(0),

    // Termination Information
    terminationType: z.nativeEnum(TerminationType),
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
    additionalFields: additionalFieldValuesSchema.default({}).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validate fields based on terminationType
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
  });

export type LoanFormData = z.infer<typeof loanFormSchema>;
