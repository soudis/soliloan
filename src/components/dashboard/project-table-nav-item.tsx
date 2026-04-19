'use client';

import type { LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useQueryStates } from 'nuqs';

import { Link } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { PROJECT_ID_KEY } from '@/lib/params';
import { tableUrlNuqsOptions, tableUrlParsers } from '@/lib/table-url-parsers';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

interface ProjectTableNavItemProps {
  basePath: '/lenders' | '/loans';
  icon: LucideIcon;
  label: string;
}

/**
 * Lenders/loans list entry: keeps `projectId` in the URL and clears table nuqs (`view`, filters, …)
 * when clicking the section link while already on that route (same issue as sidebar pinned views).
 */
export function ProjectTableNavItem({ basePath, icon: Icon, label }: ProjectTableNavItemProps) {
  const pathname = usePathname();
  const projectId = useProjectId();
  const { toggleSidebar } = useAppStore();
  const [, setTableUrl] = useQueryStates(tableUrlParsers, tableUrlNuqsOptions);

  const href =
    projectId != null && projectId !== '' ? `${basePath}?${PROJECT_ID_KEY}=${encodeURIComponent(projectId)}` : basePath;

  const pathOnly = href.split('?')[0] ?? basePath;
  const onSameTableRoute = pathname.includes(basePath);

  const isActive =
    pathname === pathOnly ||
    pathname.startsWith(`${pathOnly}/`) ||
    pathname.endsWith(pathOnly) ||
    pathname.includes(`/${pathOnly}/`);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onSameTableRoute) {
          e.preventDefault();
          void setTableUrl({
            view: null,
            q: null,
            sort: null,
            filters: null,
            cols: null,
            page: null,
            pageSize: null,
          });
        }
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          toggleSidebar();
        }
      }}
      className={cn(
        'flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="ml-3">{label}</span>
    </Link>
  );
}
