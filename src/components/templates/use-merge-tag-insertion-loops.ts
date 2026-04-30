'use client';

import type { Node } from '@craftjs/core';
import { useEditor } from '@craftjs/core';
import type { ComponentType } from 'react';

function getCraftComponentName(node: Node | undefined): string | null {
  if (!node) return null;
  const t = node.data.type;
  if (typeof t === 'string') return t;
  if (typeof t === 'function') {
    const fn = t as ComponentType<unknown> & { displayName?: string; name?: string };
    return fn.displayName || fn.name || null;
  }
  if (t && typeof t === 'object' && 'resolvedName' in t) {
    return String((t as { resolvedName: string }).resolvedName);
  }
  return null;
}

function getCanvasLoopKeyFromNode(node: Node | undefined): string | null {
  if (!node) return null;
  const resolved = getCraftComponentName(node);
  if (resolved !== 'Container' && resolved !== 'Table') return null;
  const key = node.data.props.loopKey as string | undefined;
  return key?.trim() ? key : null;
}

/**
 * Walks `parent` pointers and collects non-empty `loopKey` values on Container / Table nodes.
 * Order is innermost → outermost (first = closest enclosing loop).
 */
export function collectAncestorLoopKeys(
  nodes: Record<string, Node | undefined>,
  startNodeId: string,
  includeSelfLoopKey: boolean,
): string[] {
  const keys: string[] = [];

  let currentId: string | null = startNodeId;
  const self = nodes[startNodeId];
  if (includeSelfLoopKey) {
    const selfKey = getCanvasLoopKeyFromNode(self);
    if (selfKey) keys.push(selfKey);
    currentId = self?.data.parent ?? null;
  } else {
    currentId = self?.data.parent ?? null;
  }

  while (currentId) {
    const node = nodes[currentId];
    if (!node) break;
    const lk = getCanvasLoopKeyFromNode(node);
    if (lk) keys.push(lk);
    currentId = node.data.parent;
  }

  return keys;
}

export function useMergeTagInsertionLoops(nodeId: string, includeSelfLoopKey: boolean): string[] {
  const { ancestorLoopsInnermostFirst = [] } = useEditor((state) => ({
    ancestorLoopsInnermostFirst: collectAncestorLoopKeys(state.nodes, nodeId, includeSelfLoopKey),
  }));
  return ancestorLoopsInnermostFirst;
}
