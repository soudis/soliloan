import type { TemplateType } from '@prisma/client';
import type { ComponentData, Data } from '@puckeditor/core';
import { convertCraftDesignToPuck, isCraftDesign } from '@/lib/templates/craft-to-puck';
import type { TemplateComponentProps, TemplateRootProps } from '@/lib/templates/puck-config';
import { getDefaultBodyProps, getDefaultPageZoneProps } from '@/lib/templates/puck-defaults';

export type TemplateData = Data<TemplateComponentProps, TemplateRootProps>;

export class UnrecognizedTemplateDesignError extends Error {
  constructor(message = 'Template design JSON is neither Puck nor Craft format') {
    super(message);
    this.name = 'UnrecognizedTemplateDesignError';
  }
}

export function isPuckData(value: unknown): value is TemplateData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  return Array.isArray(rec.content) && 'root' in rec;
}

export function isBlankDesign(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function isComponentData(value: unknown): value is ComponentData {
  return !!value && typeof value === 'object' && 'type' in value && 'props' in value;
}

function slotChildren(node: ComponentData): ComponentData[] {
  return Array.isArray(node.props.content) ? node.props.content.filter(isComponentData) : [];
}

function asBody(node: ComponentData): ComponentData {
  return node.type === 'Body' ? node : { ...node, type: 'Body' };
}

function bodyWrapping(children: ComponentData[]): ComponentData {
  return {
    type: 'Body',
    props: {
      ...getDefaultBodyProps(),
      content: children,
    },
  };
}

function appendToBody(node: ComponentData, extras: ComponentData[]): ComponentData {
  if (extras.length === 0) return asBody(node);
  return {
    ...node,
    type: 'Body',
    props: {
      ...node.props,
      content: [...slotChildren(node), ...extras],
    },
  };
}

function hoistDocumentZones(data: TemplateData): TemplateData {
  const content = Array.isArray(data.content) ? data.content : [];
  let header = Array.isArray(data.root?.props?.header) ? [...data.root.props.header] : [];
  let footer = Array.isArray(data.root?.props?.footer) ? [...data.root.props.footer] : [];
  const rest: ComponentData[] = [];

  for (const item of content) {
    if (item.type === 'PageHeader') {
      if (header.length === 0) header = [item];
      continue;
    }
    if (item.type === 'PageFooter') {
      if (footer.length === 0) footer = [item];
      continue;
    }
    rest.push(item);
  }

  return {
    ...data,
    content: rest,
    root: {
      ...data.root,
      props: {
        ...data.root?.props,
        header,
        footer,
      },
    },
  } as TemplateData;
}

export function ensureDocumentBody(data: TemplateData): TemplateData {
  const hoisted = hoistDocumentZones(data);
  const content = hoisted.content ?? [];
  const bodies = content.filter((item) => item.type === 'Body');
  const others = content.filter((item) => item.type !== 'Body');

  let body: ComponentData;
  if (bodies.length === 0 && others.length === 1 && others[0].type === 'Container') {
    body = asBody(others[0]);
  } else if (bodies.length === 0 && others.length === 0) {
    body = { type: 'Body', props: getDefaultBodyProps() };
  } else if (bodies.length === 0) {
    const [first, ...rest] = others;
    body = first?.type === 'Container' ? appendToBody(first, rest) : bodyWrapping(others);
  } else {
    const [main, ...extraBodies] = bodies;
    const nested = extraBodies.flatMap((item) => {
      const children = slotChildren(item);
      return children.length > 0 ? children : [item];
    });
    body = appendToBody(main, [...others, ...nested]);
  }

  return { ...hoisted, content: [body] } as TemplateData;
}

export function getEmptyPuckData(type: TemplateType): TemplateData {
  if (type === 'DOCUMENT') {
    return {
      content: [{ type: 'Body', props: getDefaultBodyProps() }],
      root: {
        props: {
          header: [{ type: 'PageHeader', props: getDefaultPageZoneProps('page-header') }],
          footer: [{ type: 'PageFooter', props: getDefaultPageZoneProps('page-footer') }],
        },
      },
    };
  }

  return {
    content: [],
    root: { props: { header: [], footer: [] } },
  };
}

export function toPuckData(initial: unknown, type: TemplateType): TemplateData {
  if (typeof initial === 'string') {
    const trimmed = initial.trim();
    if (trimmed === '') return getEmptyPuckData(type);
    try {
      return toPuckData(JSON.parse(trimmed), type);
    } catch (error) {
      if (error instanceof UnrecognizedTemplateDesignError) throw error;
      throw new UnrecognizedTemplateDesignError('Template design JSON could not be parsed');
    }
  }

  if (isBlankDesign(initial)) return getEmptyPuckData(type);
  if (isPuckData(initial)) return type === 'DOCUMENT' ? ensureDocumentBody(initial) : initial;
  if (isCraftDesign(initial)) {
    const converted = convertCraftDesignToPuck(initial, type);
    return type === 'DOCUMENT' ? ensureDocumentBody(converted) : converted;
  }
  throw new UnrecognizedTemplateDesignError();
}
