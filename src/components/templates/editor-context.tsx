'use client';

import type { TemplateDataset } from '@prisma/client';
import { createContext, useContext } from 'react';

export interface EditorMetadata {
  dataset: TemplateDataset;
  projectId: string | null;
  isAdmin: boolean;
  isGlobalTemplate: boolean;
}

const EditorMetadataContext = createContext<EditorMetadata>({
  dataset: 'LENDER',
  projectId: null,
  isAdmin: false,
  isGlobalTemplate: false,
});

export const EditorMetadataProvider = EditorMetadataContext.Provider;

export const useEditorMetadata = () => useContext(EditorMetadataContext);
