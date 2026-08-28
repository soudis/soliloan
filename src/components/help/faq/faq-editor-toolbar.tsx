'use client';

import type { Editor } from '@tiptap/core';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  Table,
  Text,
  Underline as UnderlineIcon,
  Unlink,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useReducer, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FaqTocArticle } from '@/types/faq';

import { FaqArticleLinkDialog } from './faq-article-link-dialog';

type FaqEditorToolbarProps = {
  editor: Editor;
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  onSelectImageFiles: (files: File[]) => void;
};

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8', active && 'bg-accent text-accent-foreground')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function FaqEditorToolbar({ editor, pickerArticles, onSelectImageFiles }: FaqEditorToolbarProps) {
  const t = useTranslations('help.editor');
  const [, bumpToolbar] = useReducer((n: number) => n + 1, 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    const refresh = () => bumpToolbar();
    editor.on('selectionUpdate', refresh);
    editor.on('update', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('update', refresh);
    };
  }, [editor]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1 py-1">
        <ToolbarButton
          label={t('paragraph')}
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Text className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('heading2')}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('heading3')}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />

        <ToolbarButton
          label={t('bold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('italic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('underline')}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('code')}
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />

        <ToolbarButton
          label={t('bulletList')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('orderedList')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('blockquote')}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('codeBlock')}
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('table')}
          active={editor.isActive('table')}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />

        <ToolbarButton label={t('link')} active={editor.isActive('link')} onClick={() => setLinkOpen(true)}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        {editor.isActive('link') ? (
          <ToolbarButton label={t('unlink')} active={false} onClick={() => editor.chain().focus().unsetLink().run()}>
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        ) : null}
        <ToolbarButton label={t('image')} active={false} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) onSelectImageFiles(files);
          }}
        />
      </div>

      <FaqArticleLinkDialog
        open={linkOpen}
        initialHref={(editor.getAttributes('link').href as string | undefined) ?? ''}
        articles={pickerArticles}
        onOpenChange={setLinkOpen}
        onApply={(href) => {
          editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
          setLinkOpen(false);
        }}
        onRemove={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          setLinkOpen(false);
        }}
      />
    </TooltipProvider>
  );
}
