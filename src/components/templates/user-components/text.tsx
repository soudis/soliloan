'use client';

import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { useNode } from '@craftjs/core';
import { EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, PlusCircle, Underline as UnderlineIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useMergeTagConfig } from '../merge-tag-context';
import { MergeTagDropdown } from '../merge-tag-dropdown';
import { editorRegistry, useEditorRegistry } from './tiptap/editor-registry';
import { TextEditorProvider, useTextEditor } from './tiptap/text-editor-context';
import { useTiptapEditor } from './tiptap/use-tiptap-editor';
import './tiptap/tiptap.css';

interface TextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

export const Text = ({ text, fontSize = 16, color = '#000000' }: TextProps) => {
  const {
    connectors: { connect },
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
        }}
        className={`relative w-full min-h-[1em] group ${selected ? 'outline-1 outline-blue-500' : ''}`}
      >
        {editor && (
          <BubbleMenu
            editor={editor}
            pluginKey="bubbleMenu"
            shouldShow={({ editor }) => {
              // Only show when there is a selection
              return !editor.state.selection.empty;
            }}
          >
            <div className="flex bg-zinc-900 text-white rounded-md shadow-lg border border-zinc-800 p-0.5 z-[1000] overflow-hidden">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                  editor.isActive('bold') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                  editor.isActive('italic') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 hover:bg-zinc-800 rounded transition-colors ${
                  editor.isActive('underline') ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
            </div>
          </BubbleMenu>
        )}

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

  const {
    actions: { setProp },
    fontSize,
    color,
    text,
    id,
  } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
    color: node.data.props.color,
    text: node.data.props.text,
    id: node.id,
  }));

  // Get editor instance from registry since we are in a different React tree (Sidebar)
  const registryData = useEditorRegistry(id);
  const editor = registryData?.editor || null;
  const lastSelection = registryData?.lastSelection || { current: null };

  const config = useMergeTagConfig();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const mergeTag = {
      id: String('id' in item ? item.id : item.key),
      label: item.label,
      value: ('startTag' in item ? item.startTag : item.value).replace(/[{}]/g, ''),
    };

    if (editor) {
      // 1. Get position BEFORE calling any focus methods
      const pos = lastSelection.current?.from ?? editor.state.selection.from;

      // 2. Chain focus(pos) followed by insertion
      if ('insertMergeTag' in editor.commands) {
        editor.chain().focus(pos).insertMergeTag(mergeTag).run();
      } else {
        // Fallback: insert at current selection using chain for better type safety
        const mergeTagHtml = `<span data-merge-tag="${mergeTag.value}" data-merge-tag-id="${mergeTag.id}" data-merge-tag-label="${mergeTag.label}" class="merge-tag-pill">${mergeTag.label}</span>`;
        editor.chain().focus(pos).insertContent(mergeTagHtml).run();
      }

      // 3. Clear lastSelection to avoid stale data
      lastSelection.current = null;
    } else {
      // Emergency fallback: append to text
      setProp((props: TextProps) => {
        const mergeTagHtml = `<span data-merge-tag="${mergeTag.value}" data-merge-tag-id="${mergeTag.id}" data-merge-tag-label="${mergeTag.label}" class="merge-tag-pill">${mergeTag.label}</span>`;
        props.text = props.text ? `${props.text}${mergeTagHtml}` : mergeTagHtml;
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
              props.fontSize = Number.parseInt(e.target.value);
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

      <div className="pt-4 border-t">
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={(e) => {
            // Prevent button from taking focus, which would blur the TipTap editor
            // and potentially reset the cursor position.
            e.preventDefault();
          }}
          onClick={(e) => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
              setDropdownOpen(true);
            }
          }}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
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
  },
  custom: {
    useCustomDragHandle: true,
  },
  related: {
    settings: TextSettings,
  },
};
