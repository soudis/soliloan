'use client';

import type { SlotComponent } from '@puckeditor/core';
import { useMemo } from 'react';
import { type BorderStyle, buildBorderStyle } from '@/lib/templates/border-utils';
import { paddingPropsToReactStyle } from '@/lib/templates/padding-utils';

export function ZoneBlock({
  content: Content,
  padding = 16,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background = '#ffffff',
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderColor,
  borderStyle,
  borderWidth,
}: {
  content: SlotComponent;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  background?: string;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderColor?: string;
  borderStyle?: BorderStyle;
  borderWidth?: number;
}) {
  const borderStyleObj = useMemo(
    () =>
      buildBorderStyle({
        borderTop,
        borderRight,
        borderBottom,
        borderLeft,
        borderColor,
        borderStyle,
        borderWidth,
      }),
    [borderBottom, borderColor, borderLeft, borderRight, borderStyle, borderTop, borderWidth],
  );
  const paddingStyle = useMemo(
    () => paddingPropsToReactStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
    [padding, paddingBottom, paddingLeft, paddingRight, paddingTop],
  );

  return (
    <div style={{ ...paddingStyle, background, ...borderStyleObj, minHeight: 48 }}>
      <Content minEmptyHeight={32} />
    </div>
  );
}
