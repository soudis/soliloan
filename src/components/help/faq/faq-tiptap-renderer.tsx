'use client';

import type { JSONContent } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';

import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { cn } from '@/lib/utils';

import './faq-tiptap.css';
import { useFaqTiptapEditor } from './use-faq-tiptap-editor';

type FaqTiptapRendererProps = {
  content: JSONContent | null | undefined;
  className?: string;
  headings?: boolean;
};

export function FaqTiptapRenderer({ content, className, headings = true }: FaqTiptapRendererProps) {
  const editor = useFaqTiptapEditor({
    content: content ?? EMPTY_FAQ_DOC,
    editable: false,
    openOnClick: true,
    headings,
    editorClassName: 'faq-tiptap-renderer outline-none',
  });

  if (!editor) {
    return <div className={cn('min-h-[8rem]', className)} />;
  }

  return (
    <div className={cn('faq-tiptap-renderer', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
