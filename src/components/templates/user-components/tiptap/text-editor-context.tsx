'use client';

import type { Editor } from '@tiptap/react';
import { createContext, useContext } from 'react';

interface TextEditorContextValue {
  editor: Editor | null;
  lastSelection: React.MutableRefObject<{ from: number; to: number } | null>;
}

const TextEditorContext = createContext<TextEditorContextValue | null>(null);

export const TextEditorProvider = TextEditorContext.Provider;

export const useTextEditor = () => {
  const context = useContext(TextEditorContext);
  if (!context) {
    return { editor: null, lastSelection: { current: null } as React.RefObject<any> };
  }
  return context;
};
