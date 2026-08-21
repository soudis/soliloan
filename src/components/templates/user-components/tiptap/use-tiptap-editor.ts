import BubbleMenu from '@tiptap/extension-bubble-menu';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { MergeTag } from './merge-tag-extension';

interface UseTiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  editable: boolean;
  color?: string;
  fontSize?: number;
}

export const useTiptapEditor = ({ content, onUpdate, editable, color, fontSize }: UseTiptapEditorProps) => {
  const t = useTranslations('templates.editor');
  const loopBodyPlaceholder = t('mergeTags.loopBodyPlaceholder');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      MergeTag.configure({
        loopBodyPlaceholder,
      }),
      BubbleMenu.configure({
        pluginKey: 'bubbleMenu',
      }),
    ],
    [loopBodyPlaceholder],
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
      onUpdate: ({ editor: current }) => {
        onUpdateRef.current(current.getHTML());
      },
    },
    [],
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom;
      editorElement.style.color = color || '#000000';
      editorElement.style.fontSize = `${fontSize || 16}px`;
    }
  }, [color, fontSize, editor]);

  return editor;
};
