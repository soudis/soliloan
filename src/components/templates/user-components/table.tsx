'use client';

import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { useNode } from '@craftjs/core';
import { EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, PlusCircle, Underline as UnderlineIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMergeTagConfig } from '../merge-tag-context';
import { MergeTagDropdown } from '../merge-tag-dropdown';
import { editorRegistry, useEditorRegistry } from './tiptap/editor-registry';
import { useTiptapEditor } from './tiptap/use-tiptap-editor';
import './tiptap/tiptap.css';

type TextAlign = 'left' | 'center' | 'right' | 'justify';

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
  { value: 'justify', icon: AlignJustify },
];

interface TableProps {
  loopKey?: string;
  label?: string;
  columns?: number;
  rows?: number;
  headerTexts?: string[];
  cellTexts?: string[][];
  textAlign?: TextAlign;
}

/** Props as they exist on the craft.js node (always have defaults populated) */
type ResolvedTableProps = Required<TableProps>;

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
  textAlign?: TextAlign;
}

const TiptapCell = ({ cellId, content, onChange, isHeader, editable, onFocus, textAlign = 'left' }: TiptapCellProps) => {
  const editor = useTiptapEditor({
    content,
    onUpdate: onChange,
    editable,
    color: '#000000',
    fontSize: isHeader ? 13 : 14,
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
      className={`px-2 py-1.5 min-h-[1.5em] text-sm ${isHeader ? 'font-semibold' : ''}`}
      style={{ textAlign }}
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
  textAlign = 'left',
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
      className={`my-4 border rounded-md overflow-hidden ${selected ? 'outline outline-2 outline-blue-500' : ''}`}
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
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            {Array.from({ length: columns }).map((_, colIdx) => {
              const cellId = buildCellId(nodeId, 'header', 0, colIdx);
              return (
                <th
                  key={cellId}
                  className="border-r border-zinc-200 last:border-r-0 text-left"
                >
                  <TiptapCell
                    cellId={cellId}
                    content={headerTexts[colIdx] ?? ''}
                    onChange={(html) => handleHeaderChange(colIdx, html)}
                    isHeader
                    editable={selected}
                    onFocus={() => setActiveCellId(cellId)}
                    textAlign={textAlign}
                  />
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body rows */}
        <tbody>
          {Array.from({ length: displayRows }).map((_, rowIdx) => (
            <tr key={`row-${rowIdx}`} className="border-b border-zinc-200 last:border-b-0">
              {Array.from({ length: columns }).map((_, colIdx) => {
                const cellId = buildCellId(nodeId, 'cell', rowIdx, colIdx);
                return (
                  <td
                    key={cellId}
                    className="border-r border-zinc-200 last:border-r-0"
                  >
                    <TiptapCell
                      cellId={cellId}
                      content={cellTexts[rowIdx]?.[colIdx] ?? ''}
                      onChange={(html) => handleCellChange(rowIdx, colIdx, html)}
                      editable={selected}
                      onFocus={() => setActiveCellId(cellId)}
                      textAlign={textAlign}
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
    textAlign,
    activeCellId,
    nodeId,
  } = useNode((node) => ({
    loopKey: node.data.props.loopKey as string,
    label: node.data.props.label as string,
    columns: node.data.props.columns as number,
    rows: node.data.props.rows as number,
    textAlign: (node.data.props.textAlign as TextAlign) ?? 'left',
    activeCellId: (node.data.props._activeCellId as string | null) ?? null,
    nodeId: node.id,
  }));

  const isDynamic = loopKey.length > 0;
  const availableLoops = config?.loops ?? [];

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
    });
  };

  const handleRowsChange = (newRows: number) => {
    if (newRows < 1 || newRows > 50) return;
    setProp((props: ResolvedTableProps) => {
      props.rows = newRows;
      props.cellTexts = resize2DArray(props.cellTexts, newRows, props.columns, '');
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
      {/* Data source selector */}
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
        <p className="text-[11px] text-muted-foreground">
          {isDynamic ? t('dynamicHint') : t('staticHint')}
        </p>
      </div>

      {/* Display name (only for dynamic) */}
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

      {/* Columns */}
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

      {/* Rows (only for static tables) */}
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

      {/* Text alignment */}
      <div className="space-y-2">
        <label className="text-xs font-medium">{tText('textAlign')}</label>
        <div className="flex gap-1">
          {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setProp((props: ResolvedTableProps & { textAlign: TextAlign }) => {
                  props.textAlign = value;
                })
              }
              className={`flex items-center justify-center p-2 rounded-md border transition-colors ${
                textAlign === value
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Insert placeholder / merge tag (targets the focused cell) */}
      <div className="pt-4 border-t">
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

Table.craft = {
  props: {
    loopKey: '',
    label: '',
    columns: DEFAULT_COLUMNS,
    rows: 1,
    headerTexts: DEFAULT_HEADERS,
    cellTexts: DEFAULT_CELLS,
    textAlign: 'left' as TextAlign,
    _activeCellId: null,
  },
  related: {
    settings: TableSettings,
  },
};
