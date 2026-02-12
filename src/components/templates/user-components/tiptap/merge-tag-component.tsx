'use client';

import type { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';

export const MergeTagComponent = ({ node }: NodeViewProps) => {
  return (
    <NodeViewWrapper
      as="span"
      className="merge-tag-pill"
      data-merge-tag={node.attrs.value}
      data-merge-tag-id={node.attrs.id}
      data-merge-tag-label={node.attrs.label}
      data-drag-handle
      contentEditable={false}
    >
      {node.attrs.label || node.attrs.value || 'Tag'}
    </NodeViewWrapper>
  );
};
