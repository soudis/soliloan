'use client';

import { ActionBar } from '@puckeditor/core';
import type { ReactNode } from 'react';
import { useTemplatePuck } from './use-template-puck';

export function CanvasActionBar({
  label,
  parentAction,
  children,
}: {
  label?: string;
  parentAction?: ReactNode;
  children?: ReactNode;
}) {
  const displayName = useTemplatePuck((state) => {
    const custom = state.selectedItem?.props.displayName;
    return typeof custom === 'string' ? custom.trim() : '';
  });
  const typeLabel = label?.trim() ?? '';
  const combined =
    displayName && typeLabel && displayName !== typeLabel ? `${displayName} · ${typeLabel}` : displayName || typeLabel;

  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {combined ? <ActionBar.Label label={combined} /> : null}
      </ActionBar.Group>
      <ActionBar.Group>{children}</ActionBar.Group>
    </ActionBar>
  );
}
