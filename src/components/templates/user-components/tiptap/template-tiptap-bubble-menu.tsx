'use client';

import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Trash2, Underline as UnderlineIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Show bubble menu for non‑empty text selection or when a merge-tag atom is selected. */
export function shouldShowTiptapBubbleMenu(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!selection.empty) return true;
  if (selection instanceof NodeSelection && selection.node.type.name === 'mergeTag') return true;
  return false;
}

function isMergeTagNodeSelection(editor: Editor): boolean {
  const sel = editor.state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === 'mergeTag';
}

function isMarkActiveForBubble(editor: Editor, markName: 'bold' | 'italic' | 'underline') {
  const sel = editor.state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === 'mergeTag') {
    return sel.node.marks.some((m) => m.type.name === markName);
  }
  return editor.isActive(markName);
}

export type TemplateTiptapBubbleMenuProps = {
  editor: Editor;
  /** Unique per TipTap editor instance */
  pluginKey: string;
  dense?: boolean;
};

export function TemplateTiptapBubbleMenu({ editor, pluginKey, dense }: TemplateTiptapBubbleMenuProps) {
  const t = useTranslations('templates.editor.mergeTags');
  const iconClass = dense ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnSize = dense ? 'size-7' : 'size-8';

  /** Must be stable: TipTap BubbleMenu re-dispatches when `shouldShow` identity changes, which would loop with our `bumpSelection` otherwise. */
  const shouldShowBubble = useCallback(({ editor: ed }: { editor: Editor }) => shouldShowTiptapBubbleMenu(ed), []);

  const [, bumpSelection] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onSel = () => bumpSelection();
    editor.on('selectionUpdate', onSel);
    // `update` covers mark / doc changes where the selection anchor is unchanged (e.g. merge-tag formatting).
    editor.on('update', onSel);
    return () => {
      editor.off('selectionUpdate', onSel);
      editor.off('update', onSel);
    };
  }, [editor]);

  const mergeChip = isMergeTagNodeSelection(editor);

  const removeMergeTag = () => {
    if (!(editor.state.selection instanceof NodeSelection)) return;
    if (editor.state.selection.node.type.name !== 'mergeTag') return;
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <BubbleMenu editor={editor} pluginKey={pluginKey} shouldShow={shouldShowBubble}>
      <TooltipProvider delayDuration={300}>
        <div
          className={cn(
            'flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-none z-[1000]',
          )}
        >
          {mergeChip ? (
            <>
              <span className="flex max-w-[10rem] items-center truncate whitespace-nowrap px-2 py-1 text-xs text-muted-foreground">
                {t('bubbleFieldLabel')}
              </span>
              <Separator orientation="vertical" className="h-5 shrink-0" />
            </>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={isMarkActiveForBubble(editor, 'bold')}
                className={cn(btnSize, isMarkActiveForBubble(editor, 'bold') && 'bg-accent text-accent-foreground')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className={iconClass} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('bubbleBold')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={isMarkActiveForBubble(editor, 'italic')}
                className={cn(btnSize, isMarkActiveForBubble(editor, 'italic') && 'bg-accent text-accent-foreground')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className={iconClass} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('bubbleItalic')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={isMarkActiveForBubble(editor, 'underline')}
                className={cn(
                  btnSize,
                  isMarkActiveForBubble(editor, 'underline') && 'bg-accent text-accent-foreground',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className={iconClass} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('bubbleUnderline')}</p>
            </TooltipContent>
          </Tooltip>

          {mergeChip ? (
            <>
              <Separator orientation="vertical" className="h-5 shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(btnSize, 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={removeMergeTag}
                  >
                    <Trash2 className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('bubbleRemovePlaceholder')}</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      </TooltipProvider>
    </BubbleMenu>
  );
}
