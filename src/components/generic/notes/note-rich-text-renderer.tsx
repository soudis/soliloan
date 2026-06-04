'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo } from 'react';

import { normalizeNoteContentForEditor } from '@/lib/notes/note-html';
import { getNoteTiptapExtensions } from '@/lib/notes/note-tiptap-extensions';
import { cn } from '@/lib/utils';

import './note-tiptap.css';

type NoteRichTextRendererProps = {
  content: string;
  className?: string;
};

export function NoteRichTextRenderer({ content, className }: NoteRichTextRendererProps) {
  const extensions = useMemo(() => getNoteTiptapExtensions({ autolink: false, openOnClick: true }), []);

  const editor = useEditor(
    {
      extensions,
      content: normalizeNoteContentForEditor(content),
      immediatelyRender: false,
      editable: false,
      editorProps: {
        attributes: {
          class: 'note-tiptap-renderer outline-none',
        },
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    const normalized = normalizeNoteContentForEditor(content);
    if (normalized !== editor.getHTML()) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('text-sm', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
