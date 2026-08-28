'use client';

import { EditorContent } from '@tiptap/react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BorderStyle } from '@/lib/templates/border-utils';
import { paddingPropsToReactStyle } from '@/lib/templates/padding-utils';
import { editorRegistry } from '../../user-components/tiptap/editor-registry';
import { TemplateTiptapBubbleMenu } from '../../user-components/tiptap/template-tiptap-bubble-menu';
import { useTiptapEditor } from '../../user-components/tiptap/use-tiptap-editor';
import '../../user-components/tiptap/tiptap.css';
import { normalizeColumnWidths, resolveCellStyle, type TableCellStyle, type TextAlign } from '../table-model';
import { usePatchComponentById } from '../use-puck-selected';
import { useTemplatePuck } from '../use-template-puck';
import { LoopRibbon, LoopRibbonEnd } from './loop-ribbon';

export type TableBlockProps = {
  id?: string;
  loopKey?: string;
  columns?: number;
  rows?: number;
  headerTexts?: string[];
  cellTexts?: string[][];
  headerStyles?: TableCellStyle[];
  cellStyles?: TableCellStyle[][];
  columnWidths?: number[];
  textAlign?: TextAlign;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderColor?: string;
  borderStyle?: BorderStyle;
  borderWidth?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  displayName?: string;
};

function TiptapCell({
  cellId,
  content,
  onChange,
  isHeader,
  editable,
  selected,
  onActivate,
  fontSize,
  color,
  textAlign,
}: {
  cellId: string;
  content: string;
  onChange: (html: string) => void;
  isHeader?: boolean;
  editable: boolean;
  selected: boolean;
  onActivate: () => void;
  fontSize: number;
  color: string;
  textAlign: TextAlign;
}) {
  const editor = useTiptapEditor({
    content,
    onUpdate: onChange,
    editable,
    color,
    fontSize,
  });
  const lastSelection = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      lastSelection.current = { from, to };
    };
    const handleFocus = () => {
      updateSelection();
      onActivate();
    };
    editor.on('selectionUpdate', updateSelection);
    editor.on('blur', updateSelection);
    editor.on('focus', handleFocus);
    editorRegistry.register(cellId, editor, lastSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('blur', updateSelection);
      editor.off('focus', handleFocus);
      editorRegistry.unregister(cellId);
    };
  }, [cellId, editor, onActivate]);

  const stopCanvasDrag = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`template-table-cell min-h-[1.5em] px-2 py-1.5 ${isHeader ? 'font-semibold' : ''} ${
        selected ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''
      }`}
      style={{ textAlign, color, fontSize }}
    >
      {editor && editable && <TemplateTiptapBubbleMenu editor={editor} pluginKey={`bubbleMenu-${cellId}`} dense />}
      <div
        className="h-full w-full"
        onKeyDown={stopCanvasDrag}
        onMouseDown={(event) => {
          stopCanvasDrag(event);
          onActivate();
        }}
        onPointerDown={(event) => {
          stopCanvasDrag(event);
          onActivate();
        }}
        onClick={stopCanvasDrag}
      >
        <EditorContent editor={editor} className="outline-none" />
      </div>
    </div>
  );
}

export function TableBlock({
  id,
  loopKey = '',
  columns = 3,
  rows = 1,
  headerTexts = ['Spalte 1', 'Spalte 2', 'Spalte 3'],
  cellTexts = [['', '', '']],
  headerStyles = [],
  cellStyles = [],
  columnWidths = [],
  textAlign = 'left',
  borderTop = true,
  borderRight = true,
  borderBottom = true,
  borderLeft = true,
  borderColor = '#e4e4e7',
  borderStyle = 'solid',
  borderWidth = 1,
  padding = 0,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  displayName,
}: TableBlockProps) {
  const selectedId = useTemplatePuck((state) => state.selectedItem?.props.id as string | undefined);
  const activeCellId = useTemplatePuck((state) => {
    const item = state.selectedItem;
    if (!item || item.props.id !== id) return undefined;
    return (item.props as Record<string, unknown>)._activeCellId as string | undefined;
  });
  const patch = usePatchComponentById(id);
  const tableSelected = selectedId === id;
  const widths = normalizeColumnWidths(columnWidths, columns);
  const paddingStyle = paddingPropsToReactStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft });
  const showVerticalGrid = borderLeft || borderRight;
  const showHorizontalGrid = borderTop || borderBottom;
  const isDynamic = loopKey.trim().length > 0;
  const tableOuterBorder: CSSProperties = {};
  if (borderTop) tableOuterBorder.borderTop = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderRight) tableOuterBorder.borderRight = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderBottom) tableOuterBorder.borderBottom = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderLeft) tableOuterBorder.borderLeft = `${borderWidth}px ${borderStyle} ${borderColor}`;

  const cellGridStyle = (col: number, row: number, isHeader: boolean): CSSProperties => {
    const style: CSSProperties = { padding: 0 };
    if (showVerticalGrid && col < columns - 1) {
      style.borderRight = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }
    if (showHorizontalGrid && (isHeader || isDynamic || row < rows - 1)) {
      style.borderBottom = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }
    return style;
  };

  const activateCell = useCallback(
    (cellId: string) => {
      if (tableSelected && activeCellId === cellId) return;
      patch({ _activeCellId: cellId }, { select: true });
    },
    [activeCellId, patch, tableSelected],
  );

  const updateHeader = useCallback(
    (col: number, html: string) => {
      const next = [...headerTexts];
      next[col] = html;
      patch({ headerTexts: next, _activeCellId: `${id}:h:${col}` }, { select: true });
    },
    [headerTexts, id, patch],
  );

  const updateCell = useCallback(
    (row: number, col: number, html: string) => {
      const next = cellTexts.map((existing) => [...existing]);
      if (!next[row]) next[row] = [];
      next[row][col] = html;
      patch({ cellTexts: next, _activeCellId: `${id}:c:${row}:${col}` }, { select: true });
    },
    [cellTexts, id, patch],
  );

  const headerKeys = useMemo(
    () => Array.from({ length: columns }, (_, index) => `${id}-h-${columns}-${index}`),
    [columns, id],
  );
  const rowKeys = useMemo(() => Array.from({ length: rows }, (_, index) => `${id}-r-${rows}-${index}`), [id, rows]);

  const table = (
    <div style={{ width: '100%', boxSizing: 'border-box', ...paddingStyle }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', ...tableOuterBorder }}>
        <colgroup>
          {headerKeys.map((key, index) => (
            <col key={key} style={{ width: `${widths[index]}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {headerKeys.map((key, col) => {
              const style = resolveCellStyle(headerStyles[col], true, textAlign);
              const cellId = `${id}:h:${col}`;
              return (
                <th key={key} style={{ ...cellGridStyle(col, 0, true), background: '#f4f4f5' }}>
                  <TiptapCell
                    cellId={cellId}
                    content={headerTexts[col] ?? ''}
                    onChange={(html) => updateHeader(col, html)}
                    isHeader
                    editable
                    selected={activeCellId === cellId}
                    onActivate={() => activateCell(cellId)}
                    fontSize={style.fontSize}
                    color={style.color}
                    textAlign={style.textAlign}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((rowKey, row) => (
            <tr key={rowKey}>
              {headerKeys.map((headerKey, col) => {
                const style = resolveCellStyle(cellStyles[row]?.[col], false, textAlign);
                const cellId = `${id}:c:${row}:${col}`;
                return (
                  <td key={`${rowKey}-${headerKey}`} style={cellGridStyle(col, row, false)}>
                    <TiptapCell
                      cellId={cellId}
                      content={cellTexts[row]?.[col] ?? ''}
                      onChange={(html) => updateCell(row, col, html)}
                      editable
                      selected={activeCellId === cellId}
                      onActivate={() => activateCell(cellId)}
                      fontSize={style.fontSize}
                      color={style.color}
                      textAlign={style.textAlign}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!loopKey.trim()) return table;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-md">
      <LoopRibbon loopKey={loopKey} label={displayName} />
      {table}
      <LoopRibbonEnd loopKey={loopKey} />
    </div>
  );
}
