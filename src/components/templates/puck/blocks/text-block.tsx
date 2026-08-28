import type { ReactNode } from 'react';
import type { TextAlign } from '@/components/templates/puck/table-model';

export function TextBlock({
  text,
  fontSize,
  color,
  textAlign,
}: {
  text: ReactNode;
  fontSize: number;
  color: string;
  textAlign: TextAlign;
}) {
  return <div style={{ fontSize, color, textAlign, lineHeight: 1.5 }}>{text}</div>;
}
