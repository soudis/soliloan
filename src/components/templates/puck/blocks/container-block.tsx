'use client';

import type { SlotComponent } from '@puckeditor/core';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { type BorderStyle, buildBorderStyle } from '@/lib/templates/border-utils';
import { paddingPropsToReactStyle } from '@/lib/templates/padding-utils';
import { LoopRibbon, LoopRibbonEnd } from './loop-ribbon';

export type LayoutMode = 'vertical' | 'horizontal' | 'grid';
export type FlexJustify = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
export type FlexAlign = 'flex-start' | 'flex-end' | 'center' | 'stretch';

export type ContainerBlockProps = {
  content: SlotComponent;
  loopKey?: string;
  layout?: LayoutMode;
  gap?: number;
  gridColumns?: number;
  justifyContent?: FlexJustify;
  alignItems?: FlexAlign;
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
  displayName?: string;
};

function buildLayoutStyle(
  layout: LayoutMode,
  gap: number,
  gridColumns: number,
  justifyContent: FlexJustify,
  alignItems: FlexAlign,
): CSSProperties {
  switch (layout) {
    case 'horizontal':
      return {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: `${gap}px`,
        justifyContent,
        alignItems,
      };
    case 'grid':
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: `${gap}px`,
      };
    default:
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        justifyContent,
        alignItems,
      };
  }
}

export function ContainerBlock({
  content: Content,
  loopKey = '',
  layout = 'vertical',
  gap = 0,
  gridColumns = 2,
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  padding = 20,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background = 'transparent',
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderColor,
  borderStyle,
  borderWidth,
  displayName,
}: ContainerBlockProps) {
  const hasLoop = loopKey.trim().length > 0;
  const layoutStyle = useMemo(
    () => buildLayoutStyle(layout, gap, gridColumns, justifyContent, alignItems),
    [alignItems, gap, gridColumns, justifyContent, layout],
  );
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

  const frameStyle = {
    ...paddingStyle,
    background,
    ...borderStyleObj,
    minHeight: 50,
    width: '100%' as const,
  };

  // Layout must live on the slot: Puck wraps children in the DropZone, so a flex
  // wrapper around <Content /> only has one child and looks stacked/unstretched.
  const body = (
    <div style={frameStyle}>
      <Content minEmptyHeight={48} style={layoutStyle} />
    </div>
  );

  if (!hasLoop) {
    return body;
  }

  return (
    <div className="flex min-h-[50px] w-full flex-col overflow-hidden rounded-md">
      <LoopRibbon loopKey={loopKey} label={displayName} />
      {body}
      <LoopRibbonEnd loopKey={loopKey} />
    </div>
  );
}
