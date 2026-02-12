'use client';

import { History, LayoutDashboard, LogOut, Settings, Users, Wallet } from 'lucide-react';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { ThemeSelector } from '@/components/theme-selector';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';

import { NavItem } from './nav-item';
import ProjectSelector from './project-selector';

interface SidebarNavProps {
  isSidebarOpen: boolean;
  session: Session;
}

export function SidebarNav({ isSidebarOpen, session }: SidebarNavProps) {
  const t = useTranslations('navigation');
  const commonT = useTranslations('common');
  const { toggleSidebar } = useAppStore();

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleSidebar();
            }
          }}
        />
      )}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-background transition duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="h-full overflow-y-auto px-3 py-4 flex flex-col">
          <ProjectSelector />
          <nav className="space-y-2 flex-grow">
            <NavItem href="/" icon={LayoutDashboard} label={t('dashboard')} />
            <NavItem href="/lenders" icon={Users} label={t('lenders')} />
            <NavItem href="/loans" icon={Wallet} label={t('loans')} />
            <NavItem href="/logbook" icon={History} label={t('logbook')} />
            <NavItem href="/configuration" icon={Settings} label={t('configuration')} />
          </nav>

          {/* Theme Selector at the bottom of the sidebar */}
          <div className="mt-auto pt-4 border-t space-y-4">
            {/* User Profile for Mobile */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-2 px-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{session?.user?.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('signOut')}
              </Button>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{commonT('ui.theme')}</span>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </div>
    </>
  );
}
