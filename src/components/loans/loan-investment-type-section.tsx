'use client';

import type { LimitationType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Scale } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypeByInterestRateAction } from '@/actions/investment-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const commonT = useTranslations('common');
  const { project } = useProject();
  const form = useFormContext<LoanFormClientData>();

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

  if (!hasValues) return null;

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
      <p className="text-sm text-muted-foreground mb-3">{t('noInvestmentType')}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/investment-types/new?projectId=${project.id}&interestRate=${encodeURIComponent(interestRate)}`}>
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('createNow')}
        </Link>
      </Button>
    </FormSection>
  );
}
