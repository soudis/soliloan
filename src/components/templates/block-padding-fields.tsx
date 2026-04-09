'use client';

import { useTranslations } from 'next-intl';

import { resolvePaddingPx } from '@/lib/templates/padding-utils';

type SetPaddingProp<T> = (updater: (props: T) => void) => void;

type PaddingFieldProps = {
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

/**
 * Uniform base + optional per-side overrides (px). Matches `resolvePaddingPx` in padding-utils.
 */
export function BlockPaddingFields<T extends PaddingFieldProps>({
  props,
  setProp,
  idPrefix,
}: {
  props: PaddingFieldProps;
  setProp: SetPaddingProp<T>;
  /** Prefix for input ids, e.g. "container" → containerPaddingUniform */
  idPrefix: string;
}) {
  const t = useTranslations('templates.editor.padding');
  const base = props.padding ?? 0;
  const resolved = resolvePaddingPx(props);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}PaddingUniform`} className="text-xs font-medium">
          {t('uniform')}
        </label>
        <input
          id={`${idPrefix}PaddingUniform`}
          type="number"
          min={0}
          value={base}
          onChange={(e) =>
            setProp((p) => {
              const next = Number(e.target.value);
              (p as PaddingFieldProps).padding = Number.isFinite(next) ? next : 0;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['top', 'paddingTop', resolved.top] as const,
          ['right', 'paddingRight', resolved.right] as const,
          ['bottom', 'paddingBottom', resolved.bottom] as const,
          ['left', 'paddingLeft', resolved.left] as const,
        ].map(([key, propKey, displayValue]) => {
          const rawVal = props[propKey as keyof PaddingFieldProps];
          const inputValue =
            rawVal !== undefined && rawVal !== null && !Number.isNaN(Number(rawVal)) ? String(rawVal) : '';
          return (
            <div key={key} className="space-y-1">
              <label htmlFor={`${idPrefix}Padding${key}`} className="text-[11px] text-zinc-600">
                {t(key as 'top' | 'right' | 'bottom' | 'left')}
              </label>
              <input
                id={`${idPrefix}Padding${key}`}
                type="number"
                min={0}
                value={inputValue}
                placeholder={String(displayValue)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setProp((p) => {
                    const next = raw === '' ? undefined : Number(raw);
                    const field = p as Record<string, number | undefined>;
                    if (next === undefined || Number.isNaN(next)) {
                      delete field[propKey];
                    } else {
                      field[propKey] = next;
                    }
                  });
                }}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
