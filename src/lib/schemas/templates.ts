// Template validation schemas

import { TemplateDataset, TemplateType } from '@prisma/client';
import { z } from 'zod';

// Base template schema
export const templateBaseSchema = z.object({
  name: z.string().min(1, 'error.template.nameRequired').max(100),
  description: z.string().max(500).nullable().optional(),
  type: z.nativeEnum(TemplateType),
  dataset: z.nativeEnum(TemplateDataset),
});

// Create template schema
export const createTemplateSchema = templateBaseSchema.extend({
  projectId: z.string().optional(), // If not provided, will be global (admin only)
  isGlobal: z.boolean().optional().default(false),
  designJson: z.record(z.any()).optional().default({}),
});

export type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

// Update template schema
export const updateTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  designJson: z.record(z.any()).optional(),
  htmlContent: z.string().nullable().optional(),
});

export type UpdateTemplateFormData = z.infer<typeof updateTemplateSchema>;

// Delete template schema
export const deleteTemplateSchema = z.object({
  id: z.string(),
});

export type DeleteTemplateFormData = z.infer<typeof deleteTemplateSchema>;

// Duplicate template schema
export const duplicateTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  projectId: z.string().optional(), // Target project, if not provided, will be global
});

export type DuplicateTemplateFormData = z.infer<typeof duplicateTemplateSchema>;

// Get template schema
export const getTemplateSchema = z.object({
  id: z.string(),
});

export type GetTemplateFormData = z.infer<typeof getTemplateSchema>;

// Get templates list schema
export const getTemplatesSchema = z.object({
  projectId: z.string().optional(),
  type: z.nativeEnum(TemplateType).optional(),
  dataset: z.nativeEnum(TemplateDataset).optional(),
  isGlobal: z.boolean().optional(),
  includeGlobal: z.boolean().optional().default(false), // Include global templates in project query
});

export type GetTemplatesFormData = z.infer<typeof getTemplatesSchema>;
