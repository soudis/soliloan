'use client';

import { isValid } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypeByInterestRateAction } from '@/actions/investment-types';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { NotMoreThanNUnitsCapacityIndicator } from '@/components/investment-types/not-more-than-n-units-capacity-indicator';
import { TotalAmountCapacityIndicator } from '@/components/investment-types/total-amount-capacity-indicator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormSection } from '@/components/ui/form-section';
import { calcInvestmentTypeMetrics } from '@/lib/investment-types/calc-investment-type-metrics';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { NumberParser } from '@/lib/utils';
import { useProject } from '../providers/project-provider';

interface LoanInvestmentTypeSectionProps {
  hasSelectedLender: boolean;
  isActive: boolean;
  currentLoanId?: string;
}

export function LoanInvestmentTypeSection({ hasSelectedLender, isActive, currentLoanId }: LoanInvestmentTypeSectionProps) {
  const t = useTranslations('dashboard.loans.investmentType');
  const formT = useTranslations('dashboard.loans.new.form');
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

  if (!hasSelectedLender || !hasValues) {
    const missingFields: string[] = [];
    if (!hasSelectedLender) missingFields.push(formT('lender'));
    if (!signDate) missingFields.push(formT('signDate'));
    if (interestRate === '') missingFields.push(formT('interestRate'));

    return (
      <div className="opacity-50 pointer-events-none select-none">
        <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
          <p className="text-sm text-muted-foreground">
            {t('missingRequirements', { fields: missingFields.join(', ') })}
          </p>
        </FormSection>
      </div>
    );
  }

  if (!isActive) {
    return (
      <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
        <p className="text-sm text-muted-foreground">{t('onlyForGermanLenders')}</p>
      </FormSection>
    );
  }

  if (isLoading) {
    return (
      <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </FormSection>
    );
  }

  if (data) {
    const investmentTypeName = data.name?.trim();
    const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
    const metrics = calcInvestmentTypeMetrics({ limitationType: data.limitationType, loans: capacityLoans }, effectiveDate);

    return (
      <FormSection
        icon={<Scale className="w-4 h-4 text-muted-foreground" />}
        title={investmentTypeName ? `${t('title')} (${investmentTypeName})` : t('title')}
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{t('capacity')}</p>
          {data.limitationType === 'NOT_MORE_THAN_N_UNITS' ? (
            <NotMoreThanNUnitsCapacityIndicator currentUnits={metrics.usedCapacity} size="xlarge" />
          ) : (
            <TotalAmountCapacityIndicator currentAmount={metrics.usedCapacity} size="xlarge" />
          )}
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
      <p className="text-sm text-muted-foreground mb-3">
        {t.rich('noInvestmentType', {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setIsDialogOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
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
    </FormSection>
  );
}
