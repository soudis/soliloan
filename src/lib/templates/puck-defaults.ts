import type { BorderStyle } from '@/lib/templates/border-utils';

export type DisplayNameProps = {
  displayName?: string;
};

export type PaddingProps = {
  padding: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

export type BorderFieldProps = {
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderColor: string;
  borderStyle: BorderStyle;
  borderWidth: number;
};

export const DEFAULT_PADDING: PaddingProps = { padding: 16 };

export const DEFAULT_BORDER: BorderFieldProps = {
  borderTop: false,
  borderRight: false,
  borderBottom: false,
  borderLeft: false,
  borderColor: '#e4e4e7',
  borderStyle: 'solid',
  borderWidth: 1,
};

export const DEFAULT_TABLE_BORDER: BorderFieldProps = {
  ...DEFAULT_BORDER,
  borderTop: true,
  borderRight: true,
  borderBottom: true,
  borderLeft: true,
};

export function getDefaultPageZoneProps(id: string) {
  return {
    id,
    displayName: '',
    content: [] as [],
    background: '#ffffff',
    ...DEFAULT_PADDING,
    ...DEFAULT_BORDER,
  };
}

export function getDefaultBodyProps() {
  return {
    id: 'page-body',
    displayName: '',
    content: [] as [],
    loopKey: '',
    layout: 'vertical' as const,
    gap: 0,
    gridColumns: 2,
    justifyContent: 'flex-start' as const,
    alignItems: 'stretch' as const,
    background: '#ffffff',
    padding: 20,
    ...DEFAULT_BORDER,
  };
}
