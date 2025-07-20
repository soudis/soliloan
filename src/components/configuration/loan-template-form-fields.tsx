'use client';

import { useTranslations } from 'next-intl';

import { FormField } from '../form/form-field';
import { FormNumberInput } from '../form/form-number-input';
import { TerminationFormFields } from '../loans/termination-form-fields';
import { FormSection } from '../ui/form-section';

export function LoanTemplateFormFields() {
  const t = useTranslations('dashboard.configuration.form.loanTemplates');
  const commonT = useTranslations('common');

  return (
    <>
      <FormSection title={t('templateInfo')}>
        <FormField name="name" label={t('name')} placeholder={commonT('ui.form.enterPlaceholder')} />
      </FormSection>
      <FormSection title={t('terminationInfo')}>
        <TerminationFormFields hideTerminationDate />
      </FormSection>
      <FormSection title={t('amountInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            name="minAmount"
            label={`${t('minAmount')} *`}
            placeholder={t('open')}
            prefix="€"
            min={0.01}
            step={0.01}
          />
          <FormNumberInput
            name="maxAmount"
            label={`${t('maxAmount')} *`}
            placeholder={t('open')}
            prefix="€"
            min={0.01}
            step={0.01}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            name="minInterestRate"
            label={`${t('minInterestRate')} *`}
            placeholder={t('open')}
            prefix="%"
            minimumFractionDigits={0}
            maximumFractionDigits={3}
            min={0}
            step={0.01}
          />
          <FormNumberInput
            name="maxInterestRate"
            label={`${t('maxInterestRate')} *`}
            placeholder={t('open')}
            prefix="%"
            minimumFractionDigits={0}
            maximumFractionDigits={3}
            min={0}
            step={0.01}
          />
        </div>
      </FormSection>
    </>
  );
}
