'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValid } from 'date-fns';
import { Plus, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypeByInterestRateAction } from '@/actions/investment-types';
import { useFormSanityChecks } from '@/components/form/form-sanity-checks-provider';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DonutIndicator } from '@/components/ui/donut-indicator';
import { GridIndicator } from '@/components/ui/grid-indicator';
import { calcInvestmentTypeMetrics } from '@/lib/investment-types/calc-investment-type-metrics';
import {
  buildCapacityLoansForLoanForm,
  evaluateInvestmentTypeCapacitySanityCheck,
} from '@/lib/investment-types/investment-type-capacity-sanity-check';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS } from '@/lib/schemas/investment-type';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { cn, formatCurrency } from '@/lib/utils';
import { useProject } from '../providers/project-provider';

const CAPACITY_EXCEEDED_WARNING_ID = 'investment-type-capacity-exceeded';

interface LoanInvestmentTypeSectionProps {
  isActive: boolean;
  currentLoanId?: string;
}

function InvestmentTypeBlock({
  title,
  headerSuffix,
  children,
}: {
  title: string;
  headerSuffix?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm font-medium">
          {title}
          {headerSuffix && <> – {headerSuffix}</>}
        </p>
      </div>
      {children}
    </div>
  );
}

function TotalAmountCapacityIndicator({ currentAmount }: { currentAmount: number }) {
  const t = useTranslations('dashboard.investmentTypes.capacity');
  const freeAmount = MAX_TOTAL_AMOUNT_EUR - currentAmount;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-start">
      <div className="m-1 flex shrink-0 items-center self-center">
        <DonutIndicator value={currentAmount} limit={MAX_TOTAL_AMOUNT_EUR} className="h-20 w-20">
          <span className="text-sm font-semibold">€</span>
        </DonutIndicator>
      </div>
      <div className="flex min-w-0 max-w-full shrink-0 flex-col justify-center self-center text-sm sm:text-base">
        <p className="font-semibold tabular-nums">
          {formatCurrency(currentAmount)} / {formatCurrency(MAX_TOTAL_AMOUNT_EUR)}
        </p>
        <p className="text-muted-foreground">{t('freeCapacity', { freeCapacity: formatCurrency(freeAmount) })}</p>
      </div>
    </div>
  );
}

function NotMoreThanNUnitsCapacityIndicator({ currentUnits }: { currentUnits?: number | null }) {
  const t = useTranslations('dashboard.investmentTypes.capacity');
  const indicatorValue = currentUnits ?? 0;

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-5 sm:justify-start">
      <div className="shrink-0 p-3 pr-1">
        <GridIndicator value={indicatorValue} rows={4} cols={5} className="h-20 w-[6.25rem] gap-0.5" />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-lg font-semibold tabular-nums">
          {currentUnits} / {MAX_UNITS} {t('units')}
        </p>
      </div>
    </div>
  );
}

export function LoanInvestmentTypeSection({
  isActive,
  currentLoanId,
}: LoanInvestmentTypeSectionProps) {
  const t = useTranslations('dashboard.loans.investmentType');
  const sanityT = useTranslations('dashboard.loans.sanityChecks');
  const investmentTypeFormT = useTranslations('dashboard.investmentTypes.form');
  const { project } = useProject();
  const { setWarning } = useFormSanityChecks();
  const form = useFormContext<LoanFormClientData>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const interestRate = form.watch('interestRate');
  const signDate = form.watch('signDate');
  const amount = form.watch('amount');

  const hasValues = interestRate !== '' && !!signDate;
  const hasMissingInvestmentTypeError = !!form.formState.errors.root?.investmentType;

  const { data, isLoading } = useQuery({
    queryKey: ['investmentType', project.id, interestRate],
    queryFn: async () => {
      if (!hasValues) return null;
      const result = await getInvestmentTypeByInterestRateAction({
        projectId: project.id,
        interestRate,
      });
      return result?.data?.investmentType ?? null;
    },
    enabled: isActive && hasValues,
  });

  const capacityLoans = useMemo(() => {
    if (!data || !signDate) return [];

    return buildCapacityLoansForLoanForm({
      limitationType: data.limitationType,
      loans: data.loans,
      signDate,
      amount,
      currentLoanId,
    });
  }, [data, signDate, amount, currentLoanId]);

  const capacityMetrics = useMemo(() => {
    if (!data || !signDate) return null;

    const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
    if (!isValid(effectiveDate)) return null;

    return calcInvestmentTypeMetrics(
      { limitationType: data.limitationType, loans: capacityLoans },
      effectiveDate,
    );
  }, [data, signDate, capacityLoans]);

  useEffect(() => {
    if (!isActive || isLoading || !data || !signDate) {
      setWarning(CAPACITY_EXCEEDED_WARNING_ID, null);
      return;
    }

    const exceededMetrics = evaluateInvestmentTypeCapacitySanityCheck({
      limitationType: data.limitationType,
      loans: data.loans,
      signDate,
      amount,
      currentLoanId,
    });

    if (!exceededMetrics) {
      setWarning(CAPACITY_EXCEEDED_WARNING_ID, null);
      return;
    }

    const isTotalAmount = data.limitationType === 'TOTAL_AMOUNT_OVER_TIME_PERIOD';
    const message = isTotalAmount
      ? sanityT('investmentTypeCapacityExceededTotalAmount', {
          used: formatCurrency(exceededMetrics.usedCapacity),
          limit: formatCurrency(exceededMetrics.capacityLimit),
        })
      : sanityT('investmentTypeCapacityExceededUnits', {
          used: exceededMetrics.usedCapacity,
          limit: exceededMetrics.capacityLimit,
        });

    setWarning(CAPACITY_EXCEEDED_WARNING_ID, { id: CAPACITY_EXCEEDED_WARNING_ID, message });

    return () => setWarning(CAPACITY_EXCEEDED_WARNING_ID, null);
  }, [isActive, isLoading, data, signDate, amount, currentLoanId, setWarning, sanityT]);

  if (!isActive) {
    return (
      <InvestmentTypeBlock title={t('title')}>
        <p className="text-sm text-muted-foreground">{t('onlyForGermanLenders')}</p>
      </InvestmentTypeBlock>
    );
  }

  if (isLoading) {
    return (
      <InvestmentTypeBlock title={t('title')}>
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </InvestmentTypeBlock>
    );
  }

  if (data && signDate && capacityMetrics) {
    const investmentTypeName = data.name?.trim();

    return (
      <InvestmentTypeBlock
        title={investmentTypeName ? `${t('title')} (${investmentTypeName})` : t('title')}
        headerSuffix={t('usedCapacity')}
      >
        {data.limitationType === 'NOT_MORE_THAN_N_UNITS' ? (
          <NotMoreThanNUnitsCapacityIndicator currentUnits={capacityMetrics.usedCapacity} />
        ) : (
          <TotalAmountCapacityIndicator currentAmount={capacityMetrics.usedCapacity} />
        )}
      </InvestmentTypeBlock>
    );
  }

  return (
    <InvestmentTypeBlock title={t('title')}>
      <p className={cn('text-sm', hasMissingInvestmentTypeError ? 'text-destructive' : 'text-muted-foreground')}>
        {t.rich('noInvestmentType', {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('createNow')}
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{investmentTypeFormT('createTitle')}</DialogTitle>
          </DialogHeader>
          <InvestmentTypeFormClient
            project={project}
            prefilledInterestRate={interestRate}
            fixInterestRate
            hideTitle
            onCancel={() => setIsDialogOpen(false)}
            onSuccess={async () => {
              setIsDialogOpen(false);
              await queryClient.invalidateQueries({ queryKey: ['investmentType', project.id] });
            }}
          />
        </DialogContent>
      </Dialog>
    </InvestmentTypeBlock>
  );
}
