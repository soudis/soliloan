'use client';

import type { Editor } from '@tiptap/core';
import { Bold, Italic, Link2, Underline as UnderlineIcon, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useReducer } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type NoteEditorToolbarProps = {
  editor: Editor;
};

export function NoteEditorToolbar({ editor }: NoteEditorToolbarProps) {
  const t = useTranslations('dashboard.notes.editor');
  const [, bumpToolbar] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const refresh = () => bumpToolbar();
    editor.on('selectionUpdate', refresh);
    editor.on('update', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('update', refresh);
    };
  }, [editor]);

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(t('linkPrompt'), previousUrl ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const btnClass = (active: boolean) => cn('size-8', active && 'bg-accent text-accent-foreground');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 border-b border-border bg-muted/40 px-1 py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnClass(editor.isActive('bold'))}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('bold')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnClass(editor.isActive('italic'))}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('italic')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnClass(editor.isActive('underline'))}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('underline')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnClass(editor.isActive('link'))}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleLink}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('link')}</TooltipContent>
        </Tooltip>

        {editor.isActive('link') ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('unlink')}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
