'use client';

import { useCallback, useMemo } from 'react';
import { findPuckComponentById, ROOT_ZONE } from '@/lib/templates/puck-subtree';
import { useTemplatePuck } from './use-template-puck';

export function useSelectedRecord(): Record<string, unknown> {
  return useTemplatePuck((state) => (state.selectedItem?.props ?? {}) as Record<string, unknown>);
}

export function usePatchSelectedProps() {
  const selectedItem = useTemplatePuck((state) => state.selectedItem);
  const dispatch = useTemplatePuck((state) => state.dispatch);
  const getSelectorForId = useTemplatePuck((state) => state.getSelectorForId);

  return useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedItem) return;
      const selector = getSelectorForId(selectedItem.props.id);
      if (!selector) return;
      dispatch({
        type: 'replace',
        destinationIndex: selector.index,
        destinationZone: selector.zone ?? ROOT_ZONE,
        data: {
          ...selectedItem,
          props: { ...selectedItem.props, ...patch },
        },
      });
    },
    [dispatch, getSelectorForId, selectedItem],
  );
}

export function usePatchComponentById(id: string | undefined) {
  const selectedItem = useTemplatePuck((state) => state.selectedItem);
  const dispatch = useTemplatePuck((state) => state.dispatch);
  const getSelectorForId = useTemplatePuck((state) => state.getSelectorForId);
  const data = useTemplatePuck((state) => state.appState.data);
  const config = useTemplatePuck((state) => state.config);

  return useCallback(
    (patch: Record<string, unknown>, options?: { select?: boolean }) => {
      if (!id) return;
      const selector = getSelectorForId(id);
      if (!selector) return;
      const current = selectedItem?.props.id === id ? selectedItem : findPuckComponentById(data, id, config);
      if (!current) return;
      dispatch({
        type: 'replace',
        destinationIndex: selector.index,
        destinationZone: selector.zone ?? ROOT_ZONE,
        data: {
          ...current,
          props: { ...current.props, ...patch },
        },
        ...(options?.select
          ? { ui: { itemSelector: { index: selector.index, zone: selector.zone ?? ROOT_ZONE } } }
          : {}),
      });
    },
    [config, data, dispatch, getSelectorForId, id, selectedItem],
  );
}

export function useSelectedComponentId(): string | undefined {
  return useTemplatePuck((state) => state.selectedItem?.props.id as string | undefined);
}

export function useSelectedComponentType(): string | undefined {
  return useTemplatePuck((state) => state.selectedItem?.type);
}

const UNDELETABLE_TYPES = new Set(['PageHeader', 'PageFooter', 'Body']);

export function useCanDeleteSelected(): boolean {
  const type = useSelectedComponentType();
  if (!type) return false;
  if (UNDELETABLE_TYPES.has(type)) return false;
  return true;
}

export function useDeleteSelected() {
  const selectedItem = useTemplatePuck((state) => state.selectedItem);
  const dispatch = useTemplatePuck((state) => state.dispatch);
  const getSelectorForId = useTemplatePuck((state) => state.getSelectorForId);
  const canDelete = useCanDeleteSelected();

  return useCallback(() => {
    if (!selectedItem || !canDelete) return;
    const selector = getSelectorForId(selectedItem.props.id);
    if (!selector) return;
    dispatch({ type: 'remove', index: selector.index, zone: selector.zone ?? ROOT_ZONE });
  }, [canDelete, dispatch, getSelectorForId, selectedItem]);
}

function loopKeyFrom(item: { type: string; props: Record<string, unknown> } | undefined): string | null {
  if (!item) return null;
  if (item.type !== 'Container' && item.type !== 'Table') return null;
  const key = typeof item.props.loopKey === 'string' ? item.props.loopKey.trim() : '';
  return key || null;
}

export function usePuckAncestorLoops(includeSelfLoopKey: boolean): string[] {
  const selectedItem = useTemplatePuck((state) => state.selectedItem);
  const getParentById = useTemplatePuck((state) => state.getParentById);
  const selectedId = selectedItem?.props.id as string | undefined;

  return useMemo(() => {
    const keys: string[] = [];
    if (!selectedItem || !selectedId) return keys;

    if (includeSelfLoopKey) {
      const selfKey = loopKeyFrom(selectedItem);
      if (selfKey) keys.push(selfKey);
    }

    let parent = getParentById(selectedId);
    while (parent) {
      const key = loopKeyFrom(parent);
      if (key) keys.push(key);
      parent = getParentById(parent.props.id);
    }

    return keys;
  }, [getParentById, includeSelfLoopKey, selectedId, selectedItem]);
}
