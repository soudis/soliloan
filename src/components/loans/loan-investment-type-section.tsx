'use client';

import type { LimitationType } from '@prisma/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypeByInterestRateAction } from '@/actions/investment-types';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormSection } from '@/components/ui/form-section';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { useProject } from '../providers/project-provider';

function getLimitationLabel(type: LimitationType, commonT: ReturnType<typeof useTranslations>) {
  let label: string;
  switch (type) {
    case 'NOT_MORE_THAN_N_UNITS':
      label = commonT('enums.limitationType.NOT_MORE_THAN_N_UNITS', { limit: MAX_UNITS });
      break;
    default:
      label = commonT('enums.limitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD', {
        limit: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(MAX_TOTAL_AMOUNT_EUR),
        timePeriod: `${PERIOD_MONTHS} Monate`,
      });
      break;
  }
  return label;
}

export function LoanInvestmentTypeSection() {
  const t = useTranslations('dashboard.loans.investmentType');
  const investmentTypeFormT = useTranslations('dashboard.investmentTypes.form');
  const commonT = useTranslations('common');
  const { project } = useProject();
  const form = useFormContext<LoanFormClientData>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const interestRate = form.watch('interestRate');
  const signDate = form.watch('signDate');

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
    enabled: hasValues,
  });

  if (!hasValues) {
    return (
      <div className="opacity-50 pointer-events-none select-none">
        <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
          <p className="text-sm text-muted-foreground">{t('missingRequirements')}</p>
        </FormSection>
      </div>
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
    return (
      <FormSection icon={<Scale className="w-4 h-4 text-muted-foreground" />} title={t('title')}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{data.name || t('unnamed')}</span>
            <Badge variant="secondary">{getLimitationLabel(data.limitationType, commonT)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('interestRate')}: {data.interestRate}% &middot; {t('capacity')}: 0
          </p>
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
      <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsDialogOpen(true)}>
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
