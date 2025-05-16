'use client';

import {
  InterestMethod,
  Language,
  LenderRequiredField,
  MembershipStatus,
  NotificationType,
  Salutation,
  SoliLoansTheme,
} from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FormCountrySelect } from '@/components/form/form-country-select';
import { FormField } from '@/components/form/form-field';
import { FormIbanInput } from '@/components/form/form-iban-input';
import { FormMultiSelect } from '@/components/form/form-multi-select';
import { FormSelect } from '@/components/form/form-select';
import { FormSection } from '@/components/ui/form-section';

import { LogoInput } from './logo-input';

import type { ConfigurationFormData } from '@/lib/schemas/configuration';
import { FormChipInput } from '../form/form-chip-input';
import { FormFieldConfigurator } from '../form/form-field-configurator';

interface ConfigurationFormFieldsProps {
  hasHistoricTransactions?: boolean;
}

export function ConfigurationFormFields({ hasHistoricTransactions }: ConfigurationFormFieldsProps) {
  const t = useTranslations('dashboard.configuration');
  const commonT = useTranslations('common');

  const form = useFormContext<ConfigurationFormData>();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General Information Section - Top Left */}
        <FormSection title={t('form.generalInfo')}>
          <FormField name="name" label={`${t('form.name')} *`} placeholder={t('form.namePlaceholder')} />
          <LogoInput form={form} />
        </FormSection>

        {/* Contact Information Section - Top Right */}
        <FormSection title={t('form.contactInfo')}>
          <FormField name="email" label={t('form.email')} placeholder={t('form.emailPlaceholder')} />
          <FormField name="telNo" label={t('form.telNo')} placeholder={t('form.telNoPlaceholder')} />
          <FormField name="website" label={t('form.website')} placeholder={t('form.websitePlaceholder')} />
        </FormSection>

        {/* Address Information Section - Middle Left */}
        <FormSection title={t('form.addressInfo')}>
          <FormField name="street" label={t('form.street')} placeholder={t('form.streetPlaceholder')} />
          <FormField name="addon" label={t('form.addon')} placeholder={t('form.addonPlaceholder')} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField name="zip" label={t('form.zip')} placeholder={t('form.zipPlaceholder')} />
            <FormField name="place" label={t('form.place')} placeholder={t('form.placePlaceholder')} />
            <FormCountrySelect name="country" label={t('form.country')} placeholder={t('form.countryPlaceholder')} />
          </div>
        </FormSection>

        {/* Banking Information Section - Middle Right */}
        <FormSection title={t('form.bankingInfo')}>
          <FormIbanInput name="iban" label={t('form.iban')} placeholder={t('form.ibanPlaceholder')} />
          <FormField name="bic" label={t('form.bic')} placeholder={t('form.bicPlaceholder')} />
        </FormSection>
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
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
          {/* User Defaults Section - Bottom Left */}
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
        {/* Lender Defaults Section - Bottom Right */}
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
          <FormSelect
            name="lenderNotificationType"
            clearable
            label={t('form.lenderNotificationType')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(NotificationType).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.notificationType.${key}`),
            }))}
          />
          <FormSelect
            name="lenderMembershipStatus"
            clearable
            label={t('form.lenderMembershipStatus')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(MembershipStatus).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.membershipStatus.${key}`),
            }))}
          />
          <FormChipInput
            name="lenderTags"
            label={t('form.lenderTags')}
            placeholder={t('form.lenderTagsPlaceholder')}
            hint={t('form.lenderTagsHint')}
            noItems={t('form.noLenderTags')}
          />
        </FormSection>
      </div>

      {/* Lender Additional Fields Section - Full Width */}
      <div className="mt-8">
        <FormSection title={t('form.lenderAdditionalFields')}>
          <FormFieldConfigurator name="lenderAdditionalFields" />
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
