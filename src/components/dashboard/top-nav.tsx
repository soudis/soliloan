'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface TopNavProps {
  session: Session;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  /** When false, hide menu button (lender-only layout without sidebar) */
  showSidebarToggle?: boolean;
}

export function TopNav({ session, isSidebarOpen, setIsSidebarOpen, showSidebarToggle = true }: TopNavProps) {
  const t = useTranslations('navigation');

  const homeHref = !session.user.isManager && session.user.loanedToProjects.length > 0 ? '/my-loans' : '/dashboard';

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href={homeHref} className="flex items-center">
                <Image src="/soliloan-logo.webp" alt="Soliloan AI Logo" width={32} height={32} className="mr-2" />
                <span className="text-lg md:text-xl font-bold text-primary font-comfortaa">
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
          <div className="flex items-center">
            <div className="ml-3 relative hidden md:flex">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
                <Button variant="outline" onClick={() => signOut()}>
                  {t('signOut')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
