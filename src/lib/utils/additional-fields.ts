import { z } from 'zod';
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
    defaults[field.name] = values?.[field.name] ?? field.defaultValue ?? '';
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
  (name: string, config?: AdditionalFieldConfig[]) =>
  (
    data: {
      [name]?: AdditionalFieldValues;
    },
    ctx: z.RefinementCtx,
  ) => {
    if (config) {
      for (const field of config) {
        if (field.type === AdditionalFieldType.SELECT) {
          if (
            data[name]?.[field.name] &&
            !field.selectOptions.includes(data[name]?.[field.name] ?? '') &&
            (field.required || data[name]?.[field.name] !== '')
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.common.required',
              path: [name, field.name],
            });
          }
        }
        if (field.type === AdditionalFieldType.DATE) {
          if (
            data[name]?.[field.name] &&
            !createDateSchema(field.required).safeParse(data[name]?.[field.name]).success &&
            (field.required || data[name]?.[field.name] !== '')
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.common.date',
              path: [name, field.name],
            });
          }
        }
        if (field.type === AdditionalFieldType.NUMBER) {
          if (
            data[name]?.[field.name] &&
            !createNumberSchema().safeParse(data[name]?.[field.name]).success &&
            (field.required || data[name]?.[field.name] !== '')
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.common.required',
              path: [name, field.name],
            });
          }
        }
        if (field.required && (!data[name]?.[field.name] || data[name]?.[field.name] === '')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'validation.common.required',
            path: [name, field.name],
          });
        }
      }
    }
  };

export const hasAdditionalFields = (values: AdditionalFieldValues, config?: AdditionalFieldConfig[]) => {
  return config && config.length > 0 && config.some((field) => values?.[field.name] && values?.[field.name] !== '');
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
