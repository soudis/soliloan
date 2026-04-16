import { LimitationType } from '@prisma/client';
import { z } from 'zod';
import { createNumberSchemaRequired } from './common';

// DEInvestmentActCompliance constants (VermAnlG)
export const MAX_UNITS = 20;
export const MAX_TOTAL_AMOUNT_EUR = 100_000;
export const PERIOD_MONTHS = 12;

export function normalizeLoanInterestRate(value: number): number {
  return Number(Number(value).toFixed(3));
}

export const investmentTypeFormSchema = z.object({
  interestRate: createNumberSchemaRequired(0),
  limitationType: z.nativeEnum(LimitationType),
  name: z.string().nullable().optional(),
});

export type InvestmentTypeFormData = z.infer<typeof investmentTypeFormSchema>;
