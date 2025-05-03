import { LenderType } from '@prisma/client';
import { z } from 'zod';
import {
  addressSchema,
  bankingSchema,
  contactSchema,
  membershipStatusEnumRequired,
  notificationTypeEnumRequired,
  salutationEnumRequired,
  selectEnumRequired
} from './common';

// Define the lender form schema based on the Prisma model
export const lenderFormSchema = z.object({
  // General Information
  type: selectEnumRequired(LenderType),
  salutation: salutationEnumRequired,
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  organisationName: z.string().nullable().optional(),
  titlePrefix: z.string().nullable().optional(),
  titleSuffix: z.string().nullable().optional(),

  // Contact Information
  ...contactSchema.shape,
  ...addressSchema.shape,

  // Banking Information
  ...bankingSchema.shape,

  // Additional Information
  notificationType: notificationTypeEnumRequired,
  membershipStatus: membershipStatusEnumRequired,
  tag: z.string().nullable().optional(),

  // Project ID (required for API)
  projectId: z.string(),
}).superRefine((data, ctx) => {
  if (data.type === 'PERSON') {
    if (!data.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['firstName']
      });
    }
    if (!data.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['lastName']
      });
    }
  } else if (data.type === 'ORGANISATION') {
    if (!data.organisationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.common.required',
        path: ['organisationName']
      });
    }
  }
})


export type LenderFormData = z.infer<typeof lenderFormSchema> 