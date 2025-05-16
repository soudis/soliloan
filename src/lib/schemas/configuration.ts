import { InterestMethod, Language, LenderRequiredField, SoliLoansTheme } from '@prisma/client';
import { z } from 'zod';

import {
  additionalFieldConfigSchema,
  addressSchema,
  bankingSchema,
  contactSchema,
  countryEnum,
  interestMethodEnum,
  membershipStatusEnumOptional,
  notificationTypeEnumOptional,
  salutationEnumOptional,
  selectEnumRequired,
  validateAddressOptional,
} from './common';

// Define the configuration form schema based on the Prisma model
export const configurationFormSchema = z
  .object({
    // General Information
    name: z.string().min(1, { message: 'validation.common.required' }),
    logo: z.string().nullable().optional(),

    // Contact Information
    ...contactSchema.shape,
    website: z.string().nullable().optional(),
    ...addressSchema.shape,

    // Banking Information
    ...bankingSchema.shape,

    // User Defaults
    userLanguage: selectEnumRequired(Language).nullable().optional(),
    userTheme: selectEnumRequired(SoliLoansTheme).nullable().optional(),

    // Lender Defaults
    lenderRequiredFields: z.array(z.nativeEnum(LenderRequiredField)).default([]).optional(),
    lenderSalutation: salutationEnumOptional.nullable().optional(),
    lenderCountry: countryEnum.nullable().optional(),
    lenderNotificationType: notificationTypeEnumOptional.nullable().optional(),
    lenderMembershipStatus: membershipStatusEnumOptional.nullable().optional(),
    lenderTags: z.array(z.string()).default([]).optional(),

    // Loan Defaults
    interestMethod: interestMethodEnum,
    altInterestMethods: z.array(z.nativeEnum(InterestMethod)).default([]).optional(),
    customLoans: z.coerce.boolean().default(false).optional(),
    loanAdditionalFields: z.array(additionalFieldConfigSchema).default([]).optional(),
    lenderAdditionalFields: z.array(additionalFieldConfigSchema).default([]).optional(),
  })
  .superRefine(validateAddressOptional);

export type ConfigurationFormData = z.infer<typeof configurationFormSchema>;
