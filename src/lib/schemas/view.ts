import { z } from 'zod';

import { viewTypeEnum } from './common';

export const viewFormSchema = z.object({
  name: z.string().min(1, { message: 'validation.common.required' }),
  type: viewTypeEnum,
  data: z.record(z.string(), z.any()),
  isDefault: z.boolean().default(false),
  showInSidebar: z.boolean().default(false),
});

export type ViewFormData = z.infer<typeof viewFormSchema>;

/** Partial updates: no `.default()` on booleans — otherwise Zod injects false for omitted keys and wipes DB flags. */
export const viewFormUpdateSchema = z.object({
  name: z.string().min(1, { message: 'validation.common.required' }).optional(),
  type: viewTypeEnum.optional(),
  data: z.record(z.string(), z.any()).optional(),
  isDefault: z.boolean().optional(),
  showInSidebar: z.boolean().optional(),
});
