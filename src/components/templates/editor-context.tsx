'use client';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { createContext, useContext } from 'react';

export interface EditorMetadata {
  dataset: TemplateDataset;
  /** Current template being edited — used for predefined block availability (EMAIL vs DOCUMENT). */
  templateType: TemplateType;
  projectId: string | null;
  isAdmin: boolean;
  isGlobalTemplate: boolean;
}

const EditorMetadataContext = createContext<EditorMetadata>({
  dataset: 'LENDER',
  templateType: 'EMAIL',
  projectId: null,
  isAdmin: false,
  isGlobalTemplate: false,
});

export const EditorMetadataProvider = EditorMetadataContext.Provider;

export const useEditorMetadata = () => useContext(EditorMetadataContext);
