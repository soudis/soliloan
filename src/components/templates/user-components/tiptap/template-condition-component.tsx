'use client';

import type { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';

import { TemplateConditionEditor } from '@/components/templates/conditions/template-condition-editor';
import { useTemplateConditionSummary } from '@/components/templates/conditions/use-condition-summary';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { decodeConditionPayload, encodeConditionPayload } from '@/lib/templates/template-condition';
import { buildTemplateConditionFields } from '@/lib/templates/template-condition-fields';
import { useMergeTagConfig } from '../../merge-tag-context';
import { usePuckAncestorLoops } from '../../puck/use-puck-selected';

export function TemplateConditionComponent({ node, editor, getPos, selected, updateAttributes }: NodeViewProps) {
  const t = useTranslations('templates.editor.conditions');
  const tCommon = useTranslations('common');
  const config = useMergeTagConfig();
  const ancestorLoops = usePuckAncestorLoops(true);
  const role = node.attrs.role === 'else' || node.attrs.role === 'end' ? node.attrs.role : 'if';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const blockCloseRef = useRef(false);
  const getPosRef = useRef(getPos);
  const editorRef = useRef(editor);
  getPosRef.current = getPos;
  editorRef.current = editor;
  const fields = useMemo(
    () => buildTemplateConditionFields(config, ancestorLoops, tCommon, t),
    [ancestorLoops, config, t, tCommon],
  );
  const condition = decodeConditionPayload(typeof node.attrs.condition === 'string' ? node.attrs.condition : '');
  const summary = useTemplateConditionSummary(condition);
  const label = role === 'else' ? t('else') : role === 'end' ? t('end') : summary ? `${t('if')} ${summary}` : t('if');

  useEffect(() => {
    if (role !== 'if') return;
    const hitsTrigger = (event: Event) => {
      const trigger = triggerRef.current;
      return !!trigger && event.target instanceof Node && trigger.contains(event.target);
    };
    // While the rich text field is focused, the editor stops pointerdown on an
    // ancestor of this pill. Listen on document first so the popup still opens.
    const onPointerDown = (event: PointerEvent) => {
      if (!hitsTrigger(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen((current) => {
        if (!current) blockCloseRef.current = true;
        return !current;
      });
      const pos = getPosRef.current();
      if (pos !== undefined) editorRef.current.commands.setNodeSelection(pos);
    };
    const swallow = (event: MouseEvent) => {
      if (!hitsTrigger(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'click') {
        window.setTimeout(() => {
          blockCloseRef.current = false;
        }, 0);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mousedown', swallow, true);
    document.addEventListener('click', swallow, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mousedown', swallow, true);
      document.removeEventListener('click', swallow, true);
    };
  }, [role]);

  useEffect(() => {
    if (!open) return;
    // Puck's inline rich text stops click events before they reach portaled React
    // handlers. Catch them on document and invoke the control's React onClick.
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const popover = target.closest('[data-template-condition-popover]');
      if (!popover) return;
      const control = target.closest('button');
      if (!(control instanceof HTMLButtonElement) || !popover.contains(control)) return;
      event.stopPropagation();
      const propsKey = Object.keys(control).find((key) => key.startsWith('__reactProps'));
      if (!propsKey) return;
      const props = (control as unknown as Record<string, { onClick?: (event: MouseEvent) => void }>)[propsKey];
      props?.onClick?.(event);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open]);

  const selectChip = () => {
    const pos = getPos();
    if (pos === undefined) return;
    editor.chain().focus().setNodeSelection(pos).run();
  };

  const chip = (
    <span
      className={`template-condition-pill template-condition-pill--${role}${selected ? ' template-condition-pill--selected' : ''}`}
    >
      {label}
    </span>
  );

  if (role !== 'if') {
    return (
      <NodeViewWrapper
        as="span"
        className="template-condition-wrapper"
        contentEditable={false}
        onPointerDown={(event: ReactPointerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          selectChip();
        }}
      >
        {chip}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="template-condition-wrapper" contentEditable={false}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next && blockCloseRef.current) return;
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className="template-condition-trigger"
            aria-label={t('edit')}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {chip}
          </button>
        </PopoverTrigger>
        <PopoverContent
          data-template-condition-popover=""
          className="w-[28rem] max-w-[calc(100vw-2rem)]"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TemplateConditionEditor
                value={condition}
                fields={fields}
                onChange={(next) => updateAttributes({ condition: encodeConditionPayload(next) })}
              />
            </div>
            <button
              type="button"
              className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={tCommon('ui.actions.close')}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
