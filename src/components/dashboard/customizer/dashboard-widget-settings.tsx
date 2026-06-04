'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findWidgetLocation, removeWidget, updateWidget } from '@/lib/dashboard/layout-editor';
import {
  DEFAULT_WIDTH_BY_TYPE,
  widgetIsFullWidthLocked,
  WIDGET_WIDTH_SETTINGS_ORDER,
} from '@/lib/dashboard/layout-utils';
import { DASHBOARD_WIDGET_WIDTHS, type DashboardWidgetType, type DashboardWidgetWidth } from '@/types/dashboard-layout';
import { parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { parsePieChartConfig, type PieChartChartSize } from '@/types/dashboard-widgets/pie-chart';
import { parseStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import { useDashboardLayout } from './dashboard-layout-context';
import { HistoryTableSettings } from './history-table-settings';
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
  const { layout, setLayout, selectedWidgetId, setSelectedWidgetId } = useDashboardLayout();

  const location = selectedWidgetId ? findWidgetLocation(layout, selectedWidgetId) : null;
  const widget = location?.widget;

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-zinc-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{t('settingsTitle')}</h3>
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
                  <FormLabel>
                    {widget.type === 'divider' ? t('divider.fieldTitle') : t('fieldTitle')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        widget.type === 'divider' ? t('divider.titlePlaceholder') : undefined
                      }
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
                          <SelectItem key={width} value={width}>
                            {t(`width.${width}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {widget.type === 'pie_chart' ? (
              <div className="space-y-2">
                <Label>{tPie('chartSize')}</Label>
                <Select
                  value={parsePieChartConfig(widget.config).chartSize}
                  onValueChange={(v) => {
                    const config = parsePieChartConfig(widget.config);
                    setLayout((prev) =>
                      updateWidget(prev, selectedWidgetId, {
                        config: { ...config, chartSize: v as PieChartChartSize },
                      }),
                    );
                  }}
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
          <HistoryTableSettings
            config={parseHistoryTableConfig(widget.config)}
            onConfigChange={(config) => {
              setLayout((prev) => updateWidget(prev, selectedWidgetId, { config }));
            }}
          />
        ) : null}
        {widget.type === 'stat' ? (
          <StatWidgetSettings
            config={parseStatWidgetConfig(widget.config)}
            onConfigChange={(config) => {
              setLayout((prev) => updateWidget(prev, selectedWidgetId, { config }));
            }}
          />
        ) : null}
        {widget.type === 'pie_chart' ? (
          <PieChartSettings
            config={parsePieChartConfig(widget.config)}
            onConfigChange={(config) => {
              setLayout((prev) => updateWidget(prev, selectedWidgetId, { config }));
            }}
          />
        ) : null}
        {widget.type !== 'history_table' &&
        widget.type !== 'stat' &&
        widget.type !== 'pie_chart' &&
        widget.type !== 'divider' ? (
          <p className="mt-6 text-xs text-muted-foreground">{t('typeSettingsComingSoon')}</p>
        ) : null}

        <div className="mt-6 border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => {
              setLayout((prev) => removeWidget(prev, selectedWidgetId));
              setSelectedWidgetId(null);
            }}
          >
            {t('deleteWidget')}
          </Button>
        </div>
      </div>
    </div>
  );
}
