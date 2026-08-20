'use client';

import { createUsePuck } from '@puckeditor/core';
import type { TemplateConfig } from '@/lib/templates/puck-config';

export const useTemplatePuck = createUsePuck<TemplateConfig>();
