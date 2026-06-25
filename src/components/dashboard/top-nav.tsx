'use client';

import { ChevronDown, Clock, LogOut, Menu, Settings, UserCircle, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { AboutMenu } from '@/components/dashboard/about-menu';
import { ThemeModeDropdownItems } from '@/components/theme-mode-switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link as LocaleLink } from '@/i18n/navigation';

interface TopNavProps {
  session: Session;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  /** When false, hide menu button (lender-only layout without sidebar) */
  showSidebarToggle?: boolean;
}

export function TopNav({ session, isSidebarOpen, setIsSidebarOpen, showSidebarToggle = true }: TopNavProps) {
  const t = useTranslations('navigation');
  const displayName = session.user?.name?.trim() || session.user?.email || '';
  const email = session.user?.email;

  const homeHref = !session.user.isManager && session.user.loanedToProjects.length > 0 ? '/my-loans' : '/dashboard';

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href={homeHref} className="flex items-center">
                <Image src="/soliloan-logo.webp" alt="Soliloan AI Logo" width={32} height={32} className="mr-2" />
                <span className="text-lg md:text-xl font-bold text-primary">
                  {process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME}
                </span>
              </Link>
            </div>
            {showSidebarToggle && (
              <div className="ml-4 flex items-center md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                  {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {session.user.isManager && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                aria-label={t('procrastinator')}
                title={t('procrastinator')}
              >
                <LocaleLink href="/procrastinator">
                  <Clock className="h-4 w-4 shrink-0 opacity-80" />
                </LocaleLink>
              </Button>
            )}
            <AboutMenu />
            <div className="relative ml-2 flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="group h-9 gap-2 px-2 text-sm font-medium">
                    <UserCircle className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="max-w-[220px] truncate">{displayName}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[14rem]">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block truncate text-sm font-semibold leading-none">{displayName}</span>
                    {email && email !== displayName ? (
                      <span className="mt-1.5 block truncate text-xs font-normal text-muted-foreground">{email}</span>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex cursor-pointer items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {t('account')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ThemeModeDropdownItems />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
