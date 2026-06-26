'use client';

import { type InvestmentType, type Lender, LimitationType, type Loan } from '@prisma/client';
import { addMonths, format, startOfDay } from 'date-fns';
import { Calendar, ChevronLeft, Pencil, Telescope, Trash2, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsString, useQueryState } from 'nuqs';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { deleteInvestmentTypeAction } from '@/actions/investment-types';
import { LoanStatusBadge } from '@/components/loans/loan-status-badge';
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
import { InfoText } from '@/components/ui/info-text';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from '@/i18n/navigation';
import {
  calcInvestmentTypeMetrics,
  calcNotMoreThanNUnitsMetrics,
  calcTotalAmount,
  getPastLoans,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { getDefaultEffectiveDate } from '@/lib/investment-types/effective-date';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import { cn, formatCurrency, formatDateShort, formatPercentage, getLenderName } from '@/lib/utils';
import { LoanStatus } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LimitationTypeBadge } from './limitation-type-badge';

type LoanWithLender = Loan & { lender: Lender; status: LoanStatus };

type InvestmentTypeWithRelations = InvestmentType & {
  loans: LoanWithLender[];
  _count: { loans: number };
};

interface Props {
  investmentType: InvestmentTypeWithRelations;
  project: ProjectWithConfiguration;
}

export function InvestmentTypeDetailContent({ investmentType, project }: Props) {
  const t = useTranslations('dashboard.investmentTypes');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompletedLoans, setShowCompletedLoans] = useState(false);
  const isNotMoreThanNUnits = investmentType.limitationType === LimitationType.NOT_MORE_THAN_N_UNITS;
  const [loanTableEffectiveDate, setLoanTableEffectiveDate] = useState('');

  const { executeAsync: deleteAction, isExecuting: isDeleting } = useAction(deleteInvestmentTypeAction);
  const hasAssignedLoans = investmentType._count.loans > 0;
  const visibleLoans =
    isNotMoreThanNUnits && !showCompletedLoans
      ? investmentType.loans.filter((loan) => loan.status !== LoanStatus.REPAID)
      : investmentType.loans;

  const isTotalAmountOverTimePeriod = investmentType.limitationType === LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD;
  const unitsMetrics = useMemo(() => calcNotMoreThanNUnitsMetrics(investmentType.loans), [investmentType.loans]);
  const optionalName = investmentType.name?.trim();
  const formattedInterestRate = formatPercentage(investmentType.interestRate, locale);
  const pageTitle = optionalName
    ? t('detail.pageTitleWithName', { name: optionalName, interestRate: formattedInterestRate })
    : t('detail.pageTitle', { interestRate: formattedInterestRate });

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

  const informationSection = (
    <section className="flex flex-col rounded-lg border bg-background p-6">
      <h2 className="text-sm font-medium text-muted-foreground">{t('detail.information')}</h2>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-muted-foreground">{t('table.limitationType')}</dt>
          <dd className="mt-2">
            <LimitationTypeBadge limitationType={investmentType.limitationType} />
          </dd>
        </div>
      </dl>
    </section>
  );

  const capacitySection = (
    <section className="flex flex-col justify-center rounded-lg border bg-background p-6 md:min-h-[280px]">
      {isTotalAmountOverTimePeriod ? (
        <CapacityCalculator investmentType={investmentType} />
      ) : (
        <>
          <h2 className="text-sm font-medium text-muted-foreground">{t('table.capacity')}</h2>
          <div className="mt-6 flex flex-1 items-center justify-center md:justify-start">
            <div className="w-full">
              <NotMoreThanNUnitsCapacityIndicator currentUnits={unitsMetrics.usedCapacity} />
            </div>
          </div>
        </>
      )}
    </section>
  );

  const loansSection = (
    <section className="space-y-4 rounded-lg border bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lg font-semibold">{t('detail.loans')}</h2>
        {isNotMoreThanNUnits && (
          <div className="flex items-center gap-2">
            <Switch id="showCompletedLoans" checked={showCompletedLoans} onCheckedChange={setShowCompletedLoans} />
            <label htmlFor="showCompletedLoans" className="text-sm font-medium">
              {t('detail.showCompletedLoans')}
            </label>
          </div>
        )}
        {isTotalAmountOverTimePeriod && (
          <TotalAmountOverTimePeriodLoanTableControls
            effectiveDate={loanTableEffectiveDate}
            setEffectiveDate={setLoanTableEffectiveDate}
            t={t}
          />
        )}
      </div>
      {isTotalAmountOverTimePeriod ? (
        <TotalAmountOverTimePeriodLoanTableSection
          emptyMessage={t('detail.noLoans')}
          loans={investmentType.loans}
          projectId={project.id}
          locale={locale}
          t={t}
          effectiveDate={loanTableEffectiveDate}
          setEffectiveDate={setLoanTableEffectiveDate}
        />
      ) : (
        <NotMoreThanNUnitsLoanTableSection
          emptyMessage={showCompletedLoans ? t('detail.noLoans') : t('detail.noOpenLoans')}
          loans={visibleLoans}
          projectId={project.id}
          locale={locale}
          t={t}
        />
      )}
    </section>
  );

  const detailSections = (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        {informationSection}
        {capacitySection}
      </div>
      {loansSection}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            {' '}
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-3xl font-bold">{pageTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>

      {isTotalAmountOverTimePeriod ? (
        <TotalAmountEffectiveDateScope>{detailSections}</TotalAmountEffectiveDateScope>
      ) : (
        detailSections
      )}

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

type EffectiveDateContextValue = {
  effectiveDate: string;
  setEffectiveDate: (date: string) => void;
};

const EffectiveDateContext = createContext<EffectiveDateContextValue | null>(null);

function useTotalAmountEffectiveDate() {
  const context = useContext(EffectiveDateContext);
  if (!context) {
    throw new Error('useTotalAmountEffectiveDate must be used within TotalAmountEffectiveDateScope');
  }
  return context;
}

function TotalAmountEffectiveDateScope({ children }: { children: ReactNode }) {
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(getDefaultEffectiveDate()),
  );
  const value = useMemo(
    () => ({
      effectiveDate,
      setEffectiveDate,
    }),
    [effectiveDate, setEffectiveDate],
  );

  return <EffectiveDateContext.Provider value={value}>{children}</EffectiveDateContext.Provider>;
}

function CapacityCalculator({ investmentType }: { investmentType: InvestmentTypeWithRelations }) {
  const { effectiveDate, setEffectiveDate } = useTotalAmountEffectiveDate();
  const t = useTranslations('dashboard.investmentTypes.capacity');
  const investmentTypesT = useTranslations('dashboard.investmentTypes');
  const locale = useLocale();
  const metrics = useMemo(
    () => calcInvestmentTypeMetrics(investmentType, new Date(effectiveDate)),
    [investmentType, effectiveDate],
  );
  const currentAmount = metrics.usedCapacity;
  const freeAmount = MAX_TOTAL_AMOUNT_EUR - currentAmount;
  const futureLoansLimitCapacity =
    metrics.usedProbe !== undefined &&
    metrics.effectiveDateProbe !== undefined &&
    metrics.usedProbe !== metrics.effectiveDateProbe;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">{t('calculator')}</h2>
        <Input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => {
            if (e.target.value) {
              setEffectiveDate(e.target.value);
            }
          }}
          className="w-auto shrink-0"
          aria-label={investmentTypesT('effectiveDate')}
        />
      </div>
      <div className="flex w-full min-w-0 items-center justify-center gap-6 md:justify-start">
        <div className="shrink-0">
          <DonutIndicator value={currentAmount} limit={MAX_TOTAL_AMOUNT_EUR} className="h-40 w-40">
            <span className="text-lg font-semibold">€</span>
          </DonutIndicator>
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center text-lg sm:text-xl">
          <p className="font-semibold tabular-nums">
            {formatCurrency(currentAmount)} / {formatCurrency(MAX_TOTAL_AMOUNT_EUR)}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {t('freeCapacity', { freeCapacity: formatCurrency(freeAmount, locale) })}
          </p>
          {futureLoansLimitCapacity && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Telescope className="mr-1.5 inline h-4 w-4 shrink-0 align-text-bottom" aria-hidden />
              <InfoText t={t} messageKey="futureLoansLimitCapacity" />
            </p>
          )}
        </div>
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

type LoanTableSectionProps = {
  emptyMessage: string;
  loans: LoanWithLender[];
  projectId: string;
  locale: string;
  t: ReturnType<typeof useTranslations<'dashboard.investmentTypes'>>;
};

function NotMoreThanNUnitsLoanTableSection({ emptyMessage, loans, projectId, locale, t }: LoanTableSectionProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('detail.loanNumber')}</TableHead>
            <TableHead>{t('detail.lender')}</TableHead>
            <TableHead>{t('detail.status')}</TableHead>
            <TableHead>{t('detail.signDate')}</TableHead>
            <TableHead className="text-right">{t('detail.amount')}</TableHead>
            <TableHead className="text-right">{t('detail.interestRate')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>
                  <Link
                    href={`/lenders/${loan.lender.id}?projectId=${projectId}&loanId=${loan.id}`}
                    className="font-medium hover:underline"
                  >
                    #{loan.loanNumber}
                  </Link>
                </TableCell>
                <TableCell>{getLenderName(loan.lender)}</TableCell>
                <TableCell>
                  <LoanStatusBadge status={loan.status} />
                </TableCell>
                <TableCell>{formatDateShort(loan.signDate, locale)}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.amount, locale)}</TableCell>
                <TableCell className="text-right">{formatPercentage(loan.interestRate, locale)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TotalAmountOverTimePeriodLoanTableSection({
  emptyMessage,
  loans,
  projectId,
  locale,
  t,
  effectiveDate,
  setEffectiveDate,
}: LoanTableSectionProps & {
  effectiveDate: string;
  setEffectiveDate: (date: string) => void;
}) {
  const effectiveDateValue = useMemo(
    () => (effectiveDate ? new Date(`${effectiveDate}T00:00:00`) : null),
    [effectiveDate],
  );
  const displayedLoans = useMemo(
    () =>
      [...(effectiveDateValue ? getPastLoans(loans, effectiveDateValue) : loans)].sort(
        (a, b) => a.signDate.getTime() - b.signDate.getTime(),
      ),
    [loans, effectiveDateValue],
  );
  const effectiveDatePeriod = useMemo(
    () =>
      effectiveDateValue
        ? {
            startDate: startOfDay(addMonths(effectiveDateValue, -PERIOD_MONTHS)),
            endDate: effectiveDateValue,
          }
        : null,
    [effectiveDateValue],
  );

  return (
    <div className="space-y-3">
      {effectiveDatePeriod && (
        <p className="pb-1 text-sm text-muted-foreground">
          {t('detail.effectiveDatePeriodDescription', {
            startDate: formatDateShort(effectiveDatePeriod.startDate, locale),
            endDate: formatDateShort(effectiveDatePeriod.endDate, locale),
          })}
        </p>
      )}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0 whitespace-nowrap">{t('detail.signDate')}</TableHead>
              <TableHead>{t('detail.loanNumber')}</TableHead>
              <TableHead>{t('detail.lender')}</TableHead>
              <TableHead className="text-right">{t('detail.amount')}</TableHead>
              <TableHead className="text-right">{t('detail.interestRate')}</TableHead>
              <TableHead className="w-0 whitespace-nowrap text-right">
                {t('detail.investmentAmountAtSignDate')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {effectiveDate ? t('detail.noRelevantLoans') : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayedLoans.map((loan) => {
                const signDateValue = format(new Date(loan.signDate), 'yyyy-MM-dd');
                const isSelectedEffectiveDate = effectiveDate === signDateValue;
                const investmentAmountAtSignDate = calcTotalAmount(getPastLoans(loans, loan.signDate));
                const investmentAmountExceedsLimit = investmentAmountAtSignDate > MAX_TOTAL_AMOUNT_EUR;

                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title={t('detail.setEffectiveDateFromSignDate')}
                          aria-label={t('detail.setEffectiveDateFromSignDate')}
                          onClick={() => setEffectiveDate(signDateValue)}
                          className={cn(
                            'size-7',
                            isSelectedEffectiveDate && 'border-primary text-primary hover:text-primary',
                          )}
                        >
                          <Calendar aria-hidden />
                        </Button>
                        <span
                          className={cn(
                            'whitespace-nowrap tabular-nums select-text',
                            isSelectedEffectiveDate && 'text-primary',
                          )}
                          aria-current={isSelectedEffectiveDate ? 'date' : undefined}
                        >
                          {formatDateShort(loan.signDate, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/loans/${loan.id}/edit?projectId=${projectId}`}
                        className="font-medium hover:underline"
                      >
                        #{loan.loanNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{getLenderName(loan.lender)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(loan.amount, locale)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(loan.interestRate, locale)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {investmentAmountExceedsLimit && (
                          <>
                            <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden />
                            <span className="sr-only">{t('detail.investmentAmountAboveLimit')}</span>
                          </>
                        )}
                        {formatCurrency(investmentAmountAtSignDate, locale)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TotalAmountOverTimePeriodLoanTableControls({
  effectiveDate,
  setEffectiveDate,
  t,
}: {
  effectiveDate: string;
  setEffectiveDate: (date: string) => void;
  t: ReturnType<typeof useTranslations<'dashboard.investmentTypes'>>;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="loanTableEffectiveDate" className="text-sm font-medium whitespace-nowrap">
        {t('effectiveDate')}
      </label>
      <Input
        id="loanTableEffectiveDate"
        type="date"
        value={effectiveDate}
        onChange={(e) => setEffectiveDate(e.target.value)}
        className="w-auto shrink-0"
        aria-label={t('effectiveDate')}
      />
      {effectiveDate && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('detail.clearEffectiveDate')}
          aria-label={t('detail.clearEffectiveDate')}
          onClick={() => setEffectiveDate('')}
          className="size-9 shrink-0"
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}
