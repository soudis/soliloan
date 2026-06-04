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
}: {
  projectId: string;
  initialProjectLayout: DashboardLayoutData;
  initialUserLayout: DashboardLayoutData;
}) {
  const t = useTranslations('dashboard.customizer');
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

  const handleCopyToOtherScope = (copied: DashboardLayoutData) => {
    const targetScope: DashboardLayoutScopeKey = activeScope === 'project' ? 'user' : 'project';
    setLayouts((prev) => ({
      ...prev,
      [targetScope]: copied,
    }));
    setSaveStatus('idle');
  };

  useEffect(() => {
    setSelectedWidgetId(null);
  }, [activeScope]);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t('pageTitle')}</h1>
          <ToggleGroup
            type="single"
            value={activeScope}
            onValueChange={(v) => {
              if (v) {
                setScope(v as DashboardLayoutScopeKey);
              }
            }}
          >
            <ToggleGroupItem value="project" aria-label={t('scopeProject')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t('scopeProject')}
            </ToggleGroupItem>
            <ToggleGroupItem value="user" aria-label={t('scopeUser')}>
              {t('scopeUser')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
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
          {isCustomizing ? (
            <p className="mb-3 text-sm text-muted-foreground">{t('dragReorderHint')}</p>
          ) : null}
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DashboardGrid />
            </div>

            {isCustomizing && (
              <aside className="sticky top-0 z-20 flex w-80 max-h-[calc(100dvh-10rem)] shrink-0 flex-col self-start overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <DashboardEditorSidebar onCopyLayout={handleCopyToOtherScope} />
              </aside>
            )}
          </div>
        </DashboardDndProvider>
      </DashboardLayoutProvider>
    </div>
  );
}
