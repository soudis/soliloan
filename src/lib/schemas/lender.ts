import { z } from 'zod'
import {
  addressSchema,
  bankingSchema,
  contactSchema,
  membershipStatusEnum,
  notificationTypeEnum,
  salutationEnum
} from './common'

// Define the lender form schema based on the Prisma model
export const lenderFormSchema = z.discriminatedUnion('type', [
  z.object({
    // General Information
    type: z.literal('PERSON'),
    salutation: salutationEnum,
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    organisationName: z.string().nullable().optional(),
    titlePrefix: z.string().nullable().optional(),
    titleSuffix: z.string().nullable().optional(),

    // Contact Information
    ...contactSchema.shape,
    ...addressSchema.shape,

    // Banking Information
    ...bankingSchema.shape,

    // Additional Information
    notificationType: notificationTypeEnum,
    membershipStatus: membershipStatusEnum.nullable().optional(),
    tag: z.string().nullable().optional(),

    // Project ID (required for API)
    projectId: z.string(),
  }),
  z.object({
    // General Information
    type: z.literal('ORGANISATION'),
    salutation: salutationEnum,
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    organisationName: z.string().min(1, { message: 'Organisation name is required' }),
    titlePrefix: z.string().nullable().optional(),
    titleSuffix: z.string().nullable().optional(),

    // Contact Information
    ...contactSchema.shape,
    ...addressSchema.shape,

    // Banking Information
    ...bankingSchema.shape,

    // Additional Information
    notificationType: notificationTypeEnum,
    membershipStatus: membershipStatusEnum.nullable().optional(),
    tag: z.string().nullable().optional(),

    // Project ID (required for API)
    projectId: z.string(),
  })
])

export type LenderFormData = z.infer<typeof lenderFormSchema> 