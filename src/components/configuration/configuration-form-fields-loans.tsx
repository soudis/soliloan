'use client';

import { InterestMethod } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { FormSection } from '@/components/ui/form-section';
import type { ProjectWithConfiguration } from '@/types/projects';
import { FormFieldConfigurator } from '../form/form-field-configurator';
import { FormMultiSelect } from '../form/form-multi-select';
import { FormSelect } from '../form/form-select';
import { LoanTemplateTable } from './loan-template-table';

interface ConfigurationFormFieldsLoansProps {
  hasHistoricTransactions?: boolean;
  project: ProjectWithConfiguration;
}

export function ConfigurationFormFieldsLoans({ hasHistoricTransactions, project }: ConfigurationFormFieldsLoansProps) {
  const t = useTranslations('dashboard.configuration');
  const commonT = useTranslations('common');

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FormSection title={t('form.loanDefaults')}>
          <FormSelect
            name="interestMethod"
            label={t('form.interestMethod')}
            disabled={hasHistoricTransactions}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={Object.entries(InterestMethod).map(([key, value]) => ({
              value,
              label: commonT(`enums.interestMethod.${key}`),
            }))}
            hint={hasHistoricTransactions ? t('form.hasHistoricTransactions') : undefined}
          />
          <FormMultiSelect
            name="altInterestMethods"
            label={t('form.altInterestMethods')}
            placeholder={t('form.noAltInterestMethods')}
            options={Object.entries(InterestMethod).map(([key, value]) => ({
              value,
              label: commonT(`enums.interestMethod.${key}`),
            }))}
            hint={t('form.altInterestMethodsHint')}
          />
        </FormSection>
        <FormSection title={t('form.loanTemplates.loanTemplates')}>
          <LoanTemplateTable
            configurationId={project.configuration.id}
            loanTemplates={project.configuration.loanTemplates}
          />
        </FormSection>
      </div>
      <div className="mt-8">
        <FormSection title={t('form.loanAdditionalFields')}>
          <FormFieldConfigurator name="loanAdditionalFields" />
        </FormSection>
      </div>
    </>
  );
}
