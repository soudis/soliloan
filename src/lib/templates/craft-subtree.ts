/**
 * Utilities for extracting and cloning Craft.js serialized subtrees.
 *
 * Craft.js serializes the editor state as a flat map of nodeId → nodeData.
 * Each nodeData has:
 *   - `nodes`: string[] (ordered child IDs for canvas children)
 *   - `linkedNodes`: Record<string, string> (named slots like PAGE_HEADER)
 *   - `props`, `type`, `isCanvas`, `parent`, `custom`, `hidden`, `displayName`
 */

import { getNodesMapFromDesign } from './email-generator';

const STRUCTURAL_IDS = new Set(['ROOT', 'PAGE_HEADER', 'BODY', 'PAGE_FOOTER']);

type SerializedNode = Record<string, unknown>;
type NodesMap = Record<string, SerializedNode>;

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Extract a subtree rooted at `rootId` from a full serialized design.
 * Returns a flat map containing only the root node and all its descendants.
 * Throws if rootId is a structural node or not found.
 */
export function extractCraftSubtree(
  design: Record<string, unknown>,
  rootId: string,
): NodesMap {
  const allNodes = getNodesMapFromDesign(design) as NodesMap;

  if (!allNodes[rootId]) {
    throw new Error(`Node "${rootId}" not found in design`);
  }
  if (STRUCTURAL_IDS.has(rootId)) {
    throw new Error(`Cannot save structural node "${rootId}" as a predefined block`);
  }

  const subtree: NodesMap = {};
  const queue = [rootId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (subtree[id]) continue;

    const node = allNodes[id];
    if (!node) continue;

    subtree[id] = { ...node };

    const childIds = (node.nodes as string[]) ?? [];
    for (const childId of childIds) {
      queue.push(childId);
    }

    const linked = (node.linkedNodes as Record<string, string>) ?? {};
    for (const linkedId of Object.values(linked)) {
      queue.push(linkedId);
    }
  }

  // Clear the parent reference on the root so it can be re-parented on insert
  if (subtree[rootId]) {
    subtree[rootId] = { ...subtree[rootId], parent: null };
  }

  return subtree;
}

/**
 * Clone a subtree with fresh IDs so it can be inserted without collisions.
 * Returns { nodesMap, rootId } where rootId is the new ID for the original root.
 */
export function cloneCraftSubtreeWithNewIds(
  subtree: NodesMap,
  originalRootId: string,
): { nodesMap: NodesMap; rootId: string } {
  const oldIds = Object.keys(subtree);
  const idMap = new Map<string, string>();

  for (const oldId of oldIds) {
    idMap.set(oldId, generateId());
  }

  const newNodes: NodesMap = {};

  for (const oldId of oldIds) {
    const newId = idMap.get(oldId) ?? generateId();
    const node = { ...subtree[oldId] };

    // Remap child IDs
    if (Array.isArray(node.nodes)) {
      node.nodes = (node.nodes as string[]).map((cid) => idMap.get(cid) ?? cid);
    }

    // Remap linked node IDs
    if (node.linkedNodes && typeof node.linkedNodes === 'object') {
      const newLinked: Record<string, string> = {};
      for (const [key, val] of Object.entries(node.linkedNodes as Record<string, string>)) {
        newLinked[key] = idMap.get(val) ?? val;
      }
      node.linkedNodes = newLinked;
    }

    // Remap parent
    if (node.parent && typeof node.parent === 'string') {
      node.parent = idMap.get(node.parent) ?? null;
    }

    newNodes[newId] = node;
  }

  return {
    nodesMap: newNodes,
    rootId: idMap.get(originalRootId) ?? originalRootId,
  };
}

/**
 * Find the root node ID in a subtree (the one with parent === null).
 */
export function findSubtreeRootId(subtree: NodesMap): string | null {
  for (const [id, node] of Object.entries(subtree)) {
    if (!node.parent) return id;
  }
  return Object.keys(subtree)[0] ?? null;
}
