'use client';

import { BarChart3, CheckCircle, Clock, Percent, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LoanAmountDistributionChart } from '@/components/dashboard/loan-amount-distribution-chart';
import { LoanStatusChart } from '@/components/dashboard/loan-status-chart';
import { YearlyDataChart } from '@/components/dashboard/yearly-data-chart';
import { YearlyTable } from '@/components/dashboard/yearly-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { LoanWithCalculations } from '@/types/loans';

interface LoanStatusBreakdown {
  active: number;
  repaid: number;
  terminated: number;
  notDeposited: number;
}

interface YearlyDataItem {
  year: number;
  totalAmount: number;
  totalInterest: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

interface YearlyLoanData {
  year: number;
  begin: number;
  end: number;
  withdrawals: number;
  deposits: number;
  notReclaimed: number;
  interestPaid: number;
  interest: number;
}

interface DashboardStats {
  totalLenders: number;
  personLenders: number;
  organisationLenders: number;
  totalLoans: number;
  pendingLoans: number;
  completedLoans: number;
  totalLoanAmount: number;
  avgInterestRate: number;
  totalInterest: number;
  totalInterestPaid: number;
  totalBalance: number;
  totalNotReclaimed: number;
  totalDeposits: number;
  totalWithdrawals: number;
  loanStatusBreakdown: LoanStatusBreakdown;
  yearlyData: YearlyDataItem[];
  yearlyLoanData: YearlyLoanData[];
  totalLenderAmount: number;
  totalLenderInterest: number;
  totalLenderBalance: number;
}

interface LoanDistribution {
  range: string;
  count: number;
  totalAmount: number;
}

interface DashboardContentProps {
  statsData: DashboardStats | null;
  loansDistribution: LoanDistribution[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loans: LoanWithCalculations[];
  userName: string;
  projectId: string;
}

export function DashboardContent({ statsData, loansDistribution, loans, userName, projectId }: DashboardContentProps) {
  const t = useTranslations('dashboard');

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('welcome', { name: userName })}</h1>

      <div className="mb-8">
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Statistics Cards */}
      {statsData ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalLenders')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalLenders}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.personLenders')}: {statsData.personLenders} | {t('stats.organisationLenders')}:{' '}
                {statsData.organisationLenders}
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
                {t('stats.pendingLoans')}: {statsData.pendingLoans} | {t('stats.completedLoans')}:{' '}
                {statsData.completedLoans}
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

      {/* Additional Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalInterest')}</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.totalInterest)}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.interestPaid')}: {formatCurrency(statsData.totalInterestPaid)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalBalance')}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.totalBalance)}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.notReclaimed')}: {formatCurrency(statsData.totalNotReclaimed)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalDeposits')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.totalDeposits)}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.withdrawals')}: {formatCurrency(statsData.totalWithdrawals)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {statsData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
          <LoanStatusChart data={statsData.loanStatusBreakdown} />
          <YearlyDataChart data={statsData.yearlyData} />
        </div>
      )}

      {/* Loan Amount Distribution Chart */}
      {statsData && loansDistribution.length > 0 && (
        <div className="mb-8">
          <LoanAmountDistributionChart data={loansDistribution} loans={loans} />
        </div>
      )}

      {/* Yearly Table Section */}
      {statsData?.yearlyLoanData && statsData.yearlyLoanData.length > 0 && (
        <YearlyTable data={statsData.yearlyLoanData} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('lenders.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('lenders.description')}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${projectId}/lenders`}>{t('lenders.viewLenders')}</Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t('loans.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('loans.details')}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${projectId}/loans`}>{t('loans.viewLoans')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
