import type { ContractStatus, DurationType, InterestMethod, SavingsRateType } from '@prisma/client';
import { SavingsRateType as SavingsRateTypeEnum, TerminationType } from '@prisma/client';
import { z } from 'zod';

import {
  additionalFieldValuesSchema,
  contractStatusEnum,
  createDateSchema,
  createNumberSchemaRequired,
  interestMethodEnum,
  optionalIntSchema,
  optionalNumberSchema,
  periodTypeEnum,
  selectEnumOptional,
} from './common';
// Define the loan form schema based on the Prisma model

export const validateTermination = (data: LoanTerminationData, ctx: z.RefinementCtx) => {
  if (data.terminationType === 'ENDDATE') {
    if (!data.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['endDate'],
      });
    }
  } else if (data.terminationType === 'TERMINATION') {
    if (!data.terminationPeriod) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['terminationPeriod'],
      });
    }
    if (!data.terminationPeriodType) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['terminationPeriodType'],
      });
    }
  } else if (data.terminationType === 'DURATION') {
    if (!data.duration) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['duration'],
      });
    }
    if (!data.durationType) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['durationType'],
      });
    }
  }
};

export const loanTerminationSchema = z.object({
  // Termination Information
  terminationType: z.enum(TerminationType),
  endDate: createDateSchema(false),
  terminationPeriod: optionalNumberSchema,
  terminationPeriodType: periodTypeEnum.nullable().optional(),
  duration: optionalNumberSchema,
  durationType: periodTypeEnum.nullable().optional(),
});

export const savingsRateTypeEnum = selectEnumOptional(SavingsRateTypeEnum);

export const loanSavingsSchema = z.object({
  isSavingsContract: z.boolean().default(false),
  savingsRateType: savingsRateTypeEnum.nullable().optional(),
  savingsMonthlyAmount: optionalNumberSchema,
  savingsDepositCount: optionalIntSchema,
  savingsFirstDepositDate: createDateSchema(false),
  savingsLastDepositDate: createDateSchema(false),
});

export type LoanSavingsData = z.infer<typeof loanSavingsSchema>;

export const validateSavings = (data: LoanSavingsData, ctx: z.RefinementCtx) => {
  if (!data.isSavingsContract) return;

  if (!data.savingsRateType) {
    ctx.addIssue({
      code: 'custom',
      message: 'validation.common.required',
      path: ['savingsRateType'],
    });
  }

  if (data.savingsRateType === 'FIXED') {
    if (!data.savingsMonthlyAmount) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['savingsMonthlyAmount'],
      });
    }
    if (!data.savingsDepositCount) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['savingsDepositCount'],
      });
    }
  } else if (data.savingsRateType === 'VARYING') {
    if (!data.savingsDepositCount) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.common.required',
        path: ['savingsDepositCount'],
      });
    }
  }
};

export const loanFormSchema = z
  .object({
    // General Information
    loanNumber: optionalIntSchema,
    lenderId: z.string().min(1, { message: 'validation.common.required' }),
    signDate: createDateSchema(true),
    amount: createNumberSchemaRequired(0.01),
    interestRate: createNumberSchemaRequired(0),

    // Termination Information
    ...loanTerminationSchema.shape,

    // Savings Contract Information
    ...loanSavingsSchema.shape,

    // Additional Information
    altInterestMethod: interestMethodEnum.nullable().optional(),
    contractStatus: contractStatusEnum.default('PENDING'),
    additionalFields: additionalFieldValuesSchema.default({}).optional().nullable(),
  })
  .superRefine(validateTermination)
  .superRefine(validateSavings);

export type LoanFormData = z.infer<typeof loanFormSchema>;
// We keep two types intentionally:
// - LoanFormClientData models raw React Hook Form values (number inputs are locale-formatted strings while editing).
// - LoanFormData models parsed/validated values after Zod preprocessing (numbers/dates are converted for server usage).
export type LoanFormClientData = {
  loanNumber: '' | number | null;
  lenderId: string;
  signDate: Date | '' | null;
  amount: string;
  interestRate: string;
  terminationType: TerminationType;
  endDate: Date | '' | null;
  terminationPeriod: '' | number | null;
  terminationPeriodType: DurationType | null | undefined;
  duration: '' | number | null;
  durationType: DurationType | null | undefined;
  isSavingsContract: boolean;
  savingsRateType: SavingsRateType | null | undefined;
  savingsMonthlyAmount: string;
  savingsDepositCount: '' | number | null;
  savingsFirstDepositDate: Date | '' | null;
  savingsLastDepositDate: Date | '' | null;
  altInterestMethod: InterestMethod | null | undefined;
  contractStatus: ContractStatus;
  additionalFields: Record<string, unknown> | null | undefined;
};
export type LoanTerminationData = z.infer<typeof loanTerminationSchema>;
