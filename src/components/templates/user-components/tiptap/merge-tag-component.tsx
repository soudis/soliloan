'use client';

import type { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { cn } from '@/lib/utils';

export const MergeTagComponent = ({ node, editor, getPos, selected }: NodeViewProps) => {
  const label = node.attrs.label || node.attrs.value || 'Tag';
  const markNames = new Set(node.marks.map((m) => m.type.name));

  const selectChip = () => {
    const pos = getPos();
    if (pos === undefined) return;
    editor.chain().focus().setNodeSelection(pos).run();
  };

  return (
    <NodeViewWrapper
      as="span"
      className={`merge-tag-pill${selected ? ' merge-tag-pill--selected' : ''}`}
      data-merge-tag={node.attrs.value}
      data-merge-tag-id={node.attrs.id}
      data-merge-tag-label={node.attrs.label}
      contentEditable={false}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={(e: PointerEvent<HTMLSpanElement>) => {
        e.preventDefault();
        selectChip();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectChip();
        }
      }}
    >
      <span
        className={cn(
          'merge-tag-pill-inner',
          markNames.has('bold') && 'font-bold',
          markNames.has('italic') && 'italic',
          markNames.has('underline') && 'underline',
        )}
      >
        {label}
      </span>
    </NodeViewWrapper>
  );
};
