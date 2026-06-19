'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findWidgetLocation, removeWidget, updateWidget } from '@/lib/dashboard/layout-editor';
import {
  DEFAULT_WIDTH_BY_TYPE,
  DESKTOP_GRID_COLS,
  getDesktopColspan,
  getRowUsedCols,
  WIDGET_WIDTH_SETTINGS_ORDER,
  widgetIsFullWidthLocked,
} from '@/lib/dashboard/layout-utils';
import { DASHBOARD_WIDGET_WIDTHS, type DashboardWidgetType, type DashboardWidgetWidth } from '@/types/dashboard-layout';
import { parseBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { parseLineChartConfig } from '@/types/dashboard-widgets/line-chart';
import { type PieChartChartSize, parsePieChartConfig } from '@/types/dashboard-widgets/pie-chart';
import { parseStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import {
  parseLenderTableConfig,
  parseLoanTableConfig,
  parseTransactionTableConfig,
} from '@/types/dashboard-widgets/table-view';
import { TransactionTableSettings } from './transaction-table-settings';
import { BarChartSettings } from './bar-chart-settings';
import { useDashboardEditor, useDashboardLayoutData } from './dashboard-layout-context';
import { HistoryTableSettings } from './history-table-settings';
import { LenderTableSettings } from './lender-table-settings';
import { LineChartSettings } from './line-chart-settings';
import { LoanTableSettings } from './loan-table-settings';
import { PieChartSettings } from './pie-chart-settings';
import { StatWidgetSettings } from './stat-widget-settings';

const settingsWidthSchema = z.enum(DASHBOARD_WIDGET_WIDTHS);

type SettingsFormValues = {
  title: string;
  width: z.infer<typeof settingsWidthSchema>;
};

function createSettingsSchema(widgetType: DashboardWidgetType) {
  return z.object({
    title:
      widgetType === 'stat' ||
      widgetType === 'history_table' ||
      widgetType === 'pie_chart' ||
      widgetType === 'bar_chart' ||
      widgetType === 'line_chart' ||
      widgetType === 'loan_table_view' ||
      widgetType === 'lender_table_view' ||
      widgetType === 'transaction_table_view' ||
      widgetType === 'divider'
        ? z.string()
        : z.string().min(1),
    width: settingsWidthSchema,
  });
}

const EMPTY_SETTINGS: SettingsFormValues = {
  title: '',
  width: 'half',
};

export function DashboardWidgetSettings() {
  const t = useTranslations('dashboard.customizer');
  const tPie = useTranslations('dashboard.customizer.pieChart');
  const { layout, setLayout } = useDashboardLayoutData();
  const { selectedWidgetId, setSelectedWidgetId } = useDashboardEditor();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const location = selectedWidgetId ? findWidgetLocation(layout, selectedWidgetId) : null;
  const widget = location?.widget;

  // Columns still free in the row once the current widget is removed; widths larger than this
  // can't fit and are disabled to avoid silent rejection / down-fitting in updateWidget.
  const availableCols = useMemo(() => {
    if (!location || !widget) {
      return DESKTOP_GRID_COLS;
    }
    const others = location.row.widgets.filter((w) => w.id !== widget.id);
    return DESKTOP_GRID_COLS - getRowUsedCols(others);
  }, [location, widget]);

  const settingsValues = useMemo((): SettingsFormValues => {
    if (!widget) {
      return EMPTY_SETTINGS;
    }
    return {
      title: widget.title,
      width: widget.width ?? DEFAULT_WIDTH_BY_TYPE[widget.type],
    };
  }, [widget]);

  const settingsSchema = useMemo(
    () => (widget ? createSettingsSchema(widget.type) : createSettingsSchema('pie_chart')),
    [widget],
  );

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: EMPTY_SETTINGS,
    values: settingsValues,
  });

  if (!widget || !selectedWidgetId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t('noSelection')}
      </div>
    );
  }

  const onSubmit = (values: SettingsFormValues) => {
    setLayout((prev) => updateWidget(prev, selectedWidgetId, values));
  };

  const handleConfigChange = (config: Record<string, unknown>) => {
    setLayout((prev) => updateWidget(prev, selectedWidgetId, { config }));
  };

  const parseChartConfig =
    widget.type === 'bar_chart'
      ? parseBarChartConfig
      : widget.type === 'line_chart'
        ? parseLineChartConfig
        : parsePieChartConfig;

  const handleChartSizeChange = (size: PieChartChartSize) => {
    handleConfigChange({ ...parseChartConfig(widget.config), chartSize: size });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-muted px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t('settingsTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t(`widgetTypes.${widget.type}`)}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{widget.type === 'divider' ? t('divider.fieldTitle') : t('fieldTitle')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={widget.type === 'divider' ? t('divider.titlePlaceholder') : undefined}
                      onBlur={() => form.handleSubmit(onSubmit)()}
                    />
                  </FormControl>
                  {widget.type === 'divider' ? (
                    <p className="text-xs text-muted-foreground">{t('divider.titleHint')}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            {widgetIsFullWidthLocked(widget.type) ? (
              <p className="text-xs text-muted-foreground">{t('divider.fullWidthHint')}</p>
            ) : (
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldWidth')}</FormLabel>
                    <Select
                      key={`${selectedWidgetId}-${field.value}`}
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v as DashboardWidgetWidth);
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fieldWidth')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WIDGET_WIDTH_SETTINGS_ORDER.map((width) => (
                          <SelectItem
                            key={width}
                            value={width}
                            disabled={width !== field.value && getDesktopColspan(width) > availableCols}
                          >
                            {t(`width.${width}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {WIDGET_WIDTH_SETTINGS_ORDER.some((width) => getDesktopColspan(width) > availableCols) ? (
                      <p className="text-xs text-muted-foreground">{t('widthDoesNotFitHint')}</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {widget.type === 'pie_chart' || widget.type === 'bar_chart' || widget.type === 'line_chart' ? (
              <div className="space-y-2">
                <Label>{tPie('chartSize')}</Label>
                <Select
                  value={parseChartConfig(widget.config).chartSize}
                  onValueChange={(v) => handleChartSizeChange(v as PieChartChartSize)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{tPie('chartSizeSmall')}</SelectItem>
                    <SelectItem value="medium">{tPie('chartSizeMedium')}</SelectItem>
                    <SelectItem value="big">{tPie('chartSizeBig')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </form>
        </Form>

        {widget.type === 'history_table' ? (
          <HistoryTableSettings config={parseHistoryTableConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'stat' ? (
          <StatWidgetSettings config={parseStatWidgetConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'pie_chart' ? (
          <PieChartSettings config={parsePieChartConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'bar_chart' ? (
          <BarChartSettings config={parseBarChartConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'line_chart' ? (
          <LineChartSettings config={parseLineChartConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'loan_table_view' ? (
          <LoanTableSettings config={parseLoanTableConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'lender_table_view' ? (
          <LenderTableSettings config={parseLenderTableConfig(widget.config)} onConfigChange={handleConfigChange} />
        ) : null}
        {widget.type === 'transaction_table_view' ? (
          <TransactionTableSettings
            config={parseTransactionTableConfig(widget.config)}
            onConfigChange={handleConfigChange}
          />
        ) : null}
        {widget.type !== 'history_table' &&
        widget.type !== 'stat' &&
        widget.type !== 'pie_chart' &&
        widget.type !== 'bar_chart' &&
        widget.type !== 'line_chart' &&
        widget.type !== 'loan_table_view' &&
        widget.type !== 'lender_table_view' &&
        widget.type !== 'transaction_table_view' &&
        widget.type !== 'divider' ? (
          <p className="mt-6 text-xs text-muted-foreground">{t('typeSettingsComingSoon')}</p>
        ) : null}

        <div className="mt-6 border-t pt-4">
          <Button type="button" variant="destructive" className="w-full" onClick={() => setDeleteConfirmOpen(true)}>
            {t('deleteWidget')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('deleteWidgetConfirmTitle')}
        description={t('deleteWidgetConfirmDescription')}
        confirmText={t('deleteWidget')}
        onConfirm={() => {
          setLayout((prev) => removeWidget(prev, selectedWidgetId));
          setSelectedWidgetId(null);
        }}
      />
    </div>
  );
}
