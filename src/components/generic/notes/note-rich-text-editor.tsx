'use client';

import { EditorContent } from '@tiptap/react';
import { useEffect, useState } from 'react';

import { isNoteContentEmpty } from '@/lib/notes/note-html';
import { cn } from '@/lib/utils';

import { NoteEditorToolbar } from './note-editor-toolbar';
import './note-tiptap.css';
import { useNoteTiptapEditor } from './use-note-tiptap-editor';

type NoteRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

export function NoteRichTextEditor({ value, onChange, placeholder, className }: NoteRichTextEditorProps) {
  const editor = useNoteTiptapEditor({
    content: value,
    editable: true,
    onUpdate: onChange,
  });

  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(() => isNoteContentEmpty(value));

  useEffect(() => {
    if (!editor) return;

    const syncEmpty = () => setIsEmpty(editor.isEmpty);
    syncEmpty();

    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);

    editor.on('update', syncEmpty);
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);

    return () => {
      editor.off('update', syncEmpty);
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  useEffect(() => {
    setIsEmpty(isNoteContentEmpty(value));
  }, [value]);

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-[120px] flex-col overflow-hidden rounded-md border border-border bg-background',
        className,
      )}
    >
      <NoteEditorToolbar editor={editor} />
      <div className="relative flex-1 px-3 py-2">
        {placeholder && isEmpty && !isFocused ? (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
