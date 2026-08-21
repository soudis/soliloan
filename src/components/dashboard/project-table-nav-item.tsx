'use client';

import type { LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { buildTableListHref } from '@/lib/table-list-path';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

interface ProjectTableNavItemProps {
  basePath: '/lenders' | '/loans' | '/transactions' | '/investment-types';
  icon: LucideIcon;
  label: string;
}

/** Lenders/loans/transactions/investment-types list entry: keeps `projectId` in the URL. */
export function ProjectTableNavItem({ basePath, icon: Icon, label }: ProjectTableNavItemProps) {
  const pathname = usePathname();
  const projectId = useProjectId();
  const { toggleSidebar } = useAppStore();
  const href = buildTableListHref(`${basePath}/list`, null, projectId);

  const isActive = pathname.includes(`${basePath}/`) || pathname.endsWith(basePath);

  return (
    <Link
      href={href}
      onClick={() => {
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
