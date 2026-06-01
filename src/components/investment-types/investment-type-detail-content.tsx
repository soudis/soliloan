'use client';

import { type InvestmentType, type Lender, LimitationType, type Loan } from '@prisma/client';
import { format, isValid } from 'date-fns';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
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
import { DonutIndicator } from '@/components/ui/donut-indicator';
import { GridIndicator } from '@/components/ui/grid-indicator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from '@/i18n/navigation';
import {
  calcInvestmentTypeMetrics,
  type InvestmentTypeMetrics,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS } from '@/lib/schemas/investment-type';
import { cn, formatCurrency, formatDateShort, getLenderName } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LimitationTypeBadge } from './limitation-type-badge';

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
  const relevantLoanIds = new Set(metrics.effectiveLoans.map((loan) => loan.id));
  const relevantLoans = investmentType.loans.filter((loan) => relevantLoanIds.has(loan.id));
  const loansOutsideTimeframe = investmentType.loans.filter((loan) => !relevantLoanIds.has(loan.id));

  const loanFilterDescription = isTotalAmountOverTimePeriod
    ? loanFilter === 'active'
      ? t('detail.relevantLoansDescription')
      : loanFilter === 'inactive'
        ? t('detail.loansOutsideTimeframeDescription')
        : t('detail.allLoansDescription')
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
                <NotMoreThanNUnitsCapacityIndicator currentUnits={metrics.usedCapacity} />
              ) : (
                <TotalAmountCapacityIndicator currentAmount={metrics.usedCapacity} effectiveDate={effectiveDateValue} />
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('detail.loans')}</h2>
        {isTotalAmountOverTimePeriod && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
            <div className="ml-auto flex items-center gap-3">
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
          allowSignDateSelection={isTotalAmountOverTimePeriod}
          effectiveDate={effectiveDate}
          onSignDateSelect={setEffectiveDate}
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

function TotalAmountCapacityIndicator({
  currentAmount,
  effectiveDate,
}: {
  currentAmount: number;
  effectiveDate?: Date | null;
}) {
  const t = useTranslations('dashboard.investmentTypes.capacity');
  const investmentTypesT = useTranslations('dashboard.investmentTypes');
  const locale = useLocale();

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
      <div className="flex shrink-0 items-center self-center">
        <DonutIndicator value={currentAmount} limit={MAX_TOTAL_AMOUNT_EUR} className="h-40 w-40">
          <span className="text-lg font-semibold">€</span>
        </DonutIndicator>
      </div>
      <div className="flex min-w-0 max-w-full shrink-0 flex-col justify-center self-center text-lg sm:text-xl">
        <p className="font-semibold tabular-nums">
          {formatCurrency(currentAmount)} / {formatCurrency(MAX_TOTAL_AMOUNT_EUR)}
        </p>
        <p className="mt-1 text-base text-muted-foreground">{t('totalAmount')}</p>
        {effectiveDate && isValid(effectiveDate) && (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {investmentTypesT('effectiveDate')}: {formatDateShort(effectiveDate, locale)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function NotMoreThanNUnitsCapacityIndicator({ currentUnits }: { currentUnits: number }) {
  const t = useTranslations('dashboard.investmentTypes.capacity');

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 md:justify-start">
      <div className="mr-2 shrink-0">
        <GridIndicator value={currentUnits} rows={4} cols={5} className="h-40 w-[12.5rem] gap-1.5" />
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums sm:text-xl">
          {currentUnits} / {MAX_UNITS}
        </p>
        <p className="mt-0.5 text-base text-muted-foreground">{t('units')}</p>
      </div>
    </div>
  );
}

function LoanTableSection({
  emptyMessage,
  loans,
  projectId,
  locale,
  t,
  allowSignDateSelection = false,
  effectiveDate,
  onSignDateSelect,
}: {
  emptyMessage: string;
  loans: LoanWithLender[];
  projectId: string;
  locale: string;
  t: ReturnType<typeof useTranslations<'dashboard.investmentTypes'>>;
  allowSignDateSelection?: boolean;
  effectiveDate?: string;
  onSignDateSelect?: (date: string) => void;
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
            loans.map((loan) => {
              const signDateValue = format(new Date(loan.signDate), 'yyyy-MM-dd');
              const isSelectedEffectiveDate = allowSignDateSelection && effectiveDate === signDateValue;

              return (
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
                  <TableCell>
                    {allowSignDateSelection && onSignDateSelect ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        title={t('detail.setEffectiveDateFromSignDate')}
                        aria-label={t('detail.setEffectiveDateFromSignDate')}
                        aria-current={isSelectedEffectiveDate ? 'date' : undefined}
                        onClick={() => onSignDateSelect(signDateValue)}
                        className={cn(
                          'h-auto px-2 py-1 font-normal tabular-nums',
                          isSelectedEffectiveDate && 'border-primary text-primary hover:text-primary',
                        )}
                      >
                        <Calendar aria-hidden />
                        {formatDateShort(loan.signDate, locale)}
                      </Button>
                    ) : (
                      formatDateShort(loan.signDate, locale)
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(loan.amount, locale)}</TableCell>
                  <TableCell className="text-right">{loan.interestRate}%</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
