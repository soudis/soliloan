'use client';

import { Loader2 } from 'lucide-react';
import type { Session } from 'next-auth';
import { useTranslations } from 'next-intl';

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
  session: Session | null;
  projects: ProjectWithConfiguration[];
  sidebarViews?: SidebarNavView[];
}) {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const isProjectSwitching = useNavigationUiStore((s) => s.isProjectSwitching);
  const t = useTranslations('navigation');

  if (!session) {
    return null;
  }

  const showSidebar = session.user.isManager;

  return (
    <>
      <TopNav
        session={session}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={toggleSidebar}
        showSidebarToggle={showSidebar}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {showSidebar && (
          <SidebarNav isSidebarOpen={isSidebarOpen} session={session} projects={projects} sidebarViews={sidebarViews} />
        )}

        {/* Main Content */}
        <main className="relative flex-1 overflow-y-auto bg-background">
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
          <div className={cn('container mx-auto py-8 px-6', showSidebar ? 'max-w-screen-xl' : 'max-w-screen-lg')}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
