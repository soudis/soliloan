'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { mergeLoopsAllowedForCanvasPlacement } from '@/lib/templates/merge-tag-insertion-filter';
import { useEditorMetadata } from '../../editor-context';
import { useMergeTagConfig } from '../../merge-tag-context';
import {
  usePatchSelectedProps,
  usePuckAncestorLoops,
  useSelectedComponentType,
  useSelectedRecord,
} from '../use-puck-selected';

export function LoopKeyField({
  translationPrefix = 'templates.editor.components.container',
  emptyOptionKey = 'staticContainer',
}: {
  translationPrefix?: string;
  emptyOptionKey?: string;
}) {
  const t = useTranslations(translationPrefix);
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const patch = usePatchSelectedProps();
  const selectedType = useSelectedComponentType();
  const ancestorLoops = usePuckAncestorLoops(false);
  const loopKey = String(useSelectedRecord().loopKey ?? '');

  const selectableLoops = useMemo(
    () => mergeLoopsAllowedForCanvasPlacement(config?.loops ?? [], ancestorLoops, editorMeta.dataset),
    [ancestorLoops, config?.loops, editorMeta.dataset],
  );

  useEffect(() => {
    if (!loopKey || !config?.loops) return;
    const current = config.loops.find((loop) => loop.key === loopKey);
    if (!current) return;
    if (!mergeLoopsAllowedForCanvasPlacement([current], ancestorLoops, editorMeta.dataset).length) {
      patch({ loopKey: '' });
    }
  }, [ancestorLoops, config?.loops, editorMeta.dataset, loopKey, patch]);

  const availableLoops = config?.loops ?? [];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium" htmlFor="puckLoopKey">
        {t('loopKey')}
      </label>
      <select
        id="puckLoopKey"
        value={loopKey}
        onChange={(event) => {
          const nextKey = event.target.value;
          const loop = selectableLoops.find((item) => item.key === nextKey);
          if (selectedType === 'Table' && loop) {
            patch({ loopKey: nextKey, displayName: loop.label });
            return;
          }
          patch({ loopKey: nextKey });
        }}
        className="w-full rounded border bg-white px-2 py-1.5 text-sm"
      >
        <option value="">{t(emptyOptionKey)}</option>
        {selectableLoops.map((loop) => (
          <option key={loop.key} value={loop.key}>
            {loop.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground">{loopKey ? t('dynamicHint') : t('staticHint')}</p>
      {availableLoops.length > 0 && selectableLoops.length !== availableLoops.length ? (
        <p className="text-[11px] text-muted-foreground">{t('loopKeyContextHint')}</p>
      ) : null}
    </div>
  );
}
