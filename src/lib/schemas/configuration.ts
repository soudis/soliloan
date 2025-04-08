import { isValidIban } from '@/lib/utils/iban'
import { z } from 'zod'

// Define the configuration form schema based on the Prisma model
export const configurationFormSchema = z.object({
  // General Information
  name: z.string().min(1, { message: 'Name is required' }),
  logo: z.string().nullable().optional(),

  // Contact Information
  email: z.string().email({ message: 'Invalid email address' }).nullable().optional(),
  telNo: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  addon: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  country: z.enum(['DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU', 'IE', 'PT', 'GR']).nullable().optional(),

  // Banking Information
  iban: z.string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidIban(val), {
      message: 'Invalid IBAN number'
    }),
  bic: z.string()
    .nullable()
    .optional()
    .refine((val) => !val || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(val), {
      message: 'Invalid BIC/SWIFT code'
    }),

  // User Defaults
  userLanguage: z.enum(['de', 'en']).nullable().optional(),
  userTheme: z.enum(['default', 'dark', 'light']).nullable().optional(),

  // Lender Defaults
  lenderSalutation: z.enum(['PERSONAL', 'FORMAL']).nullable().optional(),
  lenderCountry: z.enum(['DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU', 'IE', 'PT', 'GR']).nullable().optional(),
  lenderNotificationType: z.enum(['ONLINE', 'EMAIL', 'MAIL']).nullable().optional(),
  lenderMembershipStatus: z.enum(['UNKNOWN', 'MEMBER', 'EXTERNAL']).nullable().optional(),
  lenderTags: z.array(z.string()).default([]),

  // Loan Defaults
  interestMethod: z.enum([
    'ACT_365_NOCOMPOUND',
    'E30_360_NOCOMPOUND',
    'ACT_360_NOCOMPOUND',
    'ACT_ACT_NOCOMPOUND',
    'ACT_365_COMPOUND',
    'E30_360_COMPOUND',
    'ACT_360_COMPOUND',
    'ACT_ACT_COMPOUND'
  ]).nullable().optional(),
  altInterestMethods: z.array(z.enum([
    'ACT_365_NOCOMPOUND',
    'E30_360_NOCOMPOUND',
    'ACT_360_NOCOMPOUND',
    'ACT_ACT_NOCOMPOUND',
    'ACT_365_COMPOUND',
    'E30_360_COMPOUND',
    'ACT_360_COMPOUND',
    'ACT_ACT_COMPOUND'
  ])).default([]),
  customLoans: z.boolean().default(false),
})

export type ConfigurationFormData = z.infer<typeof configurationFormSchema> 