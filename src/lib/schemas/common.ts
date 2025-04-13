import { isValidIban } from '@/lib/utils/iban';
import { z } from 'zod';

// Generic number schemas
export const createNumberSchema = (min?: number) => {
  const baseSchema = z
    .coerce.number()
    .refine((value) => value === null || !isNaN(Number(value)), {
      message: "Expected number, received string",
    })
    .nullable();

  if (min !== undefined) {
    return baseSchema.refine((value) => value === null || value >= min, {
      message: `Value must be greater than or equal to ${min}`,
    });
  }

  return baseSchema;
};

export const requiredNumberSchema = createNumberSchema().refine((value) => value !== null, {
  message: "Number is required",
});
export const optionalNumberSchema = createNumberSchema().optional();

// Generic date schemas
export const createDateSchema = (required = true) => {
  const baseSchema = z.coerce.date({
    invalid_type_error: "Expected date, received invalid date",
  }).nullable();

  if (required) {
    return baseSchema.refine((value) => value !== null, {
      message: "Date is required",
    });
  }

  return baseSchema.optional();
};

export const requiredDateSchema = createDateSchema(true);
export const optionalDateSchema = createDateSchema(false);

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

// View type enum
export const viewTypeEnum = z.enum(['LENDER', 'LOAN']) 