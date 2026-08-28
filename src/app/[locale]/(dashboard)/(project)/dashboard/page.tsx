import { getLocale, getTranslations } from 'next-intl/server';

import { type DashboardLender, type DashboardLoan, getDashboardStats } from '@/actions/dashboard/get-dashboard-stats';
import { getDashboardLayoutsForPage } from '@/actions/dashboard/queries/get-dashboard-layouts';
import { DashboardCustomizer } from '@/components/dashboard/customizer/dashboard-customizer';
import { DashboardDataProvider } from '@/components/dashboard/dashboard-data-provider';
import { computeLayoutWidgetResults } from '@/lib/dashboard/compute-widget-result';
import { dashboardCustomizeParser } from '@/lib/dashboard/dashboard-url-params';
import { createDefaultLayoutData } from '@/lib/dashboard/layout-utils';
import { omitDashboardLoanTimelines } from '@/lib/dashboard/load-dashboard-stats';
import { loadDashboardWidgetI18n } from '@/lib/dashboard/load-dashboard-widget-i18n';
import type { DashboardWidgetResultsByScope } from '@/lib/dashboard/widget-compute-result-types';
import {
  buildDashboardWidgetResultsCacheKey,
  getDashboardWidgetResultsCache,
  setDashboardWidgetResultsCache,
} from '@/lib/dashboard/widget-results-cache';
import { searchParamsCache } from '@/lib/params';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { requireSession } from '@/lib/require-session';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseCustomizeParam(searchParams: { [key: string]: string | string[] | undefined }): boolean {
  const raw = searchParams.customize;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return dashboardCustomizeParser.parseServerSide(value);
}

function isLayoutError(result: Awaited<ReturnType<typeof getDashboardLayoutsForPage>>): result is { error: string } {
  return 'error' in result;
}

async function DashboardLoadError() {
  const t = await getTranslations('dashboard.page');
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <p className="text-muted-foreground">{t('loadError')}</p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { projectId } = searchParamsCache.parse(resolvedSearchParams);
  const isCustomizing = parseCustomizeParam(resolvedSearchParams);

  // Stats is CPU-heavy after the query. Start it with layouts only when we know we need
  // the blob (customizer). View mode checks the widget cache first so a hit is not stalled
  // by an in-flight calculateLoanPerMonth on the event loop.
  const statsPromise = isCustomizing ? getDashboardStats(projectId) : null;

  const [layoutResult, session, locale] = await Promise.all([
    getDashboardLayoutsForPage(projectId),
    requireSession(),
    getLocale(),
  ]);

  const isAdmin = session.user.isAdmin;
  const fallback = isLayoutError(layoutResult)
    ? createDefaultLayoutData()
    : (layoutResult.globalDefault ?? createDefaultLayoutData());
  const projectLayout = isLayoutError(layoutResult) ? fallback : (layoutResult.project?.layout ?? fallback);
  const userLayout = isLayoutError(layoutResult) ? fallback : (layoutResult.user?.layout ?? fallback);

  let toDate: Date;
  let widgetResults: DashboardWidgetResultsByScope | undefined;
  let loans: DashboardLoan[] = [];
  let lenders: DashboardLender[] = [];
  let hasFullDataset = false;

  if (isCustomizing) {
    const statsResult = await statsPromise;
    if (!statsResult || 'error' in statsResult || !statsResult.loans || !statsResult.lenders || !statsResult.toDate) {
      return <DashboardLoadError />;
    }
    toDate = new Date(statsResult.toDate);
    loans = omitDashboardLoanTimelines(statsResult.loans);
    lenders = statsResult.lenders;
    hasFullDataset = true;
  } else {
    const userId = session.user.id;
    const cacheKey = userId ? buildDashboardWidgetResultsCacheKey(projectId, userId, locale, new Date()) : null;
    const cached = cacheKey ? getDashboardWidgetResultsCache(cacheKey) : null;

    if (cached) {
      toDate = new Date(cached.toDate);
      widgetResults = cached.widgetResults;
    } else {
      const [statsResult, project, i18n] = await Promise.all([
        getDashboardStats(projectId),
        getProjectUnsafe(projectId),
        loadDashboardWidgetI18n(),
      ]);
      if ('error' in statsResult || !statsResult.loans || !statsResult.lenders || !statsResult.toDate) {
        return <DashboardLoadError />;
      }
      toDate = new Date(statsResult.toDate);
      if (project) {
        const computeCtx = {
          loans: statsResult.loans,
          lenders: statsResult.lenders,
          toDate,
          project,
          i18n,
        };
        widgetResults = {
          project: computeLayoutWidgetResults(projectLayout, computeCtx),
          user: computeLayoutWidgetResults(userLayout, computeCtx),
        };
        if (cacheKey) {
          setDashboardWidgetResultsCache(cacheKey, {
            projectId,
            toDate: statsResult.toDate,
            widgetResults,
          });
        }
      }
    }
  }

  return (
    <DashboardDataProvider
      key={`${projectId}-${isCustomizing ? 'full' : 'slim'}`}
      loans={loans}
      lenders={lenders}
      toDate={toDate}
      hasFullDataset={hasFullDataset}
      widgetResults={widgetResults}
    >
      <DashboardCustomizer
        key={projectId}
        projectId={projectId}
        initialProjectLayout={projectLayout}
        initialUserLayout={userLayout}
        isAdmin={isAdmin}
      />
    </DashboardDataProvider>
  );
}
