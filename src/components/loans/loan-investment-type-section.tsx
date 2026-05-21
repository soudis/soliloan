'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValid } from 'date-fns';
import { Plus, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypeByInterestRateAction } from '@/actions/investment-types';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { NotMoreThanNUnitsCapacityIndicator } from '@/components/investment-types/not-more-than-n-units-capacity-indicator';
import { TotalAmountCapacityIndicator } from '@/components/investment-types/total-amount-capacity-indicator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calcInvestmentTypeMetrics } from '@/lib/investment-types/calc-investment-type-metrics';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { cn, NumberParser } from '@/lib/utils';
import { useProject } from '../providers/project-provider';

interface LoanInvestmentTypeSectionProps {
  isActive: boolean;
  currentLoanId?: string;
  missingInvestmentTypeWarning?: boolean;
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
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
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

export function LoanInvestmentTypeSection({
  isActive,
  currentLoanId,
  missingInvestmentTypeWarning = false,
}: LoanInvestmentTypeSectionProps) {
  const t = useTranslations('dashboard.loans.investmentType');
  const investmentTypeFormT = useTranslations('dashboard.investmentTypes.form');
  const { project } = useProject();
  const form = useFormContext<LoanFormClientData>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const interestRate = form.watch('interestRate');
  const signDate = form.watch('signDate');
  const amount = form.watch('amount');

  const hasValues = interestRate !== '' && !!signDate;

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

  const capacityAmount = data?.limitationType === 'TOTAL_AMOUNT_OVER_TIME_PERIOD' ? amount : null;

  const capacityLoans = useMemo(() => {
    if (!data || !signDate) return [];

    const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
    const isTotalAmountLimitation = data.limitationType === 'TOTAL_AMOUNT_OVER_TIME_PERIOD';

    const otherLoans = data.loans
      .filter((loan) => !currentLoanId || loan.id !== currentLoanId)
      .map((loan) => ({
        id: loan.id,
        amount: loan.amount,
        signDate: new Date(loan.signDate),
      }));

    if (!isValid(effectiveDate)) {
      return otherLoans;
    }

    if (!isTotalAmountLimitation) {
      otherLoans.push({
        id: currentLoanId ?? '__current__',
        amount: 0,
        signDate: effectiveDate,
      });
      return otherLoans;
    }

    const parser = new NumberParser('de-DE');
    const parsedAmount = typeof capacityAmount === 'string' ? parser.parse(capacityAmount) : null;
    if (parsedAmount && !Number.isNaN(parsedAmount) && parsedAmount > 0) {
      otherLoans.push({
        id: currentLoanId ?? '__current__',
        amount: parsedAmount,
        signDate: effectiveDate,
      });
    }

    return otherLoans;
  }, [data, capacityAmount, signDate, currentLoanId]);

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

  if (data && signDate) {
    const investmentTypeName = data.name?.trim();
    const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
    const metrics = calcInvestmentTypeMetrics(
      { limitationType: data.limitationType, loans: capacityLoans },
      effectiveDate,
    );

    return (
      <InvestmentTypeBlock
        title={investmentTypeName ? `${t('title')} (${investmentTypeName})` : t('title')}
        headerSuffix={t('usedCapacity')}
      >
        {data.limitationType === 'NOT_MORE_THAN_N_UNITS' ? (
          <NotMoreThanNUnitsCapacityIndicator currentUnits={metrics.usedCapacity} size="small" />
        ) : (
          <TotalAmountCapacityIndicator currentAmount={metrics.usedCapacity} size="small" />
        )}
      </InvestmentTypeBlock>
    );
  }

  return (
    <InvestmentTypeBlock title={t('title')}>
      <p className={cn('text-sm', missingInvestmentTypeWarning ? 'text-destructive' : 'text-muted-foreground')}>
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
