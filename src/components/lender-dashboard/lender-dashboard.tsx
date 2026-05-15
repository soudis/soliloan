'use client';

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Landmark, Percent, Table2, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';

import type { LendersByUserAggregates } from '@/actions/lenders/queries/get-lenders-by-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

import { LenderLoanList } from './lender-loan-list';

type Props = {
  loans: LoanDetailsWithCalculations[];
  aggregates: LendersByUserAggregates;
  /** Display name for welcome line (falls back to guest copy if empty) */
  userName?: string | null;
};

export function LenderDashboard({ loans, aggregates, userName }: Props) {
  const t = useTranslations('dashboard.myLoans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const loanListSectionRef = useRef<HTMLElement>(null);

  return (
    <div className="space-y-8 mb-256">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {userName?.trim() ? t('welcome', { name: userName.trim() }) : t('welcomeGuest')}
        </h1>
        <div className="text-muted-foreground space-y-2 text-sm leading-relaxed">
          <p>{t('description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
            <CardTitle className="text-sm font-medium">{t('kpi.loanCount')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregates.totalLoanCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{t('kpi.totalBalance')}</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(aggregates.totalBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{t('kpi.interest')}</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(aggregates.totalInterest)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{t('kpi.recentActivity')}</CardTitle>
          <Table2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {aggregates.recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('kpi.noRecentActivity')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('activity.date')}</TableHead>
                  <TableHead className="text-xs">{t('activity.project')}</TableHead>
                  <TableHead className="text-xs">{t('activity.type')}</TableHead>
                  <TableHead className="text-xs text-right">{t('activity.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregates.recentActivities.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs py-2">
                      {format(new Date(row.date), 'P', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-xs py-2 max-w-[160px] truncate" title={row.projectName}>
                      {row.projectName}
                    </TableCell>
                    <TableCell className="text-xs py-2">{commonT(`enums.transaction.type.${row.type}`)}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono">{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <section ref={loanListSectionRef} className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold">{t('loansSection')}</h2>
        <LenderLoanList loans={loans} scrollAnchorRef={loanListSectionRef} />
      </section>
    </div>
  );
}
