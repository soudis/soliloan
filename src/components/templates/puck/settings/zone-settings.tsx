'use client';

import { useTranslations } from 'next-intl';
import { BlockPaddingFields } from '../../block-padding-fields';
import { BorderField } from '../fields/border-field';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';
import { usePaddingAdapter } from './use-padding-adapter';

export function ZoneSettings({ translationPrefix }: { translationPrefix: string }) {
  const t = useTranslations(translationPrefix);
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const { paddingProps, setProp } = usePaddingAdapter();
  const background = String(props.background ?? 'transparent');
  const colorValue = background === 'transparent' || !background.startsWith('#') ? '#ffffff' : background;

  return (
    <div className="space-y-4 p-4">
      <BlockPaddingFields idPrefix="zone" props={paddingProps} setProp={setProp} />
      <div className="space-y-2">
        <label htmlFor="zoneBg" className="text-xs font-medium">
          {t('backgroundColor')}
        </label>
        <input
          id="zoneBg"
          type="color"
          value={colorValue}
          onChange={(event) => patch({ background: event.target.value })}
          className="h-8 w-full rounded border p-0"
        />
      </div>
      <BorderField translationPrefix={translationPrefix} />
    </div>
  );
}
