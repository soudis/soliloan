'use client';

import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';

import { normalizeNoteContentForEditor } from '@/lib/notes/note-html';
import { getNoteTiptapExtensions } from '@/lib/notes/note-tiptap-extensions';

type UseNoteTiptapEditorOptions = {
  content: string;
  editable: boolean;
  onUpdate?: (html: string) => void;
};

export function useNoteTiptapEditor({ content, editable, onUpdate }: UseNoteTiptapEditorOptions) {
  const extensions = useMemo(() => getNoteTiptapExtensions(), []);
  /** Tracks the last HTML emitted by the editor to avoid resetting content (and selection) on self-updates. */
  const lastEmittedHtmlRef = useRef<string | null>(null);

  const editor = useEditor(
    {
      extensions,
      content: normalizeNoteContentForEditor(content),
      immediatelyRender: false,
      editable,
      editorProps: {
        attributes: {
          class: editable ? 'note-tiptap-editor outline-none' : 'note-tiptap-renderer outline-none',
        },
      },
      onUpdate: onUpdate
        ? ({ editor: ed }) => {
            const html = ed.getHTML();
            lastEmittedHtmlRef.current = html;
            onUpdate(html);
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

    // Skip when the parent value came from this editor (e.g. Enter / typing via react-hook-form).
    if (content === lastEmittedHtmlRef.current) return;

    const normalizedContent = normalizeNoteContentForEditor(content);
    const normalizedEditor = normalizeNoteContentForEditor(editor.getHTML());

    if (normalizedContent === normalizedEditor) {
      lastEmittedHtmlRef.current = content;
      return;
    }

    editor.commands.setContent(normalizedContent, { emitUpdate: false });
    lastEmittedHtmlRef.current = content;
  }, [content, editor]);

  return editor;
}
