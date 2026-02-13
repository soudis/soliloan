import { InterestMethod, Language, LenderRequiredField, SoliLoansTheme } from '@prisma/client';
import { z } from 'zod';
import {
  additionalFieldConfigSchema,
  addressSchema,
  bankingSchema,
  contactSchema,
  countryEnum,
  interestMethodEnumRequired,
  optionalNumberSchema,
  salutationEnumOptional,
  selectEnumRequired,
  validateAddressOptional,
} from './common';
import { loanTerminationSchema, validateTermination } from './loan';

const configurationFormGeneralShape = z.object({
  // General Information
  name: z.string().min(1, { message: 'validation.common.required' }),
  logo: z.string().nullable().optional(),

  // Contact Information
  ...contactSchema.shape,
  website: z.string().nullable().optional(),
  ...addressSchema.shape,

  // Banking Information
  ...bankingSchema.shape,
});

export const loanTemplateFormSchema = z
  .object({
    id: z.string().nullable().optional(),
    name: z.string().min(1, { message: 'validation.common.required' }),
    isDefault: z.coerce.boolean().default(false),
    // Termination Information
    ...loanTerminationSchema.shape,
    minInterestRate: optionalNumberSchema,
    maxInterestRate: optionalNumberSchema,
    minAmount: optionalNumberSchema,
    maxAmount: optionalNumberSchema,
    configurationId: z.string().min(1, { message: 'validation.common.required' }),
  })
  .superRefine(validateTermination);

export const configurationFormGeneralSchema = configurationFormGeneralShape.superRefine(validateAddressOptional);

export const configurationFormLenderSchema = z.object({
  userLanguage: selectEnumRequired(Language).nullable().optional(),
  userTheme: selectEnumRequired(SoliLoansTheme).nullable().optional(),
  lenderRequiredFields: z.array(z.enum(LenderRequiredField)).default([]).optional(),
  lenderSalutation: salutationEnumOptional.nullable().optional(),
  lenderCountry: countryEnum.nullable().optional(),
  lenderAdditionalFields: z.array(additionalFieldConfigSchema).default([]).optional(),
});

export const configurationFormLoanSchema = z.object({
  interestMethod: interestMethodEnumRequired,
  altInterestMethods: z.array(z.enum(InterestMethod)).default([]).optional(),
  loanAdditionalFields: z.array(additionalFieldConfigSchema).default([]).optional(),
});

export const configurationFormSchema = z.union([
  configurationFormGeneralSchema,
  configurationFormLoanSchema,
  configurationFormLenderSchema,
]);

export type ConfigurationFormGeneralData = z.infer<typeof configurationFormGeneralSchema>;
export type ConfigurationFormLenderData = z.infer<typeof configurationFormLenderSchema>;
export type ConfigurationFormLoanData = z.infer<typeof configurationFormLoanSchema>;
export type LoanTemplateFormData = z.infer<typeof loanTemplateFormSchema>;

export type ConfigurationFormData = z.infer<typeof configurationFormSchema>;
