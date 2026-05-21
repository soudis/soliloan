'use client';

import { LimitationType, type InvestmentType, type Lender, type Loan } from '@prisma/client';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteInvestmentTypeAction } from '@/actions/investment-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from '@/i18n/navigation';
import {
  calcInvestmentTypeMetrics,
  type InvestmentTypeMetrics,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { formatCurrency, formatDateShort, getLenderName } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LimitationTypeBadge } from './limitation-type-badge';
import { NotMoreThanNUnitsCapacityIndicator } from './not-more-than-n-units-capacity-indicator';
import { TotalAmountCapacityIndicator } from './total-amount-capacity-indicator';

const LOAN_FILTERS = ['active', 'inactive', 'all'] as const;
type LoanTimeframeFilter = (typeof LOAN_FILTERS)[number];

type LoanWithLender = Loan & { lender: Lender };

type InvestmentTypeWithRelations = InvestmentType & {
  loans: LoanWithLender[];
  _count: { loans: number };
};

interface Props {
  investmentType: InvestmentTypeWithRelations;
  project: ProjectWithConfiguration;
  initialEffectiveDate?: string;
  initialMetrics: InvestmentTypeMetrics;
}

export function InvestmentTypeDetailContent({ investmentType, project, initialEffectiveDate, initialMetrics }: Props) {
  const t = useTranslations('dashboard.investmentTypes');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loanFilter, setLoanFilter] = useState<LoanTimeframeFilter>('active');
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd')),
  );
  const effectiveDateValue = new Date(effectiveDate);
  const needsEffectiveDate = investmentType.limitationType !== LimitationType.NOT_MORE_THAN_N_UNITS;

  const { executeAsync: deleteAction, isExecuting: isDeleting } = useAction(deleteInvestmentTypeAction);
  const hasAssignedLoans = investmentType._count.loans > 0;

  const metrics =
    !needsEffectiveDate || effectiveDate === initialEffectiveDate
      ? initialMetrics
      : calcInvestmentTypeMetrics(investmentType, effectiveDateValue);
  const isTotalAmountOverTimePeriod = investmentType.limitationType === LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD;
  const effectiveDateLabel = formatDateShort(effectiveDateValue, locale);
  const relevantLoanIds = new Set(metrics.effectiveLoans.map((loan) => loan.id));
  const relevantLoans = investmentType.loans.filter((loan) => relevantLoanIds.has(loan.id));
  const loansOutsideTimeframe = investmentType.loans.filter((loan) => !relevantLoanIds.has(loan.id));

  const loanFilterDescription = isTotalAmountOverTimePeriod
    ? loanFilter === 'active'
      ? t('detail.relevantLoansDescription', { effectiveDate: effectiveDateLabel })
      : loanFilter === 'inactive'
        ? t('detail.loansOutsideTimeframeDescription', { effectiveDate: effectiveDateLabel })
        : t('detail.allLoansDescription', { effectiveDate: effectiveDateLabel })
    : undefined;

  const handleDelete = async () => {
    const result = await deleteAction({ projectId: project.id, investmentTypeId: investmentType.id });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('detail.deleteSuccess'));
      router.push(`/investment-types?projectId=${project.id}`);
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/investment-types/${investmentType.id}/edit?projectId=${project.id}`}>
            <Pencil className="w-4 h-4 mr-2" />
            {t('detail.edit')}
          </Link>
        </Button>
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          {t('detail.delete')}
        </Button>
      </div>

      {needsEffectiveDate && (
        <div className="flex items-center justify-end gap-3">
          <label htmlFor="effectiveDate" className="text-sm font-medium whitespace-nowrap">
            {t('effectiveDate')}
          </label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => {
              if (e.target.value) {
                setEffectiveDate(e.target.value);
              }
            }}
            className="w-auto"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <section className="flex flex-col rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">{t('detail.information')}</h2>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{investmentType.name?.trim() || t('detail.title')}</h1>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('form.interestRate')}</dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">{investmentType.interestRate}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('table.limitationType')}</dt>
              <dd className="mt-2">
                <LimitationTypeBadge limitationType={investmentType.limitationType} />
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col justify-center rounded-lg border p-6 md:min-h-[280px]">
          <h2 className="text-sm font-medium text-muted-foreground">{t('table.capacity')}</h2>
          <div className="mt-6 flex flex-1 items-center justify-center md:justify-start">
            <div className="w-full">
              {investmentType.limitationType === 'NOT_MORE_THAN_N_UNITS' ? (
                <NotMoreThanNUnitsCapacityIndicator
                  currentUnits={metrics.usedCapacity}
                  size="large"
                  className="justify-center md:justify-start"
                />
              ) : (
                <TotalAmountCapacityIndicator
                  currentAmount={metrics.usedCapacity}
                  size="large"
                  className="justify-center md:justify-start"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('detail.loans')}</h2>
        {isTotalAmountOverTimePeriod && (
          <div className="flex flex-wrap items-center gap-1">
            {LOAN_FILTERS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={loanFilter === key ? 'default' : 'outline'}
                className="text-xs"
                onClick={() => setLoanFilter(key)}
              >
                {t(`detail.loanFilter.${key}`)}
              </Button>
            ))}
          </div>
        )}
        {loanFilterDescription && (
          <p className="max-w-5xl text-sm leading-relaxed text-muted-foreground">{loanFilterDescription}</p>
        )}
        <LoanTableSection
          emptyMessage={
            isTotalAmountOverTimePeriod
              ? loanFilter === 'active'
                ? t('detail.noRelevantLoans')
                : loanFilter === 'inactive'
                  ? t('detail.noLoansOutsideTimeframe')
                  : t('detail.noLoans')
              : t('detail.noLoans')
          }
          loans={
            isTotalAmountOverTimePeriod
              ? loanFilter === 'active'
                ? relevantLoans
                : loanFilter === 'inactive'
                  ? loansOutsideTimeframe
                  : investmentType.loans
              : investmentType.loans
          }
          projectId={project.id}
          locale={locale}
          t={t}
        />
      </section>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          {hasAssignedLoans ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('detail.cannotDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('detail.cannotDeleteDescription', { count: investmentType._count.loans })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{commonT('ui.actions.close')}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('detail.confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>{t('detail.confirmDeleteDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{commonT('ui.actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {t('detail.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoanTableSection({
  emptyMessage,
  loans,
  projectId,
  locale,
  t,
}: {
  emptyMessage: string;
  loans: LoanWithLender[];
  projectId: string;
  locale: string;
  t: ReturnType<typeof useTranslations<'dashboard.investmentTypes'>>;
}) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('detail.loanNumber')}</TableHead>
            <TableHead>{t('detail.lender')}</TableHead>
            <TableHead>{t('detail.signDate')}</TableHead>
            <TableHead className="text-right">{t('detail.amount')}</TableHead>
            <TableHead className="text-right">{t('detail.interestRate')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>
                  <Link
                    href={`/loans/${loan.id}/edit?projectId=${projectId}`}
                    className="font-medium hover:underline"
                  >
                    #{loan.loanNumber}
                  </Link>
                </TableCell>
                <TableCell>{getLenderName(loan.lender)}</TableCell>
                <TableCell>{formatDateShort(loan.signDate, locale)}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.amount, locale)}</TableCell>
                <TableCell className="text-right">{loan.interestRate}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
