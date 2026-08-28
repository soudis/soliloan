import type { TemplateType } from '@prisma/client';
import type { ComponentData } from '@puckeditor/core';
import type { TemplateData } from '@/lib/templates/puck-data';
import { getDefaultBodyProps } from '@/lib/templates/puck-defaults';

type CraftNode = {
  type?: string | { resolvedName?: string };
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  props?: Record<string, unknown>;
  parent?: string | null;
  displayName?: string;
};

type CraftNodesMap = Record<string, CraftNode>;

const SLOT_TYPES = new Set(['Container', 'Body', 'PageHeader', 'PageFooter']);

function looksLikePuckData(value: unknown): value is TemplateData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  return Array.isArray(rec.content) && 'root' in rec;
}

function asNodesMap(design: unknown): CraftNodesMap {
  if (!design || typeof design !== 'object' || Array.isArray(design)) return {};
  const rec = design as Record<string, unknown>;
  if (rec.nodes && typeof rec.nodes === 'object' && !Array.isArray(rec.nodes)) {
    return rec.nodes as CraftNodesMap;
  }
  if (rec.ROOT && typeof rec.ROOT === 'object') return rec as CraftNodesMap;
  if (rec.designJson && typeof rec.designJson === 'object') return asNodesMap(rec.designJson);
  return rec as CraftNodesMap;
}

function resolvedName(node: CraftNode | undefined): string | null {
  if (!node) return null;
  const type = node.type;
  if (typeof type === 'string') return type;
  if (type && typeof type === 'object' && typeof type.resolvedName === 'string') return type.resolvedName;
  return null;
}

function childIds(node: CraftNode | undefined): string[] {
  if (!node) return [];
  if (Array.isArray(node.nodes) && node.nodes.length > 0) return node.nodes.filter((id) => typeof id === 'string');
  if (node.linkedNodes && typeof node.linkedNodes === 'object') {
    return Object.values(node.linkedNodes).filter((id) => typeof id === 'string');
  }
  return [];
}

function convertNode(id: string, nodes: CraftNodesMap): ComponentData | null {
  const node = nodes[id];
  const type = resolvedName(node);
  if (!node || !type) return null;

  const props: Record<string, unknown> = { ...(node.props ?? {}), id };
  const displayName = typeof node.displayName === 'string' ? node.displayName.trim() : '';
  if (displayName) props.displayName = displayName;
  if (SLOT_TYPES.has(type)) {
    props.content = childIds(node)
      .map((childId) => convertNode(childId, nodes))
      .filter((item): item is ComponentData => item !== null);
  }

  return { type, props: props as ComponentData['props'] };
}

function findRootChildByPropId(nodes: CraftNodesMap, propId: string): string | null {
  const root = nodes.ROOT;
  for (const id of childIds(root)) {
    const node = nodes[id];
    if (node?.props?.id === propId) return id;
    if (resolvedName(node) === 'PageHeader' && propId === 'PAGE_HEADER') return id;
    if (resolvedName(node) === 'PageFooter' && propId === 'PAGE_FOOTER') return id;
  }
  return null;
}

function convertEmail(nodes: CraftNodesMap): TemplateData {
  const content = childIds(nodes.ROOT)
    .map((id) => convertNode(id, nodes))
    .filter((item): item is ComponentData => item !== null);

  return {
    content,
    root: { props: { header: [], footer: [] } },
  } as unknown as TemplateData;
}

function asBodyComponent(node: ComponentData | null): ComponentData | null {
  if (!node) return null;
  if (node.type === 'Body' || node.type === 'Container') return { ...node, type: 'Body' };
  return {
    type: 'Body',
    props: {
      ...getDefaultBodyProps(),
      content: [node],
    },
  };
}

function findDocumentBodyId(nodes: CraftNodesMap, headerId: string | null, footerId: string | null): string | null {
  const byPropId = findRootChildByPropId(nodes, 'BODY');
  if (byPropId) return byPropId;
  const remaining = childIds(nodes.ROOT).filter((id) => id !== headerId && id !== footerId);
  return remaining.length === 1 ? remaining[0] : null;
}

function convertDocument(nodes: CraftNodesMap): TemplateData {
  const headerId = findRootChildByPropId(nodes, 'PAGE_HEADER');
  const footerId = findRootChildByPropId(nodes, 'PAGE_FOOTER');
  const bodyId = findDocumentBodyId(nodes, headerId, footerId);

  const header = headerId ? convertNode(headerId, nodes) : null;
  const footer = footerId ? convertNode(footerId, nodes) : null;
  let body = bodyId ? asBodyComponent(convertNode(bodyId, nodes)) : null;
  if (!body) {
    const remaining = childIds(nodes.ROOT)
      .filter((id) => id !== headerId && id !== footerId)
      .map((id) => convertNode(id, nodes))
      .filter((item): item is ComponentData => item !== null);
    if (remaining.length > 0) {
      body = {
        type: 'Body',
        props: {
          ...getDefaultBodyProps(),
          content: remaining,
        },
      };
    }
  }

  return {
    content: body ? [body] : [],
    root: {
      props: {
        header: header ? [header] : [],
        footer: footer ? [footer] : [],
      },
    },
  } as unknown as TemplateData;
}

export function isCraftDesign(value: unknown): boolean {
  if (looksLikePuckData(value)) return false;
  const nodes = asNodesMap(value);
  return Boolean(nodes.ROOT && resolvedName(nodes.ROOT));
}

function isPuckComponentData(value: unknown): value is ComponentData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.type === 'string' && !!rec.props && typeof rec.props === 'object' && !Array.isArray(rec.props);
}

function findSubtreeRootId(nodes: CraftNodesMap): string | null {
  const ids = Object.keys(nodes);
  for (const id of ids) {
    const parent = nodes[id]?.parent;
    if (!parent || !(parent in nodes)) return id;
  }
  return ids[0] ?? null;
}

export function convertCraftSubtreeToPuck(value: unknown): ComponentData | null {
  if (isPuckComponentData(value)) return value;
  const nodes = asNodesMap(value);
  const rootId = findSubtreeRootId(nodes);
  if (!rootId || rootId === 'ROOT') return null;
  return convertNode(rootId, nodes);
}

export function convertCraftDesignToPuck(design: unknown, type: TemplateType): TemplateData {
  if (looksLikePuckData(design)) return design;
  const nodes = asNodesMap(design);
  if (!nodes.ROOT) {
    return {
      content: [],
      root: { props: { header: [], footer: [] } },
    };
  }
  return type === 'DOCUMENT' ? convertDocument(nodes) : convertEmail(nodes);
}
