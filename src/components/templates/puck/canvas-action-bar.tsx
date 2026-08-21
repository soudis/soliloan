'use client';

import { ActionBar } from '@puckeditor/core';
import { CornerLeftUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type PointerEvent, type ReactNode, useCallback } from 'react';
import { ROOT_ZONE } from '@/lib/templates/puck-subtree';
import { useTemplatePuck } from './use-template-puck';

function suppressNextClick() {
  const onClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(timeout);
    document.removeEventListener('click', onClick, true);
  };
  document.addEventListener('click', onClick, true);
  const timeout = window.setTimeout(() => document.removeEventListener('click', onClick, true), 400);
}

export function CanvasActionBar({
  label,
  parentAction,
  children,
}: {
  label?: string;
  parentAction?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations('templates.editor');
  const displayName = useTemplatePuck((state) => {
    const custom = state.selectedItem?.props.displayName;
    return typeof custom === 'string' ? custom.trim() : '';
  });
  const selectedId = useTemplatePuck((state) => state.selectedItem?.props.id as string | undefined);
  const getParentById = useTemplatePuck((state) => state.getParentById);
  const getSelectorForId = useTemplatePuck((state) => state.getSelectorForId);
  const dispatch = useTemplatePuck((state) => state.dispatch);
  const typeLabel = label?.trim() ?? '';
  const combined =
    displayName && typeLabel && displayName !== typeLabel ? `${displayName} · ${typeLabel}` : displayName || typeLabel;

  const selectParent = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedId) return;

      const parent = getParentById(selectedId);
      const parentId = parent?.props.id;
      if (!parentId) return;
      const selector = getSelectorForId(parentId);
      if (!selector || selector.index < 0) return;

      // Inline richtext blur removes the formatting toolbar, shrinking the
      // right-aligned action bar so the click misses this button and hits the
      // canvas, which clears selection. Select on pointerdown and swallow that click.
      suppressNextClick();
      dispatch({
        type: 'setUi',
        ui: { itemSelector: { index: selector.index, zone: selector.zone ?? ROOT_ZONE } },
      });
    },
    [dispatch, getParentById, getSelectorForId, selectedId],
  );

  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction ? (
          <span className="inline-flex" onPointerDown={selectParent}>
            <ActionBar.Action
              label={t('selectParent')}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <CornerLeftUp size={16} />
            </ActionBar.Action>
          </span>
        ) : null}
        {combined ? <ActionBar.Label label={combined} /> : null}
      </ActionBar.Group>
      <ActionBar.Group>{children}</ActionBar.Group>
    </ActionBar>
  );
}
