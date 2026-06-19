'use client';

import { useNode } from '@craftjs/core';
import { EditorContent } from '@tiptap/react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { buildLoopMergeTagFallbackHtml } from '@/lib/templates/tiptap-merge-loop';
import { useEditorMetadata } from '../editor-context';
import { useMergeTagConfig } from '../merge-tag-context';
import { MergeTagDropdown } from '../merge-tag-dropdown';
import { useMergeTagInsertionLoops } from '../use-merge-tag-insertion-loops';
import { editorRegistry, useEditorRegistry } from './tiptap/editor-registry';
import { TemplateTiptapBubbleMenu } from './tiptap/template-tiptap-bubble-menu';
import { TextEditorProvider } from './tiptap/text-editor-context';
import { useTiptapEditor } from './tiptap/use-tiptap-editor';
import './tiptap/tiptap.css';

type TextAlign = 'left' | 'center' | 'right' | 'justify';

interface TextProps {
  text: string;
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

export const Text = ({ text, fontSize = 16, color = '#000000', textAlign = 'left' }: TextProps) => {
  const {
    actions: { setProp },
    selected,
    id,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const [editable, setEditable] = useState(false);

  const editor = useTiptapEditor({
    content: text,
    onUpdate: (html) =>
      setProp((props: TextProps) => {
        props.text = html;
      }),
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
      editor.on('selectionUpdate', updateSelection);
      editor.on('blur', updateSelection);
      editor.on('focus', updateSelection);

      // Register editor for external access (Settings Panel)
      editorRegistry.register(id, editor, lastSelection);

      return () => {
        editor.off('selectionUpdate', updateSelection);
        editor.off('blur', updateSelection);
        editor.off('focus', updateSelection);
        editorRegistry.unregister(id);
      };
    }
  }, [editor, id]);

  // Automatically enter edit mode when selected, and exit when deselected
  useEffect(() => {
    setEditable(selected);
  }, [selected]);

  return (
    <TextEditorProvider value={{ editor, lastSelection }}>
      <div
        data-node-id={id}
        style={{
          fontSize: `${fontSize}px`,
          color,
          textAlign,
        }}
        className={`relative w-full min-h-[1em] group ${selected ? 'outline-1 outline-blue-500' : ''}`}
      >
        {editor && <TemplateTiptapBubbleMenu editor={editor} pluginKey="bubbleMenu" />}

        {/* Editor content - captures mouse events when selected/editable */}
        <div
          className="w-full h-full"
          onKeyDown={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onMouseDown={(e) => {
            if (editable) {
              // Stop Craft.js from intercepting clicks for drag-and-drop
              e.stopPropagation();
            }
          }}
          onPointerDown={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onClick={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onDragStart={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onDragEnd={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onDragOver={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
          onDrop={(e) => {
            if (editable) {
              e.stopPropagation();
            }
          }}
        >
          <EditorContent key={id} editor={editor} className="outline-none" />
        </div>
      </div>
    </TextEditorProvider>
  );
};

export const TextSettings = () => {
  const t = useTranslations('templates.editor.components.text');
  const tTpl = useTranslations('templates.editor');
  const editorMeta = useEditorMetadata();

  const {
    actions: { setProp },
    fontSize,
    color,
    textAlign,
    id,
  } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
    color: node.data.props.color,
    textAlign: (node.data.props.textAlign as TextAlign) ?? 'left',
    text: node.data.props.text,
    id: node.id,
  }));

  const ancestorLoopsInnermostFirst = useMergeTagInsertionLoops(id, false);

  // Get editor instance from registry since we are in a different React tree (Sidebar)
  const registryData = useEditorRegistry(id);
  const editor = registryData?.editor || null;
  const lastSelection = registryData?.lastSelection || { current: null };

  const config = useMergeTagConfig();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const isLoopItem = (it: MergeTagField | MergeTagLoop): it is MergeTagLoop => 'startTag' in it && 'endTag' in it;

    if (editor) {
      const pos = lastSelection.current?.from ?? editor.state.selection.from;

      if (isLoopItem(item)) {
        if ('insertMergeTagLoop' in editor.commands) {
          editor.chain().focus(pos).insertMergeTagLoop(item).run();
        } else {
          editor
            .chain()
            .focus(pos)
            .insertContent(buildLoopMergeTagFallbackHtml(item, tTpl('mergeTags.loopBodyPlaceholder')))
            .run();
        }
      } else {
        const mergeTag = {
          id: String(item.key),
          label: item.label,
          value: item.value.replace(/\{\{|\}\}/g, ''),
        };
        if ('insertMergeTag' in editor.commands) {
          editor.chain().focus(pos).insertMergeTag(mergeTag).run();
        } else {
          const mergeTagHtml = `<span data-merge-tag="${mergeTag.value}" data-merge-tag-id="${mergeTag.id}" data-merge-tag-label="${mergeTag.label}" class="merge-tag-pill">${mergeTag.label}</span>`;
          editor.chain().focus(pos).insertContent(mergeTagHtml).run();
        }
      }

      lastSelection.current = null;
    } else {
      setProp((props: TextProps) => {
        const append = isLoopItem(item)
          ? buildLoopMergeTagFallbackHtml(item, tTpl('mergeTags.loopBodyPlaceholder'))
          : `<span data-merge-tag="${item.value.replace(/\{\{|\}\}/g, '')}" data-merge-tag-id="${String(item.key)}" data-merge-tag-label="${item.label}" class="merge-tag-pill">${item.label}</span>`;
        props.text = props.text ? `${props.text}${append}` : append;
      });
    }
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium block" htmlFor="fontSize">
          {t('fontSize')}
        </label>
        <input
          id="fontSize"
          type="number"
          value={fontSize}
          onChange={(e) =>
            setProp((props: TextProps) => {
              props.fontSize = Number.parseInt(e.target.value, 10);
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium block" htmlFor="color">
          {t('textColor')}
        </label>
        <input
          id="color"
          type="color"
          value={color}
          onChange={(e) =>
            setProp((props: TextProps) => {
              props.color = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium block" htmlFor="textAlign">
          {t('textAlign')}
        </label>
        <div className="flex gap-1">
          {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setProp((props: TextProps) => {
                  props.textAlign = value;
                })
              }
              className={`flex items-center justify-center p-2 rounded-md border transition-colors ${
                textAlign === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-foreground border-border hover:border-border hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={(e) => {
            // Prevent button from taking focus, which would blur the TipTap editor
            // and potentially reset the cursor position.
            e.preventDefault();
          }}
          onClick={(_) => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
              setDropdownOpen(true);
            }
          }}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-3 h-3" />
          {t('insertPlaceholder')}
        </button>
      </div>

      {config && (
        <MergeTagDropdown
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          onSelect={handleMergeTagSelect}
          config={config}
          position={dropdownPos}
          insertionContext={{
            ancestorLoopsInnermostFirst,
            dataset: editorMeta.dataset,
          }}
        />
      )}
    </div>
  );
};

Text.craft = {
  props: {
    text: 'Hier Text eingeben',
    fontSize: 16,
    color: '#000000',
    textAlign: 'left' as TextAlign,
  },
  custom: {
    useCustomDragHandle: true,
  },
  related: {
    settings: TextSettings,
  },
};
