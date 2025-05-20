import { ContractStatus, Country, DurationType, InterestMethod, Salutation, ViewType } from '@prisma/client';
import { z } from 'zod';

import { isValidIban } from '@/lib/utils/iban';

import { NumberParser } from '../utils';
import { validationError } from '../utils/validation';

// Generic number schemas
export const createNumberSchema = (min?: number, errorMessage = 'validation.common.required') => {
  const parser = new NumberParser('de-DE');
  return min
    ? z.preprocess(
        (val) => (val === '' ? null : parser.parse(val as string)),
        z.coerce.number({ message: errorMessage }).min(min, validationError('validation.common.numberMin', { min })),
      )
    : z.preprocess(
        (val) => (val === '' ? null : parser.parse(val as string)),
        z.coerce.number({ message: errorMessage }),
      );
};

export const createNumberSchemaRequired = (min?: number, errorMessage = 'validation.common.required') => {
  const parser = new NumberParser('de-DE');
  return min
    ? z.preprocess(
        (val) => (val === '' ? null : parser.parse(val as string)),
        z
          .number({ message: errorMessage })
          .min(min, validationError('validation.common.numberMin', { min }))
          .refine((val) => val !== null, { message: errorMessage }),
      )
    : z.preprocess(
        (val) => (val === '' ? null : parser.parse(val as string)),
        z.number({ message: errorMessage }).refine((val) => val !== null, { message: errorMessage }),
      );
};

export const selectEnumRequired = <T extends Record<string, string>>(
  enumObj: T,
  errorMessage = 'validation.common.required',
) => {
  return z.preprocess(
    (val) => (val === '' || val === 'clear' ? null : val),
    z.nativeEnum(enumObj, { message: errorMessage }),
  );
};
export const selectEnumOptional = <T extends Record<string, string>>(enumObj: T) => {
  return z.preprocess(
    (val) => (val === '' || val === 'clear' ? null : val),
    z.nativeEnum(enumObj).optional().nullable(),
  );
};

export const requiredNumberSchema = createNumberSchema().refine((value) => value !== null, {
  message: 'validation.common.required',
});
export const optionalNumberSchema = createNumberSchema().optional().nullable();

// Generic date schemas
export const createDateSchema = (required = true) => {
  return required
    ? z.preprocess(
        (val) => (val === '' ? null : new Date(val as string | Date)),
        z.date({ message: 'validation.common.date' }),
      )
    : z.preprocess(
        (val) => (val === '' ? null : new Date(val as string | Date)),
        z.date({ message: 'validation.common.date' }).optional().nullable(),
      );
};

export const requiredDateSchema = createDateSchema(true);
export const optionalDateSchema = createDateSchema(false);

// Country enum used across multiple schemas
export const countryEnum = selectEnumOptional(Country);

export const validateAddressOptional = (
  data: {
    street?: string | null;
    addon?: string | null;
    zip?: string | null;
    place?: string | null;
    country?: Country | null | '';
  },
  ctx: z.RefinementCtx,
) => {
  const hasAnyField =
    (data.street && data.street !== '') ||
    (data.zip && data.zip !== '') ||
    (data.place && data.place !== '') ||
    (data.addon && data.addon !== '');
  if (hasAnyField && (!data.street || data.street === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.addressComplete',
      path: ['street'],
    });
  }
  if (hasAnyField && (!data.zip || data.zip === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.addressComplete',
      path: ['zip'],
    });
  }
  if (hasAnyField && (!data.place || data.place === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.addressComplete',
      path: ['place'],
    });
  }
  if (hasAnyField && (!data.country || data.country === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.addressComplete',
      path: ['country'],
    });
  }
};

export const validateAddressRequired = (
  data: {
    street?: string | null;
    addon?: string | null;
    zip?: string | null;
    place?: string | null;
    country?: Country | null | '';
  },
  ctx: z.RefinementCtx,
) => {
  if (!data.street || data.street === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.required',
      path: ['street'],
    });
  }
  if (!data.zip || data.zip === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.required',
      path: ['zip'],
    });
  }
  if (!data.place || data.place === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.required',
      path: ['place'],
    });
  }
  if (!data.country || data.country === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.common.required',
      path: ['country'],
    });
  }
};

export const validateFieldRequired =
  (field: string) =>
  (
    data: {
      [key: string]: string | null;
    },
    ctx: z.RefinementCtx,
  ) => {
    if (!data[field] || data[field] === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: [field],
      });
    }
  };

export const addressSchema = z.object({
  street: z.string().nullable().optional(),
  addon: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  country: countryEnum.nullable().optional(),
});

export const emailSchemaOptional = z
  .string()
  .email({ message: 'validation.common.email' })
  .or(z.literal(''))
  .nullable()
  .optional();
export const emailSchemaRequired = z.string().email({ message: 'validation.common.email' });
// Common contact fields
export const contactSchema = z.object({
  email: emailSchemaOptional,
  telNo: z.string().nullable().optional(),
});

// Banking information
export const bankingSchema = z.object({
  iban: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidIban(val), {
      message: 'validation.common.iban',
    }),
  bic: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(val), {
      message: 'validation.common.bic',
    }),
});

// Interest method enum
export const interestMethodEnum = selectEnumOptional(InterestMethod);

// Salutation enum
export const salutationEnumRequired = selectEnumRequired(Salutation);
export const salutationEnumOptional = selectEnumOptional(Salutation);
// Period type enum (TerminationPeriodType)
export const periodTypeEnum = selectEnumOptional(DurationType);

// Contract status enum
export const contractStatusEnum = selectEnumRequired(ContractStatus);

// View type enum
export const viewTypeEnum = selectEnumRequired(ViewType);

export enum AdditionalFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  BOOLEAN = 'boolean',
}
export enum AdditionalNumberFormat {
  INTEGER = 'integer',
  MONEY = 'money',
  PERCENT = 'percent',
}

export const additionalFieldTypeEnum = selectEnumRequired(AdditionalFieldType);
export const additionalNumberFormatEnum = selectEnumOptional(AdditionalNumberFormat);
export const additionalFieldConfigSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, { message: 'validation.common.required' }),
    type: additionalFieldTypeEnum,
    numberFormat: additionalNumberFormatEnum,
    selectOptions: z.array(z.string()),
    defaultValue: z.preprocess(
      (val) => (val?.toString() === 'clear' ? '' : val?.toString()),
      z.string().nullable().optional(),
    ),
    required: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === AdditionalFieldType.SELECT && (!data.selectOptions || data.selectOptions.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validation.common.required', path: ['selectOptions'] });
    }
    if (data.type === AdditionalFieldType.NUMBER && !data.numberFormat) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validation.common.required', path: ['numberFormat'] });
    }
    if (
      data.type === AdditionalFieldType.NUMBER &&
      data.defaultValue &&
      data.defaultValue !== '' &&
      !createNumberSchema().safeParse(data.defaultValue).success
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validation.common.number', path: ['defaultValue'] });
    }
    if (
      data.type === AdditionalFieldType.BOOLEAN &&
      data.defaultValue &&
      data.defaultValue !== '' &&
      data.defaultValue !== 'true' &&
      data.defaultValue !== 'false'
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validation.common.boolean', path: ['defaultValue'] });
    }
    if (
      data.type === AdditionalFieldType.SELECT &&
      data.defaultValue &&
      data.defaultValue !== '' &&
      !data.selectOptions.includes(data.defaultValue)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validation.common.required', path: ['defaultValue'] });
    }
  });

export const additionalFieldConfigArraySchema = z.array(additionalFieldConfigSchema).optional().nullable();

export type AdditionalFieldConfig = z.infer<typeof additionalFieldConfigSchema>;

export const additionalFieldValuesSchema = z
  .record(
    z.string(),
    z.preprocess((val) => (val?.toString() === 'clear' ? '' : val?.toString()), z.string().nullable().optional()),
  )
  .optional()
  .nullable();

export type AdditionalFieldValues = z.infer<typeof additionalFieldValuesSchema>;
