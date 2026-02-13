'use client';

import { Language, LenderRequiredField, Salutation, SoliLoansTheme } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { FormCountrySelect } from '@/components/form/form-country-select';
import { FormSection } from '@/components/ui/form-section';
import { FormFieldConfigurator } from '../form/form-field-configurator';
import { FormMultiSelect } from '../form/form-multi-select';
import { FormSelect } from '../form/form-select';

export function ConfigurationFormFieldsLender() {
  const t = useTranslations('dashboard.configuration');
  const commonT = useTranslations('common');

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FormSection title={t('form.lenderDefaults')}>
          <FormMultiSelect
            name="lenderRequiredFields"
            label={t('form.lenderRequiredFields')}
            placeholder={commonT('ui.form.noRequiredFields')}
            options={Object.entries(LenderRequiredField).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.requiredField.${key}`),
            }))}
          />

          <FormSelect
            name="lenderSalutation"
            clearable
            label={t('form.lenderSalutation')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(Salutation).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.salutation.${key}`),
            }))}
          />
          <FormCountrySelect
            name="lenderCountry"
            clearable
            label={t('form.lenderCountry')}
            placeholder={commonT('ui.form.noDefault')}
          />
        </FormSection>
        <FormSection title={t('form.userDefaults')}>
          <FormSelect
            name="userLanguage"
            label={t('form.userLanguage')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(Language).map(([key, value]) => ({
              value,
              label: commonT(`enums.language.${key}`),
            }))}
          />
          <FormSelect
            name="userTheme"
            label={t('form.userTheme')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(SoliLoansTheme).map(([key, value]) => ({
              value,
              label: commonT(`enums.theme.${key}`),
            }))}
          />
        </FormSection>
      </div>
      <div className="mt-8">
        <FormSection title={t('form.lenderAdditionalFields')}>
          <FormFieldConfigurator name="lenderAdditionalFields" />
        </FormSection>
      </div>
    </>
  );
}
