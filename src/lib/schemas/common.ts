import { isValidIban } from '@/lib/utils/iban';
import { ContractStatus, Country, DurationType, InterestMethod, InterestPaymentType, InterestPayoutType, MembershipStatus, NotificationType, Salutation, ViewType } from '@prisma/client';
import { z } from 'zod';
import { validationError } from '../utils/validation';

// Generic number schemas
export const createNumberSchema = (min?: number) => {
  const baseSchema = z.union([
    z.coerce.number().refine((value) => !isNaN(Number(value)), {
      message: "validation.common.number",
    }),
    z.literal("")
  ]);

  if (min !== undefined) {
    return baseSchema.refine((value) => value === "" || value >= min, {
      message: validationError('validation.common.numberMin', { min }),
    });
  }

  return baseSchema;
};


export const selectEnumRequired = <T extends Record<string, string>>(
  enumObj: T,
  errorMessage = "validation.common.required"
) => {
  return z
    .union([z.nativeEnum(enumObj), z.literal("")])
    .refine((val) => val !== "", {
      message: errorMessage,
    });
}

export const selectEnumOptional = <T extends Record<string, string>>(
  enumObj: T,
) => {
  return z.union([z.nativeEnum(enumObj), z.literal("")])
}


export const requiredNumberSchema = createNumberSchema().refine((value) => value !== null, {
  message: "validation.common.required",
});
export const optionalNumberSchema = createNumberSchema().optional();

// Generic date schemas
export const createDateSchema = (required = true) => {
  const baseSchema = z.union([
    z.coerce.date({
      message: "validation.common.date",
    }),
    z.literal("")
  ]);

  if (required) {
    return baseSchema.refine((value) => value !== "", {
      message: "validation.common.required",
    });
  }

  return baseSchema;
};

export const requiredDateSchema = createDateSchema(true);
export const optionalDateSchema = createDateSchema(false);

// Country enum used across multiple schemas
export const countryEnum = selectEnumOptional(Country)

export const validateAddressOptional = (data: {
  street?: string | null;
  addon?: string | null;
  zip?: string | null;
  place?: string | null;
  country?: Country | null | '';
}, ctx: z.RefinementCtx) => {
  const hasAnyField = data.street && data.street !== '' || data.zip && data.zip !== '' || data.place && data.place !== '' || data.addon && data.addon !== '';
  if (hasAnyField && (!data.street || data.street === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.addressComplete",
      path: ["street"]
    });
  }
  if (hasAnyField && (!data.zip || data.zip === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.addressComplete",
      path: ["zip"]
    });
  }
  if (hasAnyField && (!data.place || data.place === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.addressComplete",
      path: ["place"]
    });
  }
  if (hasAnyField && (!data.country || data.country === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.addressComplete",
      path: ["country"]
    });
  }
};

export const validateAddressRequired = (data: {
  street?: string | null;
  addon?: string | null;
  zip?: string | null;
  place?: string | null;
  country?: Country | null | '';
}, ctx: z.RefinementCtx) => {
  if ((!data.street || data.street === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.required",
      path: ["street"]
    });
  }
  if ((!data.zip || data.zip === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.required",
      path: ["zip"]
    });
  }
  if ((!data.place || data.place === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.required",
      path: ["place"]
    });
  }
  if ((!data.country || data.country === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.required",
      path: ["country"]
    });
  }
}

export const validateFieldRequired = (field: string) => (data: {
  [key: string]: string | null;
}, ctx: z.RefinementCtx) => {
  if ((!data[field] || data[field] === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validation.common.required",
      path: [field]
    });
  }
}



export const addressSchema = z.object({
  street: z.string().nullable().optional(),
  addon: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  country: countryEnum.nullable().optional(),
})

export const emailSchemaOptional = z.string().email({ message: 'validation.common.email' }).or(z.literal('')).nullable().optional()
export const emailSchemaRequired = z.string().email({ message: 'validation.common.email' })
// Common contact fields
export const contactSchema = z.object({
  email: emailSchemaOptional,
  telNo: z.string().nullable().optional(),
})

// Banking information
export const bankingSchema = z.object({
  iban: z.string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidIban(val), {
      message: 'validation.common.iban'
    }),
  bic: z.string()
    .nullable()
    .optional()
    .refine((val) => !val || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(val), {
      message: 'validation.common.bic'
    }),
})

// Interest method enum
export const interestMethodEnum = selectEnumOptional(InterestMethod)

// Notification type enum
export const notificationTypeEnumRequired = selectEnumRequired(NotificationType)
export const notificationTypeEnumOptional = selectEnumOptional(NotificationType)

// Membership status enum
export const membershipStatusEnumRequired = selectEnumRequired(MembershipStatus)
export const membershipStatusEnumOptional = selectEnumOptional(MembershipStatus)

// Salutation enum
export const salutationEnumRequired = selectEnumRequired(Salutation)
export const salutationEnumOptional = selectEnumOptional(Salutation)
// Period type enum (TerminationPeriodType) 
export const periodTypeEnum = selectEnumOptional(DurationType)

// Interest payment type enum
export const interestPaymentTypeEnum = selectEnumRequired(InterestPaymentType)

// Interest payout type enum
export const interestPayoutTypeEnum = selectEnumRequired(InterestPayoutType)

// Contract status enum
export const contractStatusEnum = selectEnumRequired(ContractStatus)

// View type enum
export const viewTypeEnum = selectEnumRequired(ViewType) 