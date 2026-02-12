import BubbleMenu from '@tiptap/extension-bubble-menu';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo } from 'react';
import { MergeTag } from './merge-tag-extension';

interface UseTiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  editable: boolean;
  color?: string;
  fontSize?: number;
}

export const useTiptapEditor = ({ content, onUpdate, editable, color, fontSize }: UseTiptapEditorProps) => {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Disable features we don't need for email templates
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      MergeTag,
      BubbleMenu.configure({
        pluginKey: 'bubbleMenu',
      }),
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      immediatelyRender: false,
      editable,
      editorProps: {
        attributes: {
          class: 'tiptap-editor outline-none',
          style: `color: ${color || '#000000'}; font-size: ${fontSize || 16}px;`,
        },
      },
      onUpdate: ({ editor }) => {
        onUpdate(editor.getHTML());
      },
    },
    [extensions],
  );

  // Update content when prop changes (from external source)
  // No longer syncing content from props to prevent state resets during insertion
  // The editor is now the source of truth during the session

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Update editor styles when color or fontSize changes
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom;
      editorElement.style.color = color || '#000000';
      editorElement.style.fontSize = `${fontSize || 16}px`;
    }
  }, [color, fontSize, editor]);

  return editor;
};
