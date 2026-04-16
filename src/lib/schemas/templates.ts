// Template validation schemas

import { TemplateDataset, TemplateType } from '@prisma/client';
import { z } from 'zod';

// Base template schema
export const templateBaseSchema = z.object({
  name: z.string().min(1, 'error.template.nameRequired').max(100),
  description: z.string().max(500).nullable().optional(),
  /** EMAIL: subject template; DOCUMENT: filename template (merge tags allowed). */
  subjectOrFilename: z.string().max(500).nullable().optional(),
  type: z.enum(TemplateType),
  dataset: z.enum(TemplateDataset),
});

// Create template schema
export const createTemplateSchema = templateBaseSchema.extend({
  projectId: z.string().optional(),
  isGlobal: z.boolean().nullable().optional(),
  designJson: z.record(z.string(), z.any()).nullable().optional(),
  sourceTemplateId: z.string().optional(),
});

export type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

// Update template schema
export const updateTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  subjectOrFilename: z.string().max(500).nullable().optional(),
  designJson: z.record(z.string(), z.any()).optional(),
  htmlContent: z.string().nullable().optional(),
});

export type UpdateTemplateFormData = z.infer<typeof updateTemplateSchema>;

// Delete template schema
export const deleteTemplateSchema = z.object({
  templateId: z.string(),
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
  type: z.enum(TemplateType).optional(),
  dataset: z.enum(TemplateDataset).optional(),
  isGlobal: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  includeGlobal: z.boolean().optional().default(false),
});

export type GetTemplatesFormData = z.infer<typeof getTemplatesSchema>;

// --- Predefined Craft Blocks ---

export const createPredefinedBlockSchema = z.object({
  name: z.string().min(1, 'error.predefinedBlock.nameRequired').max(100),
  description: z.string().max(500).nullable().optional(),
  designJson: z.record(z.string(), z.any()),
  datasets: z.array(z.enum(TemplateDataset)).min(1, 'error.predefinedBlock.datasetsRequired'),
  templateTypes: z.array(z.enum(TemplateType)).min(1, 'error.predefinedBlock.templateTypesRequired'),
  visibility: z.enum(['PROJECT_MANAGERS', 'ADMIN_ONLY']).default('PROJECT_MANAGERS'),
  projectId: z.string().nullable().optional(),
});

export type CreatePredefinedBlockFormData = z.infer<typeof createPredefinedBlockSchema>;

export const listPredefinedBlocksSchema = z.object({
  dataset: z.enum(TemplateDataset),
  templateType: z.enum(TemplateType),
  projectId: z.string().nullable().optional(),
});

export type ListPredefinedBlocksFormData = z.infer<typeof listPredefinedBlocksSchema>;

export const deletePredefinedBlockSchema = z.object({
  id: z.string(),
});

export type DeletePredefinedBlockFormData = z.infer<typeof deletePredefinedBlockSchema>;
