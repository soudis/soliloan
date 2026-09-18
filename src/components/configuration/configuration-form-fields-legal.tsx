'use client';

import { Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormSection } from '@/components/ui/form-section';
import { DeInvestmentActComplianceSwitch } from './de-investment-act-compliance-switch';

interface ConfigurationFormFieldsLegalProps {
  projectId: string;
  germanLoansCount: number;
}

export function ConfigurationFormFieldsLegal({ projectId, germanLoansCount }: ConfigurationFormFieldsLegalProps) {
  const t = useTranslations('dashboard.configuration');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <FormSection
        title={t('form.deInvestmentActCompliance.title')}
        icon={<Scale className="h-4 w-4 text-muted-foreground" />}
      >
        <DeInvestmentActComplianceSwitch projectId={projectId} germanLoansCount={germanLoansCount} />
      </FormSection>
    </div>
  );
}
