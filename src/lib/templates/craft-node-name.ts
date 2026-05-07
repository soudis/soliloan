import type { EditorState } from '@craftjs/core';

type ActionsWithSetState = {
  setState?: (cb: (state: EditorState) => void) => void;
};

type NodeDataForLabel = {
  name?: string;
  displayName?: string;
};

/**
 * Label shown in hierarchy / selection chrome. Prefer `displayName`: Craft's `query.serialize()` strips
 * `data.name` from JSON, but persists `data.displayName`.
 */
export function getNodeEditorLabel(data: NodeDataForLabel, fallbackId: string): string {
  const fromDisplay = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (fromDisplay) return fromDisplay;
  const fromName = typeof data.name === 'string' ? data.name.trim() : '';
  if (fromName) return fromName;
  return fallbackId;
}

/**
 * Updates `node.data.displayName` (serialized by Craft). Do not use `data.name` for custom labels —
 * that field is omitted from `query.serialize()` and is re-derived on deserialize.
 */
export function setNodeDisplayName(actions: unknown, nodeId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const a = actions as ActionsWithSetState;
  if (typeof a.setState !== 'function') return;

  a.setState((state) => {
    const node = state.nodes[nodeId];
    if (!node) return;
    node.data.displayName = trimmed;
  });
}
