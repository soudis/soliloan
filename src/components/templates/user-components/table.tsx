'use client';

import { useNode } from '@craftjs/core';
import { EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  PlusCircle,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';

import { useMergeTagConfig } from '../merge-tag-context';
import { MergeTagDropdown } from '../merge-tag-dropdown';
import { editorRegistry, useEditorRegistry } from './tiptap/editor-registry';
import { useTiptapEditor } from './tiptap/use-tiptap-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import './tiptap/tiptap.css';

type TextAlign = 'left' | 'center' | 'right' | 'justify';
type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

interface TableCellStyle {
  fontSize?: number;
  color?: string;
  textAlign?: TextAlign;
}

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
  { value: 'justify', icon: AlignJustify },
];

const BORDER_STYLE_OPTIONS: BorderStyle[] = ['solid', 'dashed', 'dotted', 'double'];
const DEFAULT_HEADER_FONT_SIZE = 13;
const DEFAULT_BODY_FONT_SIZE = 14;
const DEFAULT_TEXT_COLOR = '#000000';

interface TableProps {
  loopKey?: string;
  label?: string;
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
  _activeCellId?: string | null;
}

/** Props as they exist on the craft.js node (always have defaults populated) */
type ResolvedTableProps = {
  loopKey: string;
  label: string;
  columns: number;
  rows: number;
  headerTexts: string[];
  cellTexts: string[][];
  headerStyles: TableCellStyle[];
  cellStyles: TableCellStyle[][];
  columnWidths: number[];
  textAlign: TextAlign;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderColor: string;
  borderStyle: BorderStyle;
  borderWidth: number;
  _activeCellId?: string | null;
};

// Helper to resize a 1D array
const resizeArray = (arr: string[], newLength: number, defaultValue: string): string[] => {
  if (arr.length >= newLength) return arr.slice(0, newLength);
  return [...arr, ...Array(newLength - arr.length).fill(defaultValue)];
};

// Helper to resize a 2D array
const resize2DArray = (arr: string[][], newRows: number, newCols: number, defaultValue: string): string[][] => {
  const resized: string[][] = [];
  for (let r = 0; r < newRows; r++) {
    const existingRow = arr[r] || [];
    resized.push(resizeArray(existingRow, newCols, defaultValue));
  }
  return resized;
};

const getDefaultCellStyle = (isHeader: boolean, fallbackAlign: TextAlign): Required<TableCellStyle> => ({
  fontSize: isHeader ? DEFAULT_HEADER_FONT_SIZE : DEFAULT_BODY_FONT_SIZE,
  color: DEFAULT_TEXT_COLOR,
  textAlign: fallbackAlign,
});

const resolveCellStyle = (
  style: TableCellStyle | undefined,
  isHeader: boolean,
  fallbackAlign: TextAlign,
): Required<TableCellStyle> => {
  const defaults = getDefaultCellStyle(isHeader, fallbackAlign);
  return {
    fontSize: style?.fontSize ?? defaults.fontSize,
    color: style?.color ?? defaults.color,
    textAlign: style?.textAlign ?? defaults.textAlign,
  };
};

const resizeStyleArray = (
  arr: TableCellStyle[],
  newLength: number,
  isHeader: boolean,
  fallbackAlign: TextAlign,
): TableCellStyle[] => {
  if (arr.length >= newLength) return arr.slice(0, newLength);
  return [
    ...arr,
    ...Array.from({ length: newLength - arr.length }, () => getDefaultCellStyle(isHeader, fallbackAlign)),
  ];
};

const resize2DStyleArray = (
  arr: TableCellStyle[][],
  newRows: number,
  newCols: number,
  fallbackAlign: TextAlign,
): TableCellStyle[][] => {
  const resized: TableCellStyle[][] = [];
  for (let r = 0; r < newRows; r++) {
    const existingRow = arr[r] || [];
    resized.push(resizeStyleArray(existingRow, newCols, false, fallbackAlign));
  }
  return resized;
};

const resizeColumnWidths = (widths: number[], newLength: number, defaultWidth: number): number[] => {
  if (widths.length >= newLength) return widths.slice(0, newLength);
  return [...widths, ...Array(newLength - widths.length).fill(defaultWidth)];
};

const normalizeColumnWidths = (widths: number[] | undefined, columns: number): number[] => {
  if (columns <= 0) return [];
  const raw = Array.from({ length: columns }, (_, index) => {
    const value = Number(widths?.[index]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Array.from({ length: columns }, () => 100 / columns);
  }
  return raw.map((value) => (value / total) * 100);
};

const parseCellId = (cellId: string | null): { type: 'header' | 'cell'; row: number; col: number } | null => {
  if (!cellId) return null;
  const match = cellId.match(/:(h|c):(\d+)(?::(\d+))?$/);
  if (!match) return null;
  if (match[1] === 'h') {
    return { type: 'header', row: 0, col: Number(match[2]) };
  }
  return {
    type: 'cell',
    row: Number(match[2]),
    col: Number(match[3] ?? 0),
  };
};

const buildTableBorderStyle = ({
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderColor,
  borderStyle,
  borderWidth,
}: Pick<
  ResolvedTableProps,
  'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft' | 'borderColor' | 'borderStyle' | 'borderWidth'
>) => {
  const style: CSSProperties = {};
  if (borderTop) style.borderTop = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderRight) style.borderRight = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderBottom) style.borderBottom = `${borderWidth}px ${borderStyle} ${borderColor}`;
  if (borderLeft) style.borderLeft = `${borderWidth}px ${borderStyle} ${borderColor}`;
  return style;
};

const getBorderSideValue = (
  sides: Pick<ResolvedTableProps, 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft'>,
  side: 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft',
) => {
  switch (side) {
    case 'borderTop':
      return sides.borderTop;
    case 'borderRight':
      return sides.borderRight;
    case 'borderBottom':
      return sides.borderBottom;
    case 'borderLeft':
      return sides.borderLeft;
  }
};

const setBorderSideValue = (
  props: ResolvedTableProps,
  side: 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft',
  value: boolean,
) => {
  switch (side) {
    case 'borderTop':
      props.borderTop = value;
      return;
    case 'borderRight':
      props.borderRight = value;
      return;
    case 'borderBottom':
      props.borderBottom = value;
      return;
    case 'borderLeft':
      props.borderLeft = value;
      return;
  }
};

/**
 * Build a unique cell ID for the editor registry.
 * Format: "{nodeId}:h:{col}" for headers, "{nodeId}:c:{row}:{col}" for body cells.
 */
const buildCellId = (nodeId: string, type: 'header' | 'cell', row: number, col: number) => {
  return type === 'header' ? `${nodeId}:h:${col}` : `${nodeId}:c:${row}:${col}`;
};

// ─── TiptapCell ──────────────────────────────────────────────────────────────
// Each table cell is a full tiptap editor with bubble menu, merge tag support, etc.

interface TiptapCellProps {
  cellId: string;
  content: string;
  onChange: (html: string) => void;
  isHeader?: boolean;
  editable: boolean;
  onFocus: () => void;
  fontSize?: number;
  color?: string;
  textAlign?: TextAlign;
}

const TiptapCell = ({
  cellId,
  content,
  onChange,
  isHeader,
  editable,
  onFocus,
  fontSize = isHeader ? DEFAULT_HEADER_FONT_SIZE : DEFAULT_BODY_FONT_SIZE,
  color = DEFAULT_TEXT_COLOR,
  textAlign = 'left',
}: TiptapCellProps) => {
  const editor = useTiptapEditor({
    content,
    onUpdate: onChange,
    editable,
    color,
    fontSize,
  });

  const lastSelection = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (editor) {
      const updateSelection = () => {
        const { from, to } = editor.state.selection;
        lastSelection.current = { from, to };
      };
      const handleFocus = () => {
        updateSelection();
        onFocus();
      };

      editor.on('selectionUpdate', updateSelection);
      editor.on('blur', updateSelection);
      editor.on('focus', handleFocus);

      // Register in the global editor registry so the sidebar can access it
      editorRegistry.register(cellId, editor, lastSelection);

      return () => {
        editor.off('selectionUpdate', updateSelection);
        editor.off('blur', updateSelection);
        editor.off('focus', handleFocus);
        editorRegistry.unregister(cellId);
      };
    }
  }, [editor, cellId, onFocus]);

  return (
    <div
      className={`px-2 py-1.5 min-h-[1.5em] ${isHeader ? 'font-semibold' : ''}`}
      style={{ textAlign, color, fontSize }}
    >
      {editor && editable && (
        <BubbleMenu
          editor={editor}
          pluginKey={`bubbleMenu-${cellId}`}
          shouldShow={({ editor }) => !editor.state.selection.empty}
        >
          <div className="flex bg-zinc-900 text-white rounded-md shadow-lg border border-zinc-800 p-0.5 z-[1000] overflow-hidden">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                editor.isActive('bold') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                editor.isActive('italic') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                editor.isActive('underline') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
              }`}
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </BubbleMenu>
      )}

      <div
        className="w-full h-full"
        onKeyDown={(e) => {
          if (editable) e.stopPropagation();
        }}
        onMouseDown={(e) => {
          if (editable) e.stopPropagation();
        }}
        onPointerDown={(e) => {
          if (editable) e.stopPropagation();
        }}
        onClick={(e) => {
          if (editable) e.stopPropagation();
        }}
        onDragStart={(e) => {
          if (editable) e.stopPropagation();
        }}
        onDragEnd={(e) => {
          if (editable) e.stopPropagation();
        }}
        onDragOver={(e) => {
          if (editable) e.stopPropagation();
        }}
        onDrop={(e) => {
          if (editable) e.stopPropagation();
        }}
      >
        <EditorContent editor={editor} className="outline-none" />
      </div>
    </div>
  );
};

// ─── Table Component ─────────────────────────────────────────────────────────

export const Table = ({
  loopKey = '',
  label = '',
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
}: TableProps) => {
  const {
    connectors: { connect },
    selected,
    actions: { setProp },
    id: nodeId,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Track which cell was last focused so the sidebar knows which editor to target
  const [activeCellId, setActiveCellId] = useState<string | null>(null);

  // Store the active cell ID on the craft.js node custom data so the settings panel can read it
  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: needed
    setProp((props: any) => {
      props._activeCellId = activeCellId;
    });
  }, [activeCellId, setProp]);

  // When deselected, clear active cell
  useEffect(() => {
    if (!selected) {
      setActiveCellId(null);
    }
  }, [selected]);

  const isDynamic = loopKey.length > 0;
  const displayRows = isDynamic ? 1 : rows;
  const normalizedColumnWidths = useMemo(() => normalizeColumnWidths(columnWidths, columns), [columnWidths, columns]);
  const columnDescriptors = useMemo(
    () =>
      Array.from({ length: columns }, (_, colIdx) => ({
        id: buildCellId(nodeId, 'header', 0, colIdx),
        colIdx,
        width: normalizedColumnWidths[colIdx] ?? 100 / columns,
      })),
    [columns, nodeId, normalizedColumnWidths],
  );
  const showVerticalGrid = borderLeft || borderRight;
  const showHorizontalGrid = borderTop || borderBottom;
  const outerBorderStyle = buildTableBorderStyle({
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    borderColor,
    borderStyle,
    borderWidth,
  });

  const handleHeaderChange = useCallback(
    (colIdx: number, html: string) => {
      setProp((props: ResolvedTableProps) => {
        const newHeaders = [...props.headerTexts];
        newHeaders[colIdx] = html;
        props.headerTexts = newHeaders;
      });
    },
    [setProp],
  );

  const handleCellChange = useCallback(
    (rowIdx: number, colIdx: number, html: string) => {
      setProp((props: ResolvedTableProps) => {
        const newCells = props.cellTexts.map((row) => [...row]);
        if (!newCells[rowIdx]) newCells[rowIdx] = [];
        newCells[rowIdx][colIdx] = html;
        props.cellTexts = newCells;
      });
    },
    [setProp],
  );

  return (
    <div
      ref={(dom) => {
        if (dom) connect(dom);
      }}
      className={`my-4 rounded-md overflow-hidden ${selected ? 'outline outline-2 outline-blue-500' : ''}`}
    >
      {/* Loop indicator (only shown for dynamic tables) */}
      {isDynamic && (
        <div className="bg-zinc-100 px-3 py-1 text-[10px] font-mono text-zinc-500 flex justify-between items-center border-b border-zinc-200">
          <span>
            {'{{#'}
            {loopKey}
            {'}}'}
          </span>
          <span className="font-sans font-bold uppercase tracking-wider">{label || loopKey}</span>
        </div>
      )}

      {/* Table */}
      <table className="w-full border-collapse table-fixed" style={outerBorderStyle}>
        <colgroup>
          {columnDescriptors.map((column) => (
            <col
              key={column.id}
              style={{
                width: `${column.width}%`,
              }}
            />
          ))}
        </colgroup>
        {/* Header */}
        <thead>
          <tr className="bg-zinc-50">
            {columnDescriptors.map((column) => {
              const cellStyle = resolveCellStyle(headerStyles[column.colIdx], true, textAlign);
              const thStyle: CSSProperties = {
                width: `${column.width}%`,
              };
              if (showVerticalGrid && column.colIdx < columns - 1) {
                thStyle.borderRight = `${borderWidth}px ${borderStyle} ${borderColor}`;
              }
              if (showHorizontalGrid) {
                thStyle.borderBottom = `${borderWidth}px ${borderStyle} ${borderColor}`;
              }
              return (
                <th key={column.id} className="align-top" style={thStyle}>
                  <TiptapCell
                    cellId={column.id}
                    content={headerTexts[column.colIdx] ?? ''}
                    onChange={(html) => handleHeaderChange(column.colIdx, html)}
                    isHeader
                    editable={selected}
                    onFocus={() => setActiveCellId(column.id)}
                    fontSize={cellStyle.fontSize}
                    color={cellStyle.color}
                    textAlign={cellStyle.textAlign}
                  />
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body rows */}
        <tbody>
          {Array.from({ length: displayRows }).map((_, rowIdx) => (
            <tr
              key={`row-${
                // biome-ignore lint/suspicious/noArrayIndexKey: needed
                rowIdx
              }`}
            >
              {Array.from({ length: columns }).map((_, colIdx) => {
                const cellId = buildCellId(nodeId, 'cell', rowIdx, colIdx);
                const cellStyle = resolveCellStyle(cellStyles[rowIdx]?.[colIdx], false, textAlign);
                const tdStyle: CSSProperties = {
                  width: `${normalizedColumnWidths[colIdx] ?? 100 / columns}%`,
                };
                if (showVerticalGrid && colIdx < columns - 1) {
                  tdStyle.borderRight = `${borderWidth}px ${borderStyle} ${borderColor}`;
                }
                if (showHorizontalGrid && rowIdx < displayRows - 1) {
                  tdStyle.borderBottom = `${borderWidth}px ${borderStyle} ${borderColor}`;
                }
                return (
                  <td key={cellId} className="align-top" style={tdStyle}>
                    <TiptapCell
                      cellId={cellId}
                      content={cellTexts[rowIdx]?.[colIdx] ?? ''}
                      onChange={(html) => handleCellChange(rowIdx, colIdx, html)}
                      editable={selected}
                      onFocus={() => setActiveCellId(cellId)}
                      fontSize={cellStyle.fontSize}
                      color={cellStyle.color}
                      textAlign={cellStyle.textAlign}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Loop end indicator */}
      {isDynamic && (
        <div className="bg-zinc-100 px-3 py-1 text-[10px] font-mono text-zinc-500 border-t border-zinc-200 text-right">
          <span>
            {'{{/'}
            {loopKey}
            {'}}'}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── TableSettings (Sidebar) ──────────────────────────────────────────────────

export const TableSettings = () => {
  const t = useTranslations('templates.editor.components.table');
  const tText = useTranslations('templates.editor.components.text');
  const config = useMergeTagConfig();

  const {
    actions: { setProp },
    loopKey,
    label,
    columns,
    rows,
    headerStyles,
    cellStyles,
    columnWidths,
    textAlign,
    activeCellId,
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    borderColor,
    borderStyle,
    borderWidth,
  } = useNode((node) => ({
    loopKey: node.data.props.loopKey as string,
    label: node.data.props.label as string,
    columns: node.data.props.columns as number,
    rows: node.data.props.rows as number,
    headerStyles: (node.data.props.headerStyles as TableCellStyle[]) ?? [],
    cellStyles: (node.data.props.cellStyles as TableCellStyle[][]) ?? [],
    columnWidths: (node.data.props.columnWidths as number[]) ?? [],
    textAlign: (node.data.props.textAlign as TextAlign) ?? 'left',
    activeCellId: (node.data.props._activeCellId as string | null) ?? null,
    borderTop: node.data.props.borderTop !== false,
    borderRight: node.data.props.borderRight !== false,
    borderBottom: node.data.props.borderBottom !== false,
    borderLeft: node.data.props.borderLeft !== false,
    borderColor: (node.data.props.borderColor as string) ?? '#e4e4e7',
    borderStyle: (node.data.props.borderStyle as BorderStyle) ?? 'solid',
    borderWidth: (node.data.props.borderWidth as number) ?? 1,
  }));

  const isDynamic = loopKey.length > 0;
  const availableLoops = config?.loops ?? [];
  const activeCell = parseCellId(activeCellId);
  const activeCellStyle = activeCell
    ? activeCell.type === 'header'
      ? resolveCellStyle(headerStyles[activeCell.col], true, textAlign)
      : resolveCellStyle(cellStyles[activeCell.row]?.[activeCell.col], false, textAlign)
    : null;
  const normalizedColumnWidths = useMemo(() => normalizeColumnWidths(columnWidths, columns), [columnWidths, columns]);
  const columnWidthControls = useMemo(
    () =>
      Array.from({ length: columns }, (_, colIdx) => ({
        id: `column-width-${colIdx + 1}`,
        inputId: `columnWidth-${colIdx}`,
        colIdx,
        value: Number((columnWidths[colIdx] ?? normalizedColumnWidths[colIdx] ?? 0).toFixed(2)),
      })),
    [columnWidths, columns, normalizedColumnWidths],
  );

  // Get the active cell's editor from the registry
  const registryData = useEditorRegistry(activeCellId ?? '');
  const activeEditor = registryData?.editor || null;
  const lastSelection = registryData?.lastSelection || { current: null };

  // Merge tag dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLoopKeyChange = (newKey: string) => {
    setProp((props: ResolvedTableProps) => {
      props.loopKey = newKey;
      if (newKey) {
        const loop = availableLoops.find((l) => l.key === newKey);
        if (loop) {
          props.label = loop.label;
        }
      }
    });
  };

  const handleColumnsChange = (newCols: number) => {
    if (newCols < 1 || newCols > 10) return;
    setProp((props: ResolvedTableProps) => {
      props.columns = newCols;
      props.headerTexts = resizeArray(props.headerTexts, newCols, t('defaultHeader'));
      props.cellTexts = resize2DArray(props.cellTexts, props.rows, newCols, '');
      props.headerStyles = resizeStyleArray(props.headerStyles ?? [], newCols, true, props.textAlign);
      props.cellStyles = resize2DStyleArray(props.cellStyles ?? [], props.rows, newCols, props.textAlign);
      props.columnWidths = resizeColumnWidths(props.columnWidths ?? [], newCols, 100 / newCols);
    });
  };

  const handleRowsChange = (newRows: number) => {
    if (newRows < 1 || newRows > 50) return;
    setProp((props: ResolvedTableProps) => {
      props.rows = newRows;
      props.cellTexts = resize2DArray(props.cellTexts, newRows, props.columns, '');
      props.cellStyles = resize2DStyleArray(props.cellStyles ?? [], newRows, props.columns, props.textAlign);
    });
  };

  const updateActiveCellStyle = (updates: Partial<TableCellStyle>) => {
    if (!activeCell) return;
    setProp((props: ResolvedTableProps) => {
      if (activeCell.type === 'header') {
        const nextHeaderStyles = resizeStyleArray(props.headerStyles ?? [], props.columns, true, props.textAlign);
        nextHeaderStyles[activeCell.col] = {
          ...resolveCellStyle(nextHeaderStyles[activeCell.col], true, props.textAlign),
          ...updates,
        };
        props.headerStyles = nextHeaderStyles;
        return;
      }

      const nextCellStyles = resize2DStyleArray(props.cellStyles ?? [], props.rows, props.columns, props.textAlign);
      nextCellStyles[activeCell.row][activeCell.col] = {
        ...resolveCellStyle(nextCellStyles[activeCell.row][activeCell.col], false, props.textAlign),
        ...updates,
      };
      props.cellStyles = nextCellStyles;
    });
  };

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const mergeTag = {
      id: String('id' in item ? item.id : item.key),
      label: item.label,
      value: ('startTag' in item ? item.startTag : item.value).replace(/[{}]/g, ''),
    };

    if (activeEditor) {
      const pos = lastSelection.current?.from ?? activeEditor.state.selection.from;

      if ('insertMergeTag' in activeEditor.commands) {
        activeEditor.chain().focus(pos).insertMergeTag(mergeTag).run();
      } else {
        const mergeTagHtml = `<span data-merge-tag="${mergeTag.value}" data-merge-tag-id="${mergeTag.id}" data-merge-tag-label="${mergeTag.label}" class="merge-tag-pill">${mergeTag.label}</span>`;
        activeEditor.chain().focus(pos).insertContent(mergeTagHtml).run();
      }

      lastSelection.current = null;
    }
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="data">
        <TabsList variant="modern" className="mt-0">
          <TabsTrigger variant="modern" size="sm" value="data">
            {t('tabData')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="structure">
            {t('tabStructure')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="style">
            {t('tabStyle')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="cell">
            {t('tabCell')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="loopKey">
              {t('loopKey')}
            </label>
            <select
              id="loopKey"
              value={loopKey}
              onChange={(e) => handleLoopKeyChange(e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm bg-white"
            >
              <option value="">{t('staticTable')}</option>
              {availableLoops.map((loop) => (
                <option key={loop.key} value={loop.key}>
                  {loop.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">{isDynamic ? t('dynamicHint') : t('staticHint')}</p>
          </div>

          {isDynamic && (
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="label">
                {t('displayName')}
              </label>
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) =>
                  setProp((props: ResolvedTableProps) => {
                    props.label = e.target.value;
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="structure" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="columns">
              {t('columns')}
            </label>
            <input
              id="columns"
              type="number"
              min={1}
              max={10}
              value={columns}
              onChange={(e) => handleColumnsChange(Number(e.target.value))}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>

          {!isDynamic && (
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="rows">
                {t('rows')}
              </label>
              <input
                id="rows"
                type="number"
                min={1}
                max={50}
                value={rows}
                onChange={(e) => handleRowsChange(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium">{t('columnWidths')}</p>
            <div className="grid grid-cols-2 gap-2">
              {columnWidthControls.map((column) => (
                <div key={column.id} className="space-y-1">
                  <label className="text-[11px] text-zinc-600" htmlFor={column.inputId}>
                    {t('columnWidthLabel', { column: column.colIdx + 1 })}
                  </label>
                  <input
                    id={column.inputId}
                    type="number"
                    min={1}
                    step={0.1}
                    value={column.value}
                    onChange={(e) =>
                      setProp((props: ResolvedTableProps) => {
                        const nextWidths = resizeColumnWidths(
                          props.columnWidths ?? [],
                          props.columns,
                          100 / props.columns,
                        );
                        nextWidths[column.colIdx] = Math.max(1, Number(e.target.value) || 1);
                        props.columnWidths = nextWidths;
                      })
                    }
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t('columnWidthHint')}</p>
          </div>
        </TabsContent>

        <TabsContent value="style" className="mt-3 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium">{t('border')}</p>
            <div className="flex flex-wrap gap-2">
              {(['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const).map((side) => (
                <label key={side} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={getBorderSideValue({ borderTop, borderRight, borderBottom, borderLeft }, side)}
                    onChange={(e) =>
                      setProp((props: ResolvedTableProps) => {
                        setBorderSideValue(props, side, e.target.checked);
                      })
                    }
                    className="rounded border-zinc-300"
                  />
                  {t(side)}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-600" htmlFor="tableBorderColor">
                  {t('borderColor')}
                </label>
                <input
                  id="tableBorderColor"
                  type="color"
                  value={borderColor}
                  onChange={(e) =>
                    setProp((props: ResolvedTableProps) => {
                      props.borderColor = e.target.value;
                    })
                  }
                  className="w-full h-7 rounded border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-600" htmlFor="tableBorderWidth">
                  {t('borderWidth')}
                </label>
                <input
                  id="tableBorderWidth"
                  type="number"
                  min={1}
                  max={20}
                  value={borderWidth}
                  onChange={(e) =>
                    setProp((props: ResolvedTableProps) => {
                      props.borderWidth = Math.max(1, Number(e.target.value) || 1);
                    })
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-600" htmlFor="tableBorderStyle">
                {t('borderStyle')}
              </label>
              <select
                id="tableBorderStyle"
                value={borderStyle}
                onChange={(e) =>
                  setProp((props: ResolvedTableProps) => {
                    props.borderStyle = e.target.value as BorderStyle;
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm"
              >
                {BORDER_STYLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`borderStyle_${option}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cell" className="mt-3 space-y-4">
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-medium">{t('selectedCellSettings')}</p>
              <p className="text-[11px] text-muted-foreground">
                {activeCell
                  ? activeCell.type === 'header'
                    ? t('selectedHeader', { column: activeCell.col + 1 })
                    : t('selectedCell', { row: activeCell.row + 1, column: activeCell.col + 1 })
                  : t('noCellSelected')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium block" htmlFor="activeCellFontSize">
                {tText('fontSize')}
              </label>
              <input
                id="activeCellFontSize"
                type="number"
                min={8}
                max={72}
                disabled={!activeCellStyle}
                value={activeCellStyle?.fontSize ?? ''}
                onChange={(e) =>
                  updateActiveCellStyle({
                    fontSize:
                      Number.parseInt(e.target.value, 10) ||
                      (activeCell?.type === 'header' ? DEFAULT_HEADER_FONT_SIZE : DEFAULT_BODY_FONT_SIZE),
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium block" htmlFor="activeCellColor">
                {tText('textColor')}
              </label>
              <input
                id="activeCellColor"
                type="color"
                disabled={!activeCellStyle}
                value={activeCellStyle?.color ?? DEFAULT_TEXT_COLOR}
                onChange={(e) => updateActiveCellStyle({ color: e.target.value })}
                className="w-full h-8 p-0 border rounded disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium block">{tText('textAlign')}</p>
              <div className="flex gap-1">
                {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!activeCellStyle}
                    onClick={() => updateActiveCellStyle({ textAlign: value })}
                    className={`flex items-center justify-center p-2 rounded-md border transition-colors disabled:opacity-50 ${
                      activeCellStyle?.textAlign === value
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-[11px] text-muted-foreground mb-2">
              {activeCellId ? t('cellSelected') : t('clickCellHint')}
            </p>
            <button
              ref={buttonRef}
              type="button"
              disabled={!activeCellId}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                const rect = buttonRef.current?.getBoundingClientRect();
                if (rect) {
                  setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
                  setDropdownOpen(true);
                }
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-3 h-3" />
              {tText('insertPlaceholder')}
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {config && (
        <MergeTagDropdown
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          onSelect={handleMergeTagSelect}
          config={config}
          position={dropdownPos}
        />
      )}
    </div>
  );
};

const DEFAULT_COLUMNS = 3;
const DEFAULT_HEADERS = ['Spalte 1', 'Spalte 2', 'Spalte 3'];
const DEFAULT_CELLS = [['', '', '']];
const DEFAULT_COLUMN_WIDTHS = [1, 1, 1];
const DEFAULT_HEADER_STYLES = [
  getDefaultCellStyle(true, 'left'),
  getDefaultCellStyle(true, 'left'),
  getDefaultCellStyle(true, 'left'),
];
const DEFAULT_CELL_STYLES = [[
  getDefaultCellStyle(false, 'left'),
  getDefaultCellStyle(false, 'left'),
  getDefaultCellStyle(false, 'left'),
]];

Table.craft = {
  props: {
    loopKey: '',
    label: '',
    columns: DEFAULT_COLUMNS,
    rows: 1,
    headerTexts: DEFAULT_HEADERS,
    cellTexts: DEFAULT_CELLS,
    headerStyles: DEFAULT_HEADER_STYLES,
    cellStyles: DEFAULT_CELL_STYLES,
    columnWidths: DEFAULT_COLUMN_WIDTHS,
    textAlign: 'left' as TextAlign,
    borderTop: true,
    borderRight: true,
    borderBottom: true,
    borderLeft: true,
    borderColor: '#e4e4e7',
    borderStyle: 'solid' as BorderStyle,
    borderWidth: 1,
    _activeCellId: null,
  },
  related: {
    settings: TableSettings,
  },
};
