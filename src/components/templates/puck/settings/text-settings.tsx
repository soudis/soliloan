'use client';

import { useTranslations } from 'next-intl';
import type { TextAlign } from '../table-model';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';
import { TextAlignButtons } from './text-align-buttons';

export function TextSettings() {
  const t = useTranslations('templates.editor.components.text');
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const fontSize = Number(props.fontSize ?? 16);
  const color = String(props.color ?? '#000000');
  const textAlign = (props.textAlign as TextAlign) ?? 'left';

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="block text-xs font-medium" htmlFor="fontSize">
          {t('fontSize')}
        </label>
        <input
          id="fontSize"
          type="number"
          value={fontSize}
          onChange={(event) => patch({ fontSize: Number.parseInt(event.target.value, 10) })}
          className="w-full rounded border px-2 py-1 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium" htmlFor="color">
          {t('textColor')}
        </label>
        <input
          id="color"
          type="color"
          value={color.startsWith('#') ? color : '#000000'}
          onChange={(event) => patch({ color: event.target.value })}
          className="h-8 w-full rounded border p-0"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium" htmlFor="textAlign">
          {t('textAlign')}
        </label>
        <TextAlignButtons value={textAlign} onChange={(next) => patch({ textAlign: next })} />
      </div>
    </div>
  );
}
