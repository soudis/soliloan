'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { ProjectProvider } from '@/store/project-context'
import { FolderKanban, LayoutDashboard, Menu, Settings, Users, Wallet, X } from 'lucide-react'
import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import ProjectSelector from './ProjectSelector'

export default function DashboardNavigation({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const t = useTranslations('navigation')

  if (!session) {
    return null
  }

  return (
    <ProjectProvider>
      {/* Top Navigation Bar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/dashboard" className="flex items-center">
                  <Image
                    src="/soliloan-logo.webp"
                    alt="Soliloan AI Logo"
                    width={32}
                    height={32}
                    className="mr-2"
                  />
                  <span className="text-xl font-bold text-primary font-comfortaa">Soliloan AI</span>
                </Link>
              </div>
              <div className="ml-4 flex items-center md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {session.user?.name || session.user?.email}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => signOut()}
                  >
                    {t('signOut')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div
          className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-background transition duration-300 ease-in-out md:relative md:translate-x-0`}
        >
          <div className="h-full overflow-y-auto px-3 py-4">
            <ProjectSelector />
            <nav className="space-y-2">
              <Link
                href="/dashboard"
                className="flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="ml-3">{t('dashboard')}</span>
              </Link>
              <Link
                href="/dashboard/projects"
                className="flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <FolderKanban className="h-5 w-5" />
                <span className="ml-3">{t('projects')}</span>
              </Link>
              <Link
                href="/dashboard/lenders"
                className="flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Users className="h-5 w-5" />
                <span className="ml-3">{t('lenders')}</span>
              </Link>
              <Link
                href="/dashboard/loans"
                className="flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Wallet className="h-5 w-5" />
                <span className="ml-3">{t('loans')}</span>
              </Link>
              <Link
                href="/dashboard/configuration"
                className="flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-5 w-5" />
                <span className="ml-3">{t('configuration')}</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto py-8 px-6">
            {children}
          </div>
        </main>
      </div>
    </ProjectProvider>
  )
} 