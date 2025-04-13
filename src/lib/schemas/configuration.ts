import { z } from 'zod'
import {
  addressSchema,
  bankingSchema,
  contactSchema,
  countryEnum,
  interestMethodEnum,
  membershipStatusEnum,
  notificationTypeEnum,
  salutationEnum
} from './common'

// Define the configuration form schema based on the Prisma model
export const configurationFormSchema = z.object({
  // General Information
  name: z.string().min(1, { message: 'Name is required' }),
  logo: z.string().nullable().optional(),

  // Contact Information
  ...contactSchema.shape,
  website: z.string().nullable().optional(),
  ...addressSchema.shape,

  // Banking Information
  ...bankingSchema.shape,

  // User Defaults
  userLanguage: z.enum(['de', 'en']).nullable().optional(),
  userTheme: z.enum(['default', 'dark', 'light']).nullable().optional(),

  // Lender Defaults
  lenderSalutation: salutationEnum.nullable().optional(),
  lenderCountry: countryEnum.nullable().optional(),
  lenderNotificationType: notificationTypeEnum.nullable().optional(),
  lenderMembershipStatus: membershipStatusEnum.nullable().optional(),
  lenderTags: z.array(z.string()).default([]),

  // Loan Defaults
  interestMethod: interestMethodEnum.nullable().optional(),
  altInterestMethods: z.array(interestMethodEnum).default([]),
  customLoans: z.coerce.boolean().default(false),
})

export type ConfigurationFormData = z.infer<typeof configurationFormSchema> 