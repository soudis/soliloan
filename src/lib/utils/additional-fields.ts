import type { z } from 'zod';
import {
  type AdditionalFieldConfig,
  AdditionalFieldType,
  type AdditionalFieldValues,
  AdditionalNumberFormat,
  additionalFieldConfigArraySchema,
  additionalFieldValuesSchema,
  createDateSchema,
  createNumberSchema,
} from '../schemas/common';
import { formatCurrency, formatDateLong, formatNumber, formatPercentage, NumberParser } from '../utils';

export function isAdditionalBooleanTrue(value: unknown): boolean {
  return value === true || value === 'true';
}

export function normalizeAdditionalBooleanValue(value: unknown, fallback?: unknown): 'true' | 'false' {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  if (fallback === true || fallback === 'true') return 'true';
  return 'false';
}

export const additionalFieldDefaults = (config: AdditionalFieldConfig[], values: AdditionalFieldValues) => {
  const defaults: AdditionalFieldValues = {};
  for (const field of config) {
    if (field.type === AdditionalFieldType.BOOLEAN) {
      defaults[field.id] = normalizeAdditionalBooleanValue(values?.[field.id], field.defaultValue);
    } else {
      defaults[field.id] = values?.[field.id] ?? field.defaultValue ?? '';
    }
  }
  return defaults;
};

export const parseAdditionalFieldConfig = (data: unknown) => {
  return additionalFieldConfigArraySchema.parse(data);
};

export const parseAdditionalFields = <T extends { additionalFields?: unknown }>(data: T) => {
  return {
    ...data,
    additionalFields: additionalFieldValuesSchema.parse(data.additionalFields),
  };
};

export const validateAdditionalFields =
  (name: string, config?: AdditionalFieldConfig[]) => (data: unknown, ctx: z.RefinementCtx) => {
    if (!config) return;
    if (!data || typeof data !== 'object' || !(name in data)) return;
    const fieldValues = (data as Record<string, AdditionalFieldValues | undefined>)[name];
    if (fieldValues === null || fieldValues === undefined) return;
    if (typeof fieldValues !== 'object' || Array.isArray(fieldValues)) return;
    for (const field of config) {
      if (field.type === AdditionalFieldType.BOOLEAN) {
        continue;
      }
      if (field.type === AdditionalFieldType.SELECT) {
        if (
          fieldValues[field.id] &&
          !field.selectOptions.includes(fieldValues[field.id] ?? '') &&
          (field.required || fieldValues[field.id] !== '')
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'validation.common.required',
            path: [name, field.id],
          });
        }
      }
      if (field.type === AdditionalFieldType.DATE) {
        if (
          fieldValues[field.id] &&
          !createDateSchema(field.required).safeParse(fieldValues[field.id]).success &&
          (field.required || fieldValues[field.id] !== '')
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'validation.common.date',
            path: [name, field.id],
          });
        }
      }
      if (field.type === AdditionalFieldType.NUMBER) {
        if (
          fieldValues[field.id] &&
          !createNumberSchema().safeParse(fieldValues[field.id]).success &&
          (field.required || fieldValues[field.id] !== '')
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'validation.common.required',
            path: [name, field.id],
          });
        }
      }
      if (field.required && (!fieldValues[field.id] || fieldValues[field.id] === '')) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.common.required',
          path: [name, field.id],
        });
      }
    }
  };

export const hasAdditionalFields = (values: AdditionalFieldValues, config?: AdditionalFieldConfig[]) => {
  return (
    !!config &&
    config.length > 0 &&
    config.some((field) => {
      if (field.type === AdditionalFieldType.BOOLEAN) return true;
      return Boolean(values?.[field.id] && values[field.id] !== '');
    })
  );
};

export const formatAdditionalFieldValue = (
  value: string | null | undefined,
  config: AdditionalFieldConfig,
  locale: string,
  booleanLabels?: { yes: string; no: string },
) => {
  if (config.type === AdditionalFieldType.BOOLEAN) {
    return isAdditionalBooleanTrue(value) ? (booleanLabels?.yes ?? 'true') : (booleanLabels?.no ?? 'false');
  }
  if (!value) {
    return '';
  }
  if (config.type === AdditionalFieldType.DATE) {
    return formatDateLong(value, locale);
  }
  if (config.type === AdditionalFieldType.NUMBER) {
    const parser = new NumberParser(locale);
    if (config.numberFormat === AdditionalNumberFormat.INTEGER) {
      return formatNumber(parser.parse(value), 0, 0, locale);
    }
    if (config.numberFormat === AdditionalNumberFormat.MONEY) {
      return formatCurrency(parser.parse(value), locale);
    }
    if (config.numberFormat === AdditionalNumberFormat.PERCENT) {
      return formatPercentage(parser.parse(value), locale);
    }
  }
  return value;
};
