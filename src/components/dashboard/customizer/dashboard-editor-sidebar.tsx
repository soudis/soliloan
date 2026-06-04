'use client';

import { Copy, Plus, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

import { useDashboardLayout } from './dashboard-layout-context';
import { DashboardWidgetSettings } from './dashboard-widget-settings';
import { DashboardWidgetToolbox } from './dashboard-widget-toolbox';

export function DashboardEditorSidebar({
  onCopyLayout,
}: {
  onCopyLayout: (layout: DashboardLayoutData) => void;
}) {
  const t = useTranslations('dashboard.customizer');
  const skipSettingsOnSelectionRef = useRef(false);
  const [tab, setTab] = useState('toolbox');
  const prevSelectedIdRef = useRef<string | undefined>(undefined);

  const { scope, layout, selectedWidgetId } = useDashboardLayout();

  useEffect(() => {
    if (skipSettingsOnSelectionRef.current) {
      skipSettingsOnSelectionRef.current = false;
      prevSelectedIdRef.current = selectedWidgetId ?? undefined;
      return;
    }
    if (selectedWidgetId !== undefined && selectedWidgetId !== prevSelectedIdRef.current) {
      setTab('settings');
    }
    prevSelectedIdRef.current = selectedWidgetId ?? undefined;
  }, [selectedWidgetId]);

  const handleCopy = (targetScope: 'project' | 'user') => {
    const sourceScope = scope;
    if (sourceScope === targetScope) {
      return;
    }
    onCopyLayout(cloneLayoutData(layout));
    toast.success(targetScope === 'user' ? t('copyToUserSuccess') : t('copyToProjectSuccess'));
  };

  return (
    <TooltipProvider>
      <div className="flex w-full flex-col">
        <div className="shrink-0 space-y-2 border-b px-4 py-3">
          {scope === 'project' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleCopy('user')}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('copyToUser')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleCopy('project')}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('copyToProject')}
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b px-4 py-2">
            <TabsList variant="modern" className="mt-0 flex w-full">
              <TabsTrigger variant="modern" size="sm" value="toolbox" className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent>{t('tabToolbox')}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger variant="modern" size="sm" value="settings" className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Settings />
                  </TooltipTrigger>
                  <TooltipContent>{t('tabSettings')}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="toolbox"
            className="mt-0 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none focus-visible:ring-0"
          >
            <DashboardWidgetToolbox />
          </TabsContent>

          <TabsContent
            value="settings"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0"
          >
            <DashboardWidgetSettings />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
