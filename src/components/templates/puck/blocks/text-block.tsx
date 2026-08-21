import type { TextAlign } from '@/components/templates/puck/table-model';

export function TextBlock({
  text,
  fontSize,
  color,
  textAlign,
}: {
  text: string;
  fontSize: number;
  color: string;
  textAlign: TextAlign;
}) {
  return (
    <div
      style={{ fontSize, color, textAlign, lineHeight: 1.5 }}
      // TipTap HTML authored in the editor; the same markup is walked into email/PDF.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: stored template HTML
      dangerouslySetInnerHTML={{ __html: text || '' }}
    />
  );
}
