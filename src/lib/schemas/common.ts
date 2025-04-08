import { isValidIban } from '@/lib/utils/iban'
import { z } from 'zod'

// Country enum used across multiple schemas
export const countryEnum = z.enum([
  'DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU', 'IE', 'PT', 'GR'
])

// Common address fields
export const addressSchema = z.object({
  street: z.string().nullable().optional(),
  addon: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  country: countryEnum.nullable().optional(),
})

// Common contact fields
export const contactSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).nullable().optional(),
  telNo: z.string().nullable().optional(),
})

// Banking information
export const bankingSchema = z.object({
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
})

// Interest method enum
export const interestMethodEnum = z.enum([
  'ACT_365_NOCOMPOUND',
  'E30_360_NOCOMPOUND',
  'ACT_360_NOCOMPOUND',
  'ACT_ACT_NOCOMPOUND',
  'ACT_365_COMPOUND',
  'E30_360_COMPOUND',
  'ACT_360_COMPOUND',
  'ACT_ACT_COMPOUND'
])

// Notification type enum
export const notificationTypeEnum = z.enum(['ONLINE', 'EMAIL', 'MAIL'])

// Membership status enum
export const membershipStatusEnum = z.enum(['UNKNOWN', 'MEMBER', 'EXTERNAL'])

// Salutation enum
export const salutationEnum = z.enum(['PERSONAL', 'FORMAL'])

// Period type enum
export const periodTypeEnum = z.enum(['MONTHS', 'YEARS'])

// Interest payment type enum
export const interestPaymentTypeEnum = z.enum(['YEARLY', 'END'])

// Interest payout type enum
export const interestPayoutTypeEnum = z.enum(['MONEY', 'COUPON'])

// Contract status enum
export const contractStatusEnum = z.enum(['PENDING', 'COMPLETED']) 