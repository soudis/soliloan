import type { MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';

/** Default when `MergeTag` option / translation is not configured (aligned with `templates.editor.mergeTags.loopBodyPlaceholder` in `de`). */
export const DEFAULT_LOOP_BODY_PLACEHOLDER_VISIBLE = 'Schleifeninhalt eingeben …';

/**
 * Exact strings removed on export when they still appear between consecutive merge-tag pills
 * (open loop → default hint → close loop). Add variants if TipTap escapes punctuation.
 */
export const LOOP_BODY_EXPORT_STRIP_PHRASES: readonly string[] = [
  DEFAULT_LOOP_BODY_PLACEHOLDER_VISIBLE,
  'Schleifeninhalt eingeben &hellip;',
  'Schleifeninhalt eingeben &#8230;',
  'Schleifeninhalt eingeben ...',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove default loop-body hint between merge-tag spans (no fragile private-use unicode in the editor). */
function stripDefaultLoopBodiesBetweenMergePills(html: string): string {
  let out = html;
  for (const phrase of LOOP_BODY_EXPORT_STRIP_PHRASES) {
    const e = escapeRegExp(phrase);
    out = out.replace(new RegExp(`(</span>)\\s*${e}\\s*(<span[^>]*data-merge-tag=)`, 'g'), '$1$2');
  }
  return out;
}

/** Content inside {{…}} stored on `data-merge-tag` / pill label (without outer braces). */
export function stripMustacheDelimiters(html: string): string {
  return html.replace(/\{\{|\}\}/g, '');
}

/** Minimal loop shape for inserting open/close pills in TipTap */
export type MergeTagLoopInsertParts = Pick<MergeTagLoop, 'key' | 'startTag' | 'endTag'>;

/** TipTap attrs for one merge-tag node (open or close of a loop). */
export function mergeTagLoopPillAttrs(loop: MergeTagLoopInsertParts, end: 'start' | 'end') {
  const raw = end === 'start' ? loop.startTag : loop.endTag;
  const body = stripMustacheDelimiters(raw);
  return {
    id: `loop:${loop.key}:${end}`,
    label: body,
    value: body,
  };
}

export function buildLoopMergeTagFallbackHtml(loop: MergeTagLoopInsertParts, bodyPlaceholderVisible: string): string {
  const start = mergeTagLoopPillAttrs(loop, 'start');
  const end = mergeTagLoopPillAttrs(loop, 'end');
  const open = `<span class="merge-tag-pill" data-merge-tag="${start.value}" data-merge-tag-id="${start.id}" data-merge-tag-label="${start.label}">{{${start.label}}}</span>`;
  const close = `<span class="merge-tag-pill" data-merge-tag="${end.value}" data-merge-tag-id="${end.id}" data-merge-tag-label="${end.label}">{{${end.label}}}</span>`;
  return `${open}${bodyPlaceholderVisible}${close}`;
}

/** ZWSP, legacy private-use scaffold, and untouched default loop-body hints. */
export function stripLoopScaffoldFromTiptapHtml(html: string): string {
  let out = (html || '').replace(/\u200b/g, '').replace(/&#x200b;|&#8203;/gi, '');
  /* Legacy templates with \uE000…\uE001 delimiters */
  out = out.replace(/\uE000[\s\S]*?\uE001/g, '');
  out = stripDefaultLoopBodiesBetweenMergePills(out);
  return out;
}
