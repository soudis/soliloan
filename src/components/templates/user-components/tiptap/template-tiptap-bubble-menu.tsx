'use client';

import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, GitBranch, Italic, PlusCircle, Trash2, Underline as UnderlineIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildLoopMergeTagFallbackHtml } from '@/lib/templates/tiptap-merge-loop';
import { cn } from '@/lib/utils';
import { useEditorMetadata } from '../../editor-context';
import { useMergeTagConfig } from '../../merge-tag-context';
import { MergeTagDropdown } from '../../merge-tag-dropdown';
import { usePuckAncestorLoops } from '../../puck/use-puck-selected';

/** Show the formatting menu while the cell editor is focused, including a bare caret. */
export function shouldShowTiptapBubbleMenu(editor: Editor): boolean {
  return editor.isEditable && editor.isFocused;
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
  const tText = useTranslations('templates.editor.components.text');
  const tConditions = useTranslations('templates.editor.conditions');
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const ancestorLoops = usePuckAncestorLoops(true);
  const iconClass = dense ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnSize = dense ? 'size-7' : 'size-8';
  const keepOpenRef = useRef(false);
  const [mergeTagOpen, setMergeTagOpen] = useState(false);
  const [mergeTagPosition, setMergeTagPosition] = useState({ top: 0, left: 0 });

  /** Must be stable: TipTap BubbleMenu re-dispatches when `shouldShow` identity changes, which would loop with our `bumpSelection` otherwise. */
  const shouldShowBubble = useCallback(
    ({ editor: ed }: { editor: Editor }) => keepOpenRef.current || shouldShowTiptapBubbleMenu(ed),
    [],
  );

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

  const insertCondition = () => {
    editor
      .chain()
      .focus()
      .insertTemplateCondition({
        thenText: tConditions('thenPlaceholder'),
        elseText: tConditions('elsePlaceholder'),
      })
      .run();
  };

  const insertMergeTag = (item: MergeTagField | MergeTagLoop) => {
    if ('startTag' in item) {
      const inserted = editor.chain().focus().insertMergeTagLoop(item).run();
      if (!inserted) {
        editor.commands.insertContent(buildLoopMergeTagFallbackHtml(item, t('loopBodyPlaceholder')));
      }
    } else {
      editor
        .chain()
        .focus()
        .insertMergeTag({
          id: String(item.key),
          label: item.label,
          value: item.value.replace(/[{}]/g, ''),
        })
        .run();
    }
    keepOpenRef.current = false;
    setMergeTagOpen(false);
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

          <Separator orientation="vertical" className="h-5 shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={btnSize}
                aria-label={tText('insertPlaceholder')}
                onMouseDown={(event) => {
                  event.preventDefault();
                  keepOpenRef.current = true;
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setMergeTagPosition({ top: rect.bottom + 5, left: rect.left - 80 });
                  setMergeTagOpen(true);
                }}
              >
                <PlusCircle className={iconClass} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{tText('insertPlaceholder')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={btnSize}
                aria-label={tConditions('insert')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={insertCondition}
              >
                <GitBranch className={iconClass} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{tConditions('insert')}</p>
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
      {config && (
        <MergeTagDropdown
          isOpen={mergeTagOpen}
          onClose={() => {
            keepOpenRef.current = false;
            setMergeTagOpen(false);
          }}
          onSelect={insertMergeTag}
          config={config}
          position={mergeTagPosition}
          insertionContext={{ ancestorLoopsInnermostFirst: ancestorLoops, dataset: editorMeta.dataset }}
        />
      )}
    </BubbleMenu>
  );
}
