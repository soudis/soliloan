'use client';

import { Copy, Globe, Plus, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

import { useDashboardEditor, useDashboardLayoutData } from './dashboard-layout-context';
import { DashboardWidgetSettings } from './dashboard-widget-settings';
import { DashboardWidgetToolbox } from './dashboard-widget-toolbox';

export function DashboardEditorSidebar({
  isAdmin = false,
  isTargetScopeDirty = false,
  onCopyLayout,
  onSaveAsGlobalDefault,
}: {
  isAdmin?: boolean;
  isTargetScopeDirty?: boolean;
  onCopyLayout: (layout: DashboardLayoutData) => void;
  onSaveAsGlobalDefault: (layout: DashboardLayoutData) => void | Promise<void>;
}) {
  const t = useTranslations('dashboard.customizer');
  const [tab, setTab] = useState('toolbox');
  const [globalDefaultDialogOpen, setGlobalDefaultDialogOpen] = useState(false);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const prevSelectedIdRef = useRef<string | undefined>(undefined);

  const { scope, layout } = useDashboardLayoutData();
  const { selectedWidgetId } = useDashboardEditor();

  useEffect(() => {
    if (selectedWidgetId !== undefined && selectedWidgetId !== prevSelectedIdRef.current) {
      setTab('settings');
    }
    prevSelectedIdRef.current = selectedWidgetId ?? undefined;
  }, [selectedWidgetId]);

  const targetScope: 'project' | 'user' = scope === 'project' ? 'user' : 'project';

  const performCopy = () => {
    onCopyLayout(cloneLayoutData(layout));
    toast.success(targetScope === 'user' ? t('copyToUserSuccess') : t('copyToProjectSuccess'));
  };

  const handleCopy = () => {
    if (isTargetScopeDirty) {
      setCopyConfirmOpen(true);
      return;
    }
    performCopy();
  };

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="shrink-0 space-y-2 border-b px-4 py-3">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {scope === 'project' ? t('copyToUser') : t('copyToProject')}
          </Button>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setGlobalDefaultDialogOpen(true)}
            >
              <Globe className="mr-2 h-4 w-4" />
              {t('saveAsGlobalDefault')}
            </Button>
          ) : null}
        </div>

        <ConfirmDialog
          open={copyConfirmOpen}
          onOpenChange={setCopyConfirmOpen}
          title={t('copyOverwriteTitle')}
          description={t('copyOverwriteDescription')}
          confirmText={scope === 'project' ? t('copyToUser') : t('copyToProject')}
          onConfirm={performCopy}
        />

        <ConfirmDialog
          open={globalDefaultDialogOpen}
          onOpenChange={setGlobalDefaultDialogOpen}
          title={t('saveAsGlobalDefaultConfirmTitle')}
          description={t('saveAsGlobalDefaultConfirmDescription', {
            scope: scope === 'project' ? t('scopeProject') : t('scopeUser'),
          })}
          confirmText={t('saveAsGlobalDefault')}
          onConfirm={() => onSaveAsGlobalDefault(cloneLayoutData(layout))}
        />

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b px-4 py-2">
            <TabsList variant="modern" className="mt-0 flex w-full">
              <TabsTrigger
                variant="modern"
                size="sm"
                value="toolbox"
                aria-label={t('tabToolbox')}
                className="min-w-0 flex-1 md:flex-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent>{t('tabToolbox')}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger
                variant="modern"
                size="sm"
                value="settings"
                aria-label={t('tabSettings')}
                className="min-w-0 flex-1 md:flex-1"
              >
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
