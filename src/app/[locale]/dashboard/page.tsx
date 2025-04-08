'use client'

import { Button } from '@/components/ui/button'
import { FolderKanban, Users, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()
  const t = useTranslations('dashboard')


  if (!session) {
    return null;
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('welcome', { name: session?.user?.name || 'User' })}</h1>

      <div className="mb-8">
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('projects.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('projects.details')}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/projects">{t('projects.viewProjects')}</Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('lenders.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('lenders.details')}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/lenders">{t('lenders.viewLenders')}</Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('loans.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('loans.details')}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/loans">{t('loans.viewLoans')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 