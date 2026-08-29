'use client';

import type { JSONContent } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';

import { rewriteFaqMediaSrcs } from '@/lib/help/faq-body';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { getFaqTiptapExtensions } from '@/lib/help/faq-tiptap-extensions';

type UseFaqTiptapEditorOptions = {
  content: JSONContent;
  editable: boolean;
  openOnClick?: boolean;
  headings?: boolean;
  onUpdate?: (json: JSONContent) => void;
  editorClassName: string;
};

export function useFaqTiptapEditor({
  content,
  editable,
  openOnClick = false,
  headings = true,
  onUpdate,
  editorClassName,
}: UseFaqTiptapEditorOptions) {
  const extensions = useMemo(
    () => getFaqTiptapExtensions({ openOnClick, headings, autolink: editable }),
    [openOnClick, headings, editable],
  );
  const lastEmittedRef = useRef<string | null>(null);
  const contentJson = JSON.stringify(content ?? EMPTY_FAQ_DOC);

  const editor = useEditor(
    {
      extensions,
      content: content ?? EMPTY_FAQ_DOC,
      immediatelyRender: false,
      editable,
      editorProps: {
        attributes: {
          class: editorClassName,
        },
        handleClick: editable
          ? undefined
          : (_view, _pos, event) => {
              if (!(event.target instanceof Element)) return false;
              const link = event.target.closest('a');
              const href = link?.getAttribute('href');
              if (!link || !href) return false;
              event.preventDefault();
              window.open(href, link.getAttribute('target') || '_blank', 'noopener,noreferrer');
              return true;
            },
      },
      onUpdate: onUpdate
        ? ({ editor: ed }) => {
            const json = rewriteFaqMediaSrcs(ed.getJSON());
            lastEmittedRef.current = JSON.stringify(json);
            onUpdate(json);
          }
        : undefined,
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    if (contentJson === lastEmittedRef.current) return;
    if (contentJson === JSON.stringify(editor.getJSON())) {
      lastEmittedRef.current = contentJson;
      return;
    }
    editor.commands.setContent(JSON.parse(contentJson) as JSONContent, { emitUpdate: false });
    lastEmittedRef.current = contentJson;
  }, [contentJson, editor]);

  return editor;
}
