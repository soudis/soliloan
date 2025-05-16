import { z } from 'zod';
import {
  type AdditionalFieldConfig,
  AdditionalFieldType,
  type AdditionalFieldValues,
  additionalFieldValuesSchema,
  createDateSchema,
  createNumberSchema,
} from '../schemas/common';

export const additionalFieldDefaults = (config: AdditionalFieldConfig[], values: AdditionalFieldValues) => {
  const defaults: AdditionalFieldValues = {};
  for (const field of config) {
    defaults[field.name] = values?.[field.name] ?? '';
  }
  return defaults;
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
          if (data[name]?.[field.name] && !field.selectOptions.includes(data[name]?.[field.name] ?? '')) {
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
            !createDateSchema(field.required).safeParse(data[name]?.[field.name]).success
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.common.date',
              path: [name, field.name],
            });
          }
        }
        if (field.type === AdditionalFieldType.NUMBER) {
          if (data[name]?.[field.name] && !createNumberSchema().safeParse(data[name]?.[field.name]).success) {
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
