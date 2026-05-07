'use client';

import { ChevronDown, LogOut, Menu, Settings, UserCircle, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavProps {
  session: Session;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export function TopNav({ session, isSidebarOpen, setIsSidebarOpen }: TopNavProps) {
  const t = useTranslations('navigation');
  const displayName = session.user?.name?.trim() || session.user?.email || '';
  const email = session.user?.email;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center">
                <Image src="/soliloan-logo.webp" alt="Soliloan AI Logo" width={32} height={32} className="mr-2" />
                <span className="text-lg md:text-xl font-bold text-primary font-comfortaa">
                  {process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME}
                </span>
              </Link>
            </div>
            <div className="ml-4 flex items-center md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative hidden md:flex">
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
                  <DropdownMenuItem
                    className="gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
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
