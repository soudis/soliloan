'use client';

import { RichTextMenu } from '@puckeditor/core';
import type { Editor } from '@tiptap/core';
import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { buildLoopMergeTagFallbackHtml } from '@/lib/templates/tiptap-merge-loop';
import { useEditorMetadata } from '../../editor-context';
import { useMergeTagConfig } from '../../merge-tag-context';
import { MergeTagDropdown } from '../../merge-tag-dropdown';
import { MergeTag } from '../../user-components/tiptap/merge-tag-extension';
import { usePuckAncestorLoops } from '../use-puck-selected';

export function createMergeTagExtension(loopBodyPlaceholder: string) {
  return MergeTag.configure({ loopBodyPlaceholder });
}

export function MergeTagMenuControl({ editor }: { editor: Editor | null }) {
  const t = useTranslations('templates.editor.mergeTags');
  const tText = useTranslations('templates.editor.components.text');
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const ancestorLoops = usePuckAncestorLoops(true);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleSelect = (item: MergeTagField | MergeTagLoop) => {
    if (!editor) return;
    if ('startTag' in item) {
      const inserted = editor.chain().focus().insertMergeTagLoop(item).run();
      if (!inserted) {
        editor.commands.insertContent(buildLoopMergeTagFallbackHtml(item, t('loopBodyPlaceholder')));
      }
    } else {
      editor
        .chain()
        .focus()
        .insertMergeTag({
          id: String(item.key),
          label: item.label,
          value: item.value.replace(/[{}]/g, ''),
        })
        .run();
    }
    setOpen(false);
  };

  return (
    <>
      <RichTextMenu.Control
        title={tText('insertPlaceholder')}
        icon={<PlusCircle className="h-4 w-4" />}
        onClick={(event) => {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          setPosition({ top: rect.bottom + 5, left: rect.left - 80 });
          setOpen(true);
        }}
      />
      {config && (
        <MergeTagDropdown
          isOpen={open}
          onClose={() => setOpen(false)}
          onSelect={handleSelect}
          config={config}
          position={position}
          insertionContext={{ ancestorLoopsInnermostFirst: ancestorLoops, dataset: editorMeta.dataset }}
        />
      )}
    </>
  );
}
