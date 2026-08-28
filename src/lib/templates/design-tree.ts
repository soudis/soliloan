import type { ComponentData } from '@puckeditor/core';
import { toPuckData } from '@/lib/templates/puck-data';

export type DesignComponent = {
  type: string;
  props: Record<string, unknown>;
  children: DesignComponent[];
};

export type DocumentDesignLayout = {
  header: DesignComponent | null;
  body: DesignComponent[];
  footer: DesignComponent | null;
};

function isComponentData(value: unknown): value is ComponentData {
  return !!value && typeof value === 'object' && 'type' in value && 'props' in value;
}

export function fromPuckComponent(item: ComponentData): DesignComponent {
  const props = (item.props ?? {}) as Record<string, unknown>;
  const slot = Array.isArray(props.content) ? props.content : [];
  return {
    type: item.type,
    props,
    children: slot.filter(isComponentData).map(fromPuckComponent),
  };
}

export function getEmailComponents(design: unknown): DesignComponent[] {
  const data = toPuckData(design, 'EMAIL');
  return (data.content ?? []).map(fromPuckComponent);
}

export function getDocumentLayout(design: unknown): DocumentDesignLayout {
  const data = toPuckData(design, 'DOCUMENT');
  const headerSlot = data.root?.props?.header;
  const footerSlot = data.root?.props?.footer;
  let header =
    Array.isArray(headerSlot) && headerSlot[0] && isComponentData(headerSlot[0])
      ? fromPuckComponent(headerSlot[0])
      : null;
  let footer =
    Array.isArray(footerSlot) && footerSlot[0] && isComponentData(footerSlot[0])
      ? fromPuckComponent(footerSlot[0])
      : null;
  let body = (data.content ?? []).map(fromPuckComponent);

  // Seeds or leftover conversions may have put PageHeader/PageFooter in content.
  if (!header) {
    const index = body.findIndex((node) => node.type === 'PageHeader');
    if (index >= 0) {
      header = body[index] ?? null;
      body = body.filter((_, i) => i !== index);
    }
  }
  if (!footer) {
    const index = body.findIndex((node) => node.type === 'PageFooter');
    if (index >= 0) {
      footer = body[index] ?? null;
      body = body.filter((_, i) => i !== index);
    }
  }

  return { header, footer, body };
}

export function designComponentId(node: DesignComponent): string {
  const id = node.props.id;
  return typeof id === 'string' && id.length > 0 ? id : node.type;
}

export function designHasContent(design: unknown): boolean {
  const email = getEmailComponents(design);
  if (email.length > 0) return true;
  const document = getDocumentLayout(design);
  return document.body.length > 0 || document.header !== null || document.footer !== null;
}
