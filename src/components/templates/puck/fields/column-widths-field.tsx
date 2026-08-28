'use client';

import { useTranslations } from 'next-intl';
import { resizeColumnWidths } from '@/components/templates/puck/table-model';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

export function ColumnWidthsField() {
  const t = useTranslations('templates.editor.components.table');
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const columns = Number(props.columns ?? 1);
  const columnWidths = (props.columnWidths as number[] | undefined) ?? [];

  const widths = resizeColumnWidths(columnWidths, columns, 100 / Math.max(columns, 1));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{t('columnWidths')}</p>
      <div className="grid grid-cols-2 gap-2">
        {widths.map((width, colIdx) => {
          const inputId = `puck-col-width-${colIdx}`;
          return (
            <div key={inputId} className="space-y-1">
              <label className="text-[11px] text-muted-foreground" htmlFor={inputId}>
                {t('columnWidthLabel', { column: colIdx + 1 })}
              </label>
              <input
                id={inputId}
                type="number"
                min={1}
                step={0.1}
                value={Number(width.toFixed(2))}
                onChange={(event) => {
                  const next = resizeColumnWidths(columnWidths, columns, 100 / Math.max(columns, 1));
                  next[colIdx] = Math.max(1, Number(event.target.value) || 1);
                  patch({ columnWidths: next });
                }}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">{t('columnWidthHint')}</p>
    </div>
  );
}
