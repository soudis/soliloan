import type React from 'react';

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export interface BorderProps {
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderColor?: string;
  borderStyle?: BorderStyle;
  borderWidth?: number;
}

const DEFAULT_BORDER_COLOR = '#e4e4e7';
const DEFAULT_BORDER_STYLE: BorderStyle = 'solid';
const DEFAULT_BORDER_WIDTH = 1;

/**
 * Build inline CSS for borders from BorderProps.
 * Only includes sides that are enabled (borderTop, etc.).
 */
export function buildBorderStyle(props: BorderProps): React.CSSProperties {
  const {
    borderTop = false,
    borderRight = false,
    borderBottom = false,
    borderLeft = false,
    borderColor = DEFAULT_BORDER_COLOR,
    borderStyle = DEFAULT_BORDER_STYLE,
    borderWidth = DEFAULT_BORDER_WIDTH,
  } = props;

  const w = `${borderWidth}px`;
  const style: React.CSSProperties = {};

  if (borderTop) {
    style.borderTopWidth = w;
    style.borderTopStyle = borderStyle;
    style.borderTopColor = borderColor;
  }
  if (borderRight) {
    style.borderRightWidth = w;
    style.borderRightStyle = borderStyle;
    style.borderRightColor = borderColor;
  }
  if (borderBottom) {
    style.borderBottomWidth = w;
    style.borderBottomStyle = borderStyle;
    style.borderBottomColor = borderColor;
  }
  if (borderLeft) {
    style.borderLeftWidth = w;
    style.borderLeftStyle = borderStyle;
    style.borderLeftColor = borderColor;
  }

  return style;
}

export const BORDER_STYLE_OPTIONS: BorderStyle[] = ['solid', 'dashed', 'dotted', 'double'];
