'use client';

import debounce from 'lodash.debounce';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import {
  CUMULATIVE_ONLY_METRICS,
  HISTORY_TABLE_METRICS,
  type HistoryTableColumnConfig,
  type HistoryTableWidgetConfig,
} from '@/types/dashboard-widgets/history-table';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function HistoryTableSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: HistoryTableWidgetConfig;
  onConfigChange: (config: HistoryTableWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.historyTable');
  const tLoans = useTranslations('loans');
  const tLenders = useTranslations('lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();
  const [draftConfig, setDraftConfig] = useState(savedConfig);
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set());

  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  const debouncedCommit = useMemo(
    () =>
      debounce((next: HistoryTableWidgetConfig) => {
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
    (next: HistoryTableWidgetConfig, immediate = false) => {
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

  const flushConfig = useCallback(() => {
    debouncedCommit.flush();
  }, [debouncedCommit]);

  const fieldOptions = buildAllFilterFieldOptions(project, tLoans, tLenders, commonT);

  const patchConfig = (patch: Partial<HistoryTableWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const updateColumn = (id: string, patch: Partial<HistoryTableColumnConfig>, immediate = false) => {
    patchConfig(
      {
        columns: draftConfig.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
      immediate,
    );
  };

  const removeColumn = (id: string) => {
    patchConfig({ columns: draftConfig.columns.filter((c) => c.id !== id) }, true);
    setExpandedColumnIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addColumn = () => {
    const id = crypto.randomUUID();
    patchConfig(
      {
        columns: [
          ...draftConfig.columns,
          {
            id,
            title: t('metrics.balance'),
            metric: 'balance',
            aggregation: 'cumulative',
            filters: [],
          },
        ],
      },
      true,
    );
    setExpandedColumnIds((prev) => new Set(prev).add(id));
  };

  const toggleColumn = (id: string) => {
    setExpandedColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label>{t('periodMode')}</Label>
        <Select
          value={draftConfig.periodMode}
          onValueChange={(v) =>
            patchConfig({ periodMode: v as HistoryTableWidgetConfig['periodMode'] }, true)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yearly">{t('periodModeYearly')}</SelectItem>
            <SelectItem value="monthly">{t('periodModeMonthly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('periodCount')}</Label>
        <Input
          type="number"
          min={1}
          max={draftConfig.periodMode === 'monthly' ? 24 : undefined}
          placeholder={t('periodCountPlaceholder')}
          value={draftConfig.periodCount ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            patchConfig({
              periodCount: raw === '' ? null : Number(raw),
            });
          }}
          onBlur={flushConfig}
        />
        {draftConfig.periodMode === 'monthly' ? (
          <p className="text-xs text-muted-foreground">{t('periodCountHint')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('columns')}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="mr-1 h-3 w-3" />
            {t('addColumn')}
          </Button>
        </div>

        {draftConfig.columns.map((column) => {
          const isExpanded = expandedColumnIds.has(column.id);
          const cumulativeOnly = CUMULATIVE_ONLY_METRICS.includes(column.metric);

          return (
            <div key={column.id} className="rounded-md border">
              <div className="flex items-center gap-1 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={isExpanded ? t('collapseColumn') : t('expandColumn')}
                  onClick={() => toggleColumn(column.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {column.title || t(`metrics.${column.metric}`)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={t('removeColumn')}
                  onClick={() => removeColumn(column.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {isExpanded ? (
                <div className="space-y-3 border-t p-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('columnTitle')}</Label>
                    <Input
                      value={column.title}
                      onChange={(e) => updateColumn(column.id, { title: e.target.value })}
                      onBlur={flushConfig}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('metric')}</Label>
                    <Select
                      value={column.metric}
                      onValueChange={(v) => {
                        const metric = v as HistoryTableColumnConfig['metric'];
                        const aggregation = CUMULATIVE_ONLY_METRICS.includes(metric) ? 'cumulative' : column.aggregation;
                        updateColumn(column.id, { metric, aggregation }, true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HISTORY_TABLE_METRICS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t(`metrics.${m}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!cumulativeOnly ? (
                    <div className="space-y-2">
                      <Label className="text-xs">{t('aggregation')}</Label>
                      <Select
                        value={column.aggregation}
                        onValueChange={(v) =>
                          updateColumn(column.id, { aggregation: v as HistoryTableColumnConfig['aggregation'] }, true)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delta">{t('aggregationDelta')}</SelectItem>
                          <SelectItem value="cumulative">{t('aggregationCumulative')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <EntityFilterList
                    filters={column.filters}
                    fieldOptions={fieldOptions}
                    onChange={(filters) => updateColumn(column.id, { filters })}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
