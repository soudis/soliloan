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
import { useProject } from '../providers/project-provider';

export function LoanInvestmentTypeSection() {
  const t = useTranslations('dashboard.loans.investmentType');
  const commonT = useTranslations('common');
  const { project } = useProject();
  const form = useFormContext();

  const interestRate = form.watch('interestRate');
  const signDate = form.watch('signDate');

  const interestRateStr = typeof interestRate === 'string' ? interestRate : String(interestRate ?? '');
  const hasValues = interestRateStr !== '' && !!signDate;

  const { data, isLoading } = useQuery({
    queryKey: ['investmentType', project.id, interestRateStr],
    queryFn: async () => {
      if (!hasValues) return null;
      const result = await getInvestmentTypeByInterestRateAction({
        projectId: project.id,
        interestRate: interestRateStr,
      });
      return result?.data?.investmentType ?? null;
    },
    enabled: hasValues,
  });

  if (!hasValues) return null;

  const limitationLabel = (type: LimitationType) => commonT(`enums.limitationType.${type}`);

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
            <Badge variant="secondary">{limitationLabel(data.limitationType)}</Badge>
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
        <Link href={`/investment-types/new?projectId=${project.id}&interestRate=${encodeURIComponent(interestRateStr)}`}>
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('createNow')}
        </Link>
      </Button>
    </FormSection>
  );
}
