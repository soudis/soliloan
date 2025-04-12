'use client'

import { getDashboardStats } from '@/app/actions/dashboard/get-dashboard-stats'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useProject } from '@/store/project-context'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle, Clock, Percent, Users, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()
  const t = useTranslations('dashboard')
  const { selectedProject } = useProject()

  // Fetch dashboard statistics
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return null
      const result = await getDashboardStats(selectedProject.id)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.stats
    },
    enabled: !!selectedProject
  })

  if (!session) {
    return null
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('welcome', { name: session?.user?.name || 'User' })}</h1>

      <div className="mb-8">
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Statistics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 w-24 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsData ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalLenders')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalLenders}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.personLenders')}: {statsData.personLenders} | {t('stats.organisationLenders')}: {statsData.organisationLenders}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalLoans')}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalLoans}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.pendingLoans')}: {statsData.pendingLoans} | {t('stats.completedLoans')}: {statsData.completedLoans}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalLoanAmount')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.totalLoanAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.avgInterestRate')}: {statsData.avgInterestRate.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.loanStatus')}</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-amber-500 mr-1" />
                  <span className="text-sm">{statsData.pendingLoans}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm">{statsData.completedLoans}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('stats.pendingLoans')} / {t('stats.completedLoans')}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('lenders.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('lenders.description')}
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