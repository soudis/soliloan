'use client';

import { History, LayoutDashboard, Settings, Users, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ThemeSelector } from '@/components/theme-selector';
import { useAppStore } from '@/store';

import { NavItem } from './nav-item';
import ProjectSelector from './project-selector';

interface SidebarNavProps {
  isSidebarOpen: boolean;
}

export function SidebarNav({ isSidebarOpen }: SidebarNavProps) {
  const t = useTranslations('navigation');
  const commonT = useTranslations('common');
  const { toggleSidebar } = useAppStore();

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden" onClick={toggleSidebar} />
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
          <div className="mt-auto pt-4 border-t">
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
