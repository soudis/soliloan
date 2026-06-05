'use client';

import { isEqual } from 'lodash';
import { LayoutDashboard, Save, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  upsertProjectDashboardLayoutAction,
  upsertUserDashboardLayoutAction,
} from '@/actions/dashboard/mutations/upsert-dashboard-layout';
import { upsertGlobalDashboardLayoutAction } from '@/actions/dashboard/mutations/upsert-global-dashboard-layout';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { ProjectLogo } from '@/components/dashboard/project-logo';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import type { DashboardLayoutData, DashboardLayoutScopeKey } from '@/types/dashboard-layout';

import { DashboardDndProvider } from './dashboard-dnd-provider';
import { DashboardEditorSidebar } from './dashboard-editor-sidebar';
import { DashboardGrid } from './dashboard-grid';
import { DashboardLayoutProvider } from './dashboard-layout-context';

type LayoutsState = Record<DashboardLayoutScopeKey, DashboardLayoutData>;

export function DashboardCustomizer({
  projectId,
  initialProjectLayout,
  initialUserLayout,
  isAdmin = false,
}: {
  projectId: string;
  initialProjectLayout: DashboardLayoutData;
  initialUserLayout: DashboardLayoutData;
  isAdmin?: boolean;
}) {
  const t = useTranslations('dashboard.customizer');
  const { project } = useDashboardData();
  const projectName = project.configuration.name;
  const [scope, setScope] = useQueryState(
    'dashboardScope',
    parseAsStringLiteral(['project', 'user'] as const).withDefault('project'),
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [layouts, setLayouts] = useState<LayoutsState>({
    project: cloneLayoutData(initialProjectLayout),
    user: cloneLayoutData(initialUserLayout),
  });
  const [savedLayouts, setSavedLayouts] = useState<LayoutsState>({
    project: cloneLayoutData(initialProjectLayout),
    user: cloneLayoutData(initialUserLayout),
  });

  const activeScope = (scope ?? 'project') as DashboardLayoutScopeKey;
  const layout = layouts[activeScope];
  const isDirty = !isEqual(layout, savedLayouts[activeScope]);

  const setLayout = useCallback(
    (next: DashboardLayoutData | ((prev: DashboardLayoutData) => DashboardLayoutData)) => {
      setLayouts((layoutsPrev) => {
        const current = layoutsPrev[activeScope];
        const resolved = typeof next === 'function' ? next(current) : next;
        return {
          ...layoutsPrev,
          [activeScope]: resolved,
        };
      });
      setSaveStatus('idle');
    },
    [activeScope],
  );

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const result =
        activeScope === 'project'
          ? await upsertProjectDashboardLayoutAction({ projectId, layout })
          : await upsertUserDashboardLayoutAction({ layout });

      if (result?.serverError || result?.validationErrors) {
        setSaveStatus('error');
        toast.error(t('saveError'));
        return;
      }
      setSavedLayouts((prev) => ({
        ...prev,
        [activeScope]: cloneLayoutData(layout),
      }));
      setSaveStatus('saved');
      toast.success(t('saved'));
    } catch {
      setSaveStatus('error');
      toast.error(t('saveError'));
    }
  };

  const handleSaveAsGlobalDefault = async (layoutToSave: DashboardLayoutData) => {
    try {
      const result = await upsertGlobalDashboardLayoutAction({ layout: layoutToSave });

      if (result?.serverError || result?.validationErrors) {
        toast.error(t('saveAsGlobalDefaultError'));
        return;
      }

      toast.success(t('saveAsGlobalDefaultSuccess'));
    } catch {
      toast.error(t('saveAsGlobalDefaultError'));
    }
  };

  const handleCopyToOtherScope = (copied: DashboardLayoutData) => {
    const targetScope: DashboardLayoutScopeKey = activeScope === 'project' ? 'user' : 'project';
    setLayouts((prev) => ({
      ...prev,
      [targetScope]: copied,
    }));
    setSaveStatus('idle');
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset selected widget id when scope changes
  useEffect(() => {
    setSelectedWidgetId(null);
  }, [activeScope]);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectLogo project={project} className="h-12 w-12 shrink-0 rounded-xl shadow-sm sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{projectName}</h1>
            <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ToggleGroup
            type="single"
            value={activeScope}
            onValueChange={(v) => {
              if (v) {
                setScope(v as DashboardLayoutScopeKey);
              }
            }}
            className="shrink-0"
          >
            <ToggleGroupItem
              value="project"
              aria-label={t('scopeProject')}
              className="min-w-[8.5rem] flex-none whitespace-nowrap px-4"
            >
              <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" />
              {t('scopeProject')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="user"
              aria-label={t('scopeUser')}
              className="min-w-[11rem] flex-none whitespace-nowrap px-4"
            >
              {t('scopeUser')}
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap items-center gap-2">
            {isCustomizing && (
              <Button type="button" disabled={!isDirty || saveStatus === 'saving'} onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {saveStatus === 'saving' ? t('saving') : t('save')}
              </Button>
            )}
            <Button
              type="button"
              variant={isCustomizing ? 'secondary' : 'outline'}
              onClick={() => {
                setIsCustomizing((v) => !v);
                if (isCustomizing) {
                  setSelectedWidgetId(null);
                  setSaveStatus('idle');
                }
              }}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {isCustomizing ? t('doneCustomize') : t('customize')}
            </Button>
          </div>
        </div>
      </div>

      <DashboardLayoutProvider
        value={{
          layout,
          setLayout,
          scope: activeScope,
          projectId,
          isCustomizing,
          selectedWidgetId,
          setSelectedWidgetId,
        }}
      >
        <DashboardDndProvider>
          {isCustomizing ? <p className="mb-3 text-sm text-muted-foreground">{t('dragReorderHint')}</p> : null}
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DashboardGrid />
            </div>

            {isCustomizing && (
              <aside className="sticky top-4 z-20 flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] w-80 shrink-0 flex-col self-start overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <DashboardEditorSidebar
                  isAdmin={isAdmin}
                  onCopyLayout={handleCopyToOtherScope}
                  onSaveAsGlobalDefault={handleSaveAsGlobalDefault}
                />
              </aside>
            )}
          </div>
        </DashboardDndProvider>
      </DashboardLayoutProvider>
    </div>
  );
}
