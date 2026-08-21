import type { ComponentData, Config, Content, Data } from '@puckeditor/core';
import { walkTree } from '@puckeditor/core';

export const ROOT_ZONE = 'root:default-zone';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function isComponentData(value: unknown): value is ComponentData {
  return !!value && typeof value === 'object' && 'type' in value && 'props' in value;
}

export function isPuckComponentData(value: unknown): value is ComponentData {
  return isComponentData(value);
}

function cloneSlotValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (value.every(isComponentData)) {
    return value.map((item) => clonePuckComponentData(item));
  }
  return value;
}

export function clonePuckComponentData(node: ComponentData): ComponentData {
  const props: Record<string, unknown> = { ...node.props, id: `${node.type}-${generateId()}` };
  for (const [key, value] of Object.entries(props)) {
    if (key === 'id') continue;
    props[key] = cloneSlotValue(value);
  }
  return { type: node.type, props: props as ComponentData['props'] };
}

export function findPuckComponentById(data: Data, id: string, config: Config): ComponentData | null {
  let found: ComponentData | null = null;
  walkTree(data, config, (content) => {
    for (const item of content) {
      if (item.props.id === id) found = item;
    }
    return content;
  });
  return found;
}

export function insertPuckComponent(
  data: Data,
  config: Config,
  destination: { zone: string; index: number },
  node: ComponentData,
): Data {
  const cloned = clonePuckComponentData(node);
  return walkTree(data, config, (content: Content, options) => {
    const currentZone = `${options.parentId}:${options.propName}`;
    if (currentZone !== destination.zone) return content;
    const next = [...content];
    const index = Math.max(0, Math.min(destination.index, next.length));
    next.splice(index, 0, cloned);
    return next;
  });
}
