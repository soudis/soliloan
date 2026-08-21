'use client';

import type { ViewType } from '@prisma/client';
import { Bookmark } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Link } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { buildTableListHref } from '@/lib/table-list-path';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { SidebarNavView } from '@/types/sidebar-nav';

interface SidebarViewItemsProps {
  views: SidebarNavView[];
  viewType: typeof ViewType.LENDER | typeof ViewType.LOAN | typeof ViewType.TRANSACTION;
  basePath: '/lenders' | '/loans' | '/transactions';
}

export function SidebarViewItems({ views, viewType, basePath }: SidebarViewItemsProps) {
  const projectId = useProjectId();
  const pathname = usePathname();
  const { toggleSidebar } = useAppStore();
  const listPath = `${basePath}/list`;

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

  return (
    <ul className="ml-8 space-y-0.5 border-l border-border pl-2">
      {items.map((view) => {
        const href = buildTableListHref(listPath, view.id, projectId);
        const isActive = pathname.endsWith(`${listPath}/${view.id}`);

        return (
          <li key={view.id}>
            <Link
              href={href}
              onClick={() => {
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
