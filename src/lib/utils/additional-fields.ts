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
import { formatCurrency, formatDate, formatNumber, formatPercentage, NumberParser } from '../utils';

export const additionalFieldDefaults = (config: AdditionalFieldConfig[], values: AdditionalFieldValues) => {
  const defaults: AdditionalFieldValues = {};
  for (const field of config) {
    defaults[field.id] = values?.[field.id] ?? field.defaultValue ?? '';
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
  return config && config.length > 0 && config.some((field) => values?.[field.id] && values?.[field.id] !== '');
};

export const formatAdditionalFieldValue = (
  value: string | null | undefined,
  config: AdditionalFieldConfig,
  locale: string,
) => {
  if (!value) {
    return '';
  }
  if (config.type === AdditionalFieldType.DATE) {
    return formatDate(value, locale);
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
