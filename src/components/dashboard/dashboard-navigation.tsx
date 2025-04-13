'use client'

import { useAppStore } from '@/store'
import { ProjectProvider } from '@/store/project-context'
import { Session } from 'next-auth'
import { SidebarNav } from './sidebar-nav'
import { TopNav } from './top-nav'

export default function DashboardNavigation({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const { isSidebarOpen, toggleSidebar } = useAppStore()

  if (!session) {
    return null
  }

  return (
    <ProjectProvider>
      <TopNav
        session={session}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={toggleSidebar}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        <SidebarNav isSidebarOpen={isSidebarOpen} />

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