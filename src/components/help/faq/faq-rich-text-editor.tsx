'use client';

import type { JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorContent } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { uploadFaqImage } from '@/lib/help/upload-faq-image';
import { cn } from '@/lib/utils';
import type { FaqTocArticle } from '@/types/faq';

import { FaqEditorToolbar } from './faq-editor-toolbar';
import { FaqImageAltDialog } from './faq-image-alt-dialog';
import './faq-tiptap.css';
import { useFaqTiptapEditor } from './use-faq-tiptap-editor';

type FaqRichTextEditorProps = {
  value: JSONContent | null;
  onChange: (json: JSONContent) => void;
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  className?: string;
};

type ImageDialogState = {
  previewSrc: string;
  alt: string;
  mode: 'insert' | 'edit';
  file?: File;
  revokeOnClose: boolean;
  editPos?: number;
};

export function FaqRichTextEditor({ value, onChange, pickerArticles, className }: FaqRichTextEditorProps) {
  const t = useTranslations('help.editor');
  const tError = useTranslations();
  const pendingFilesRef = useRef<File[]>([]);
  const imageDialogRef = useRef<ImageDialogState | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageDialogState | null>(null);
  const [submittingImage, setSubmittingImage] = useState(false);

  const editor = useFaqTiptapEditor({
    content: value ?? EMPTY_FAQ_DOC,
    editable: true,
    onUpdate: onChange,
    editorClassName: 'faq-tiptap-editor outline-none min-h-[16rem] px-3 py-2',
  });

  const openNextPendingFile = useCallback(() => {
    const file = pendingFilesRef.current.shift();
    if (!file) return;
    const next: ImageDialogState = {
      previewSrc: URL.createObjectURL(file),
      alt: '',
      mode: 'insert',
      file,
      revokeOnClose: true,
    };
    imageDialogRef.current = next;
    setImageDialog(next);
  }, []);

  const enqueueImageFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'));
      if (images.length === 0) return;
      pendingFilesRef.current.push(...images);
      if (!imageDialogRef.current) openNextPendingFile();
    },
    [openNextPendingFile],
  );

  const closeImageDialog = useCallback(() => {
    const current = imageDialogRef.current;
    if (current?.revokeOnClose) URL.revokeObjectURL(current.previewSrc);
    imageDialogRef.current = null;
    setImageDialog(null);
    setSubmittingImage(false);
    queueMicrotask(openNextPendingFile);
  }, [openNextPendingFile]);

  const confirmImageDialog = useCallback(
    async (alt: string) => {
      const current = imageDialogRef.current;
      if (!current || !editor) return;

      if (current.file) {
        setSubmittingImage(true);
        try {
          const url = await uploadFaqImage(current.file);
          editor.chain().focus().setImage({ src: url, alt }).run();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'error.serverError';
          toast.error(message.startsWith('error.') ? tError(message) : t('imageError'));
          setSubmittingImage(false);
          return;
        }
      } else if (current.editPos !== undefined) {
        editor.chain().focus().setNodeSelection(current.editPos).updateAttributes('image', { alt }).run();
      }

      closeImageDialog();
    },
    [closeImageDialog, editor, t, tError],
  );

  useEffect(() => {
    if (!editor) return;

    const handlePaste = (_view: unknown, event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'));
      if (files.length === 0) return false;
      event.preventDefault();
      enqueueImageFiles(files);
      return true;
    };

    const handleClickOn = (
      _view: unknown,
      _pos: number,
      node: ProseMirrorNode,
      nodePos: number,
      event: MouseEvent,
      direct: boolean,
    ) => {
      if (!direct || node.type.name !== 'image') return false;
      event.preventDefault();
      const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
      if (!src) return false;
      const next: ImageDialogState = {
        previewSrc: src,
        alt: typeof node.attrs.alt === 'string' ? node.attrs.alt : '',
        mode: 'edit',
        revokeOnClose: false,
        editPos: nodePos,
      };
      imageDialogRef.current = next;
      setImageDialog(next);
      return true;
    };

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handlePaste,
        handleClickOn,
      },
    });
  }, [editor, enqueueImageFiles]);

  if (!editor) {
    return <div className={cn('min-h-[16rem] rounded-md border border-border bg-background', className)} />;
  }

  return (
    <div
      className={cn(
        'flex min-h-[16rem] flex-col overflow-hidden rounded-md border border-border bg-background',
        className,
      )}
    >
      <FaqEditorToolbar editor={editor} pickerArticles={pickerArticles} onSelectImageFiles={enqueueImageFiles} />
      <EditorContent editor={editor} />
      <FaqImageAltDialog
        open={Boolean(imageDialog)}
        previewSrc={imageDialog?.previewSrc ?? null}
        initialAlt={imageDialog?.alt ?? ''}
        mode={imageDialog?.mode ?? 'insert'}
        submitting={submittingImage}
        onOpenChange={(open) => {
          if (!open && !submittingImage) closeImageDialog();
        }}
        onConfirm={(alt) => void confirmImageDialog(alt)}
      />
    </div>
  );
}
