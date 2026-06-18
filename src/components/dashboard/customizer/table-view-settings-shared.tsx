'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EntityFilterFieldOption } from '@/types/entity-filters';
import {
  TABLE_VIEW_ROW_LIMIT_MAX,
  TABLE_VIEW_ROW_LIMIT_MIN,
  type TableViewWidgetConfigBase,
} from '@/types/dashboard-widgets/table-view';

import { TableViewColumnEditor, type TableViewColumnMeta } from './table-view-column-editor';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function TableViewSettingsShared({
  config: savedConfig,
  onConfigChange,
  columnMeta,
  fieldOptions,
}: {
  config: TableViewWidgetConfigBase;
  onConfigChange: (config: TableViewWidgetConfigBase) => void;
  columnMeta: TableViewColumnMeta[];
  fieldOptions: EntityFilterFieldOption[];
}) {
  const t = useTranslations('dashboard.customizer.tableView');
  const [draftConfig, setDraftConfig] = useState(savedConfig);

  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  const debouncedCommit = useMemo(
    () =>
      debounce((next: TableViewWidgetConfigBase) => {
        onConfigChangeRef.current(next);
      }, CONFIG_COMMIT_DEBOUNCE_MS),
    [],
  );

  useEffect(
    () => () => {
      debouncedCommit.flush();
      debouncedCommit.cancel();
    },
    [debouncedCommit],
  );

  const commitConfig = useCallback(
    (next: TableViewWidgetConfigBase, immediate = false) => {
      setDraftConfig(next);
      if (immediate) {
        debouncedCommit.cancel();
        onConfigChangeRef.current(next);
      } else {
        debouncedCommit(next);
      }
    },
    [debouncedCommit],
  );

  const sortColumnOptions = columnMeta.filter((meta) => draftConfig.columns.some((col) => col.id === meta.id));

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <TableViewColumnEditor
        columns={draftConfig.columns}
        columnMeta={columnMeta}
        onChange={(columns) => commitConfig({ ...draftConfig, columns }, true)}
      />

      <EntityFilterList
        filters={draftConfig.filters}
        fieldOptions={fieldOptions}
        onChange={(filters) => commitConfig({ ...draftConfig, filters })}
      />

      <div className="space-y-2">
        <Label className="text-xs">{t('defaultSort')}</Label>
        <div className="flex gap-2">
          <Select
            value={draftConfig.defaultSort?.columnId ?? '__none__'}
            onValueChange={(value) => {
              if (value === '__none__') {
                commitConfig({ ...draftConfig, defaultSort: null }, true);
                return;
              }
              commitConfig(
                {
                  ...draftConfig,
                  defaultSort: {
                    columnId: value,
                    desc: draftConfig.defaultSort?.desc ?? false,
                  },
                },
                true,
              );
            }}
          >
            <SelectTrigger className="min-w-0 flex-1">
              <SelectValue placeholder={t('sortNone')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('sortNone')}</SelectItem>
              {sortColumnOptions.map((meta) => (
                <SelectItem key={meta.id} value={meta.id}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draftConfig.defaultSort ? (draftConfig.defaultSort.desc ? 'desc' : 'asc') : 'asc'}
            disabled={!draftConfig.defaultSort}
            onValueChange={(value) => {
              if (!draftConfig.defaultSort) {
                return;
              }
              commitConfig(
                {
                  ...draftConfig,
                  defaultSort: {
                    ...draftConfig.defaultSort,
                    desc: value === 'desc',
                  },
                },
                true,
              );
            }}
          >
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t('sortAsc')}</SelectItem>
              <SelectItem value="desc">{t('sortDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('displayMode')}</Label>
        <Select
          value={draftConfig.displayMode}
          onValueChange={(value) =>
            commitConfig({ ...draftConfig, displayMode: value as TableViewWidgetConfigBase['displayMode'] }, true)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paged">{t('displayModePaged')}</SelectItem>
            <SelectItem value="fixed">{t('displayModeFixed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{draftConfig.displayMode === 'paged' ? t('pageSize') : t('rowLimit')}</Label>
        <Input
          type="number"
          min={TABLE_VIEW_ROW_LIMIT_MIN}
          max={TABLE_VIEW_ROW_LIMIT_MAX}
          value={draftConfig.rowLimit}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            if (!Number.isFinite(parsed)) {
              return;
            }
            const rowLimit = Math.min(TABLE_VIEW_ROW_LIMIT_MAX, Math.max(TABLE_VIEW_ROW_LIMIT_MIN, parsed));
            commitConfig({ ...draftConfig, rowLimit });
          }}
        />
      </div>
    </div>
  );
}
