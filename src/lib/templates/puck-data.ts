import type { TemplateType } from '@prisma/client';
import type { Data } from '@puckeditor/core';
import type { TemplateComponentProps, TemplateRootProps } from '@/lib/templates/puck-config';

export type TemplateData = Data<TemplateComponentProps, TemplateRootProps>;

export function isPuckData(value: unknown): value is TemplateData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  return Array.isArray(rec.content) && 'root' in rec;
}

export function getEmptyPuckData(type: TemplateType): TemplateData {
  if (type === 'DOCUMENT') {
    return {
      content: [],
      root: {
        props: {
          header: [
            {
              type: 'PageHeader',
              props: { id: 'page-header', content: [], padding: 16, background: '#ffffff' },
            },
          ],
          footer: [
            {
              type: 'PageFooter',
              props: { id: 'page-footer', content: [], padding: 16, background: '#ffffff' },
            },
          ],
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
    try {
      return toPuckData(JSON.parse(initial), type);
    } catch {
      return getEmptyPuckData(type);
    }
  }

  if (isPuckData(initial)) return initial;
  return getEmptyPuckData(type);
}
