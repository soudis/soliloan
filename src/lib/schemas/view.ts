import { z } from 'zod'
import { viewTypeEnum } from './common'

export const viewFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  type: viewTypeEnum,
  data: z.record(z.any()),
  isDefault: z.boolean().default(false),
})

export type ViewFormData = z.infer<typeof viewFormSchema> 