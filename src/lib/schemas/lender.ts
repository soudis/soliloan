import { isValidIban } from '@/lib/utils/iban'
import { z } from 'zod'

// Define the lender form schema based on the Prisma model
export const lenderFormSchema = z.discriminatedUnion('type', [
  z.object({
    // General Information
    type: z.literal('PERSON'),
    salutation: z.enum(['PERSONAL', 'FORMAL']),
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    organisationName: z.string().nullable().optional(),
    titlePrefix: z.string().nullable().optional(),
    titleSuffix: z.string().nullable().optional(),

    // Contact Information
    email: z.string().email({ message: 'Invalid email address' }).nullable().optional(),
    telNo: z.string().nullable().optional(),
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
    bic: z.string().nullable().optional(),

    // Additional Information
    notificationType: z.enum(['ONLINE', 'EMAIL', 'MAIL']),
    membershipStatus: z.enum(['UNKNOWN', 'MEMBER', 'EXTERNAL']).nullable().optional(),
    tag: z.string().nullable().optional(),

    // Project ID (required for API)
    projectId: z.string(),
  }),
  z.object({
    // General Information
    type: z.literal('ORGANISATION'),
    salutation: z.enum(['PERSONAL', 'FORMAL']),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    organisationName: z.string().min(1, { message: 'Organisation name is required' }),
    titlePrefix: z.string().nullable().optional(),
    titleSuffix: z.string().nullable().optional(),

    // Contact Information
    email: z.string().email({ message: 'Invalid email address' }).nullable().optional(),
    telNo: z.string().nullable().optional(),
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
    bic: z.string().nullable().optional(),

    // Additional Information
    notificationType: z.enum(['ONLINE', 'EMAIL', 'MAIL']),
    membershipStatus: z.enum(['UNKNOWN', 'MEMBER', 'EXTERNAL']).nullable().optional(),
    tag: z.string().nullable().optional(),

    // Project ID (required for API)
    projectId: z.string(),
  })
])

export type LenderFormData = z.infer<typeof lenderFormSchema> 