'use client';

import { useTranslations } from 'next-intl';
import { BORDER_STYLE_OPTIONS, type BorderStyle } from '@/lib/templates/border-utils';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

const SIDES = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const;

export function BorderField({
  translationPrefix,
  defaultEnabled = false,
}: {
  translationPrefix: string;
  defaultEnabled?: boolean;
}) {
  const t = useTranslations(translationPrefix);
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const sideEnabled = (side: (typeof SIDES)[number]) =>
    props[side] === undefined ? defaultEnabled : Boolean(props[side]);
  const borders = {
    borderTop: sideEnabled('borderTop'),
    borderRight: sideEnabled('borderRight'),
    borderBottom: sideEnabled('borderBottom'),
    borderLeft: sideEnabled('borderLeft'),
    borderColor: String(props.borderColor ?? '#e4e4e7'),
    borderStyle: (props.borderStyle as BorderStyle) ?? 'solid',
    borderWidth: Number(props.borderWidth ?? 1),
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium">{t('border')}</div>
      <div className="grid grid-cols-2 gap-2">
        {SIDES.map((side) => (
          <label key={side} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={borders[side]}
              onChange={(event) => patch({ [side]: event.target.checked })}
              className="rounded border-border"
            />
            {t(side)}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs">
          <span>{t('borderColor')}</span>
          <input
            type="color"
            value={borders.borderColor.startsWith('#') ? borders.borderColor : '#e4e4e7'}
            onChange={(event) => patch({ borderColor: event.target.value })}
            className="h-8 w-full rounded border"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>{t('borderWidth')}</span>
          <input
            type="number"
            min={0}
            value={borders.borderWidth}
            onChange={(event) => patch({ borderWidth: Number(event.target.value) || 0 })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </label>
      </div>
      <label className="space-y-1 text-xs">
        <span>{t('borderStyle')}</span>
        <select
          value={borders.borderStyle}
          onChange={(event) => patch({ borderStyle: event.target.value as BorderStyle })}
          className="w-full rounded border px-2 py-1 text-sm"
        >
          {BORDER_STYLE_OPTIONS.map((style) => (
            <option key={style} value={style}>
              {t(`borderStyle_${style}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
