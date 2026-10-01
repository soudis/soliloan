import type { ReactNode } from 'react';
import type { TextAlign } from '@/components/templates/puck/table-model';
import { paddingPropsToReactStyle } from '@/lib/templates/padding-utils';

export function TextBlock({
  text,
  fontSize,
  color,
  textAlign,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: {
  text: ReactNode;
  fontSize: number;
  color: string;
  textAlign: TextAlign;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}) {
  return (
    <div
      style={{
        fontSize,
        color,
        textAlign,
        lineHeight: 1.5,
        ...paddingPropsToReactStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
      }}
    >
      {text}
    </div>
  );
}
