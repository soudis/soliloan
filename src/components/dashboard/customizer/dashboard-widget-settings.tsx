'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findWidgetLocation, removeWidget, updateWidget } from '@/lib/dashboard/layout-editor';
import { DEFAULT_WIDTH_BY_TYPE } from '@/lib/dashboard/layout-utils';
import type { DashboardWidgetWidth } from '@/types/dashboard-layout';
import { parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { parseStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import { useDashboardLayout } from './dashboard-layout-context';
import { HistoryTableSettings } from './history-table-settings';
import { StatWidgetSettings } from './stat-widget-settings';

const settingsSchema = z.object({
  title: z.string().min(1),
  width: z.enum(['quarter', 'half', 'full']),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const EMPTY_SETTINGS: SettingsFormValues = {
  title: '',
  width: 'half',
};

export function DashboardWidgetSettings() {
  const t = useTranslations('dashboard.customizer');
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
                  <FormLabel>{t('fieldTitle')}</FormLabel>
                  <FormControl>
                    <Input {...field} onBlur={() => form.handleSubmit(onSubmit)()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <SelectItem value="quarter">{t('width.quarter')}</SelectItem>
                      <SelectItem value="half">{t('width.half')}</SelectItem>
                      <SelectItem value="full">{t('width.full')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        {widget.type !== 'history_table' && widget.type !== 'stat' ? (
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
