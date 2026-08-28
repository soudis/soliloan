'use client';

import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { buildLoopMergeTagFallbackHtml } from '@/lib/templates/tiptap-merge-loop';
import { useEditorMetadata } from '../../editor-context';
import { useMergeTagConfig } from '../../merge-tag-context';
import { MergeTagDropdown } from '../../merge-tag-dropdown';
import { useEditorRegistry } from '../../user-components/tiptap/editor-registry';
import { TextAlignButtons } from '../settings/text-align-buttons';
import {
  DEFAULT_BODY_FONT_SIZE,
  DEFAULT_HEADER_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  resolveCellStyle,
  type TableCellStyle,
  type TextAlign,
} from '../table-model';
import { usePatchSelectedProps, usePuckAncestorLoops, useSelectedRecord } from '../use-puck-selected';

function parseCellId(cellId: string | undefined): { type: 'header' | 'cell'; row: number; col: number } | null {
  if (!cellId) return null;
  const headerMatch = cellId.match(/:h:(\d+)$/);
  if (headerMatch) return { type: 'header', row: 0, col: Number(headerMatch[1]) };
  const cellMatch = cellId.match(/:c:(\d+):(\d+)$/);
  if (cellMatch) return { type: 'cell', row: Number(cellMatch[1]), col: Number(cellMatch[2]) };
  return null;
}

export function TableCellStyleField() {
  const t = useTranslations('templates.editor.components.table');
  const tText = useTranslations('templates.editor.components.text');
  const tMerge = useTranslations('templates.editor.mergeTags');
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const patch = usePatchSelectedProps();
  const ancestorLoops = usePuckAncestorLoops(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const props = useSelectedRecord();
  const activeCellId = props._activeCellId as string | undefined;
  const textAlign = (props.textAlign as TextAlign) ?? 'left';
  const headerStyles = (props.headerStyles as TableCellStyle[] | undefined) ?? [];
  const cellStyles = (props.cellStyles as TableCellStyle[][] | undefined) ?? [];
  const editorData = useEditorRegistry(activeCellId ?? '');

  const parsed = useMemo(() => parseCellId(activeCellId), [activeCellId]);
  const current = parsed
    ? parsed.type === 'header'
      ? resolveCellStyle(headerStyles[parsed.col], true, textAlign)
      : resolveCellStyle(cellStyles[parsed.row]?.[parsed.col], false, textAlign)
    : null;

  const apply = (stylePatch: TableCellStyle) => {
    if (!parsed || !current) return;
    if (parsed.type === 'header') {
      const next = [...headerStyles];
      while (next.length <= parsed.col) next.push({});
      next[parsed.col] = { ...current, ...stylePatch };
      patch({ headerStyles: next });
      return;
    }
    const next = cellStyles.map((row) => [...row]);
    while (next.length <= parsed.row) next.push([]);
    const row = [...(next[parsed.row] ?? [])];
    while (row.length <= parsed.col) row.push({});
    row[parsed.col] = { ...current, ...stylePatch };
    next[parsed.row] = row;
    patch({ cellStyles: next });
  };

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const editor = editorData?.editor;
    if (!editor) {
      setDropdownOpen(false);
      return;
    }
    const pos = editorData?.lastSelection.current?.from ?? editor.state.selection.from;
    if ('startTag' in item) {
      const inserted = editor.chain().focus(pos).insertMergeTagLoop(item).run();
      if (!inserted) {
        editor.commands.insertContent(buildLoopMergeTagFallbackHtml(item, tMerge('loopBodyPlaceholder')));
      }
    } else {
      editor
        .chain()
        .focus(pos)
        .insertMergeTag({
          id: String(item.key),
          label: item.label,
          value: item.value.replace(/[{}]/g, ''),
        })
        .run();
    }
    if (editorData?.lastSelection) editorData.lastSelection.current = null;
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium">{t('selectedCellSettings')}</p>
        <p className="text-[11px] text-muted-foreground">
          {parsed
            ? parsed.type === 'header'
              ? t('selectedHeader', { column: parsed.col + 1 })
              : t('selectedCell', { row: parsed.row + 1, column: parsed.col + 1 })
            : t('noCellSelected')}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium" htmlFor="activeCellFontSize">
          {tText('fontSize')}
        </label>
        <input
          id="activeCellFontSize"
          type="number"
          min={8}
          max={72}
          disabled={!current}
          value={current?.fontSize ?? ''}
          onChange={(event) =>
            apply({
              fontSize:
                Number.parseInt(event.target.value, 10) ||
                (parsed?.type === 'header' ? DEFAULT_HEADER_FONT_SIZE : DEFAULT_BODY_FONT_SIZE),
            })
          }
          className="w-full rounded border px-2 py-1 text-sm disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium" htmlFor="activeCellColor">
          {tText('textColor')}
        </label>
        <input
          id="activeCellColor"
          type="color"
          disabled={!current}
          value={current?.color.startsWith('#') ? current.color : DEFAULT_TEXT_COLOR}
          onChange={(event) => apply({ color: event.target.value })}
          className="h-8 w-full rounded border p-0 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <p className="block text-xs font-medium">{tText('textAlign')}</p>
        <TextAlignButtons
          value={current?.textAlign}
          disabled={!current}
          onChange={(nextAlign) => apply({ textAlign: nextAlign })}
        />
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-[11px] text-muted-foreground">
          {activeCellId ? t('cellSelected') : t('clickCellHint')}
        </p>
        <button
          ref={buttonRef}
          type="button"
          disabled={!activeCellId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
              setDropdownOpen(true);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusCircle className="h-3 w-3" />
          {tText('insertPlaceholder')}
        </button>
      </div>

      {config && (
        <MergeTagDropdown
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          onSelect={handleMergeTagSelect}
          config={config}
          position={dropdownPos}
          insertionContext={{ ancestorLoopsInnermostFirst: ancestorLoops, dataset: editorMeta.dataset }}
        />
      )}
    </div>
  );
}
