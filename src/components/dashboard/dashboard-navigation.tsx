'use client';

import { Loader2 } from 'lucide-react';
import type { Session } from 'next-auth';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAppStore, useNavigationUiStore } from '@/store';
import type { ProjectWithConfiguration } from '@/types/projects';
import type { SidebarNavView } from '@/types/sidebar-nav';
import { SidebarNav } from './sidebar-nav';
import { TopNav } from './top-nav';

export default function DashboardNavigation({
  children,
  session,
  projects,
  sidebarViews = [],
}: {
  children: React.ReactNode;
  session: Session;
  projects: ProjectWithConfiguration[];
  sidebarViews?: SidebarNavView[];
}) {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const isProjectSwitching = useNavigationUiStore((s) => s.isProjectSwitching);
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const isDashboardPage = pathname === '/dashboard';
  const isFillHeightPage =
    pathname === '/lenders' ||
    pathname === '/loans' ||
    pathname === '/transactions' ||
    pathname === '/investment-types' ||
    pathname === '/logbook' ||
    pathname === '/projects';

  const isFullWidthPage =
    pathname === '/lenders' ||
    pathname === '/loans' ||
    pathname === '/transactions' ||
    pathname === '/investment-types';

  const showSidebar = session.user.isManager;

  return (
    <div className="flex h-dvh flex-col">
      <TopNav
        session={session}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={toggleSidebar}
        showSidebarToggle={showSidebar}
      />

      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <SidebarNav isSidebarOpen={isSidebarOpen} session={session} projects={projects} sidebarViews={sidebarViews} />
        )}

        {/* Main Content */}
        <main
          className={cn(
            'relative flex-1 bg-[color-mix(in_oklch,var(--background)_60%,var(--muted)_40%)]',
            isFillHeightPage ? 'flex min-h-0 flex-col overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto',
          )}
        >
          {isProjectSwitching && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">{t('switchingProject')}</p>
            </div>
          )}
          <div
            className={cn(
              'mx-auto w-full px-6',
              isFillHeightPage || isFullWidthPage
                ? cn(
                    'flex min-h-0 flex-1 flex-col py-8',
                    isFullWidthPage ? 'max-w-none' : showSidebar ? 'max-w-screen-xl' : 'max-w-screen-lg',
                  )
                : cn(
                    'mx-auto w-full px-6 py-8',
                    isDashboardPage || showSidebar ? 'max-w-screen-xl' : 'max-w-screen-lg',
                    !isDashboardPage && 'container',
                  ),
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
