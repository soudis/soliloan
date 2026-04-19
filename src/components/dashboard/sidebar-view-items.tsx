'use client';

import type { ViewType } from '@prisma/client';
import { Bookmark } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryStates } from 'nuqs';
import { useMemo } from 'react';

import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { PROJECT_ID_KEY } from '@/lib/params';
import { tableUrlNuqsOptions, tableUrlParsers } from '@/lib/table-url-parsers';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { SidebarNavView } from '@/types/sidebar-nav';

interface SidebarViewItemsProps {
  views: SidebarNavView[];
  viewType: typeof ViewType.LENDER | typeof ViewType.LOAN;
  basePath: '/lenders' | '/loans';
}

/** Same nuqs instance shape as `useTableUrlState` — updates URL without Next router (fixes same-route ?view= changes). */
export function SidebarViewItems({ views, viewType, basePath }: SidebarViewItemsProps) {
  const projectId = useProjectId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentViewId = searchParams.get('view');
  const { toggleSidebar } = useAppStore();
  const router = useRouter();
  const [, setTableUrl] = useQueryStates(tableUrlParsers, tableUrlNuqsOptions);

  const items = useMemo(() => {
    return views.filter((v) => {
      if (v.type !== viewType) return false;
      if (projectId == null || projectId === '') {
        return v.projectId === null;
      }
      return v.projectId === null || v.projectId === projectId;
    });
  }, [views, viewType, projectId]);

  if (items.length === 0) return null;

  const pathMatches = pathname.includes(basePath);
  /** Already on /lenders or /loans — only search params change; use nuqs, not router.push. */
  const onSameTableRoute = pathname.includes(basePath);

  return (
    <ul className="ml-8 space-y-0.5 border-l border-border pl-2">
      {items.map((view) => {
        const href =
          projectId != null && projectId !== ''
            ? `${basePath}?${PROJECT_ID_KEY}=${encodeURIComponent(projectId)}&view=${encodeURIComponent(view.id)}`
            : `${basePath}?view=${encodeURIComponent(view.id)}`;
        const isActive = pathMatches && currentViewId === view.id;

        return (
          <li key={view.id}>
            <button
              type="button"
              onClick={() => {
                if (onSameTableRoute) {
                  void setTableUrl({
                    view: view.id,
                    q: null,
                    sort: null,
                    filters: null,
                    cols: null,
                    page: null,
                    pageSize: null,
                  });
                } else {
                  router.push(href);
                }
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )}
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{view.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
