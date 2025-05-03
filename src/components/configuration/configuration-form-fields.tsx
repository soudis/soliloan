'use client'

import { FormCountrySelect } from '@/components/form/form-country-select'
import { FormField } from '@/components/form/form-field'
import { FormIbanInput } from '@/components/form/form-iban-input'
import { FormMultiSelect } from '@/components/form/form-multi-select'
import { FormSelect } from '@/components/form/form-select'
import { FormSection } from '@/components/ui/form-section'
import type { ConfigurationFormData } from '@/lib/schemas/configuration'
import { InterestMethod, Language, LenderRequiredField, MembershipStatus, NotificationType, Salutation, SoliLoansTheme } from '@prisma/client'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface ConfigurationFormFieldsProps {
  form: UseFormReturn<ConfigurationFormData>
  hasHistoricTransactions?: boolean
}

export function ConfigurationFormFields({ form, hasHistoricTransactions }: ConfigurationFormFieldsProps) {
  const t = useTranslations('dashboard.configuration')
  const commonT = useTranslations('common')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section - Top Left */}
      <FormSection title={t('form.generalInfo')}>
        <FormField
          form={form}
          name="name"
          label={t('form.name') + ' *'}
          placeholder={t('form.namePlaceholder')}
        />
      </FormSection>

      {/* Contact Information Section - Top Right */}
      <FormSection title={t('form.contactInfo')}>
        <FormField
          form={form}
          name="email"
          label={t('form.email')}
          placeholder={t('form.emailPlaceholder')}
        />
        <FormField
          form={form}
          name="telNo"
          label={t('form.telNo')}
          placeholder={t('form.telNoPlaceholder')}
        />
        <FormField
          form={form}
          name="website"
          label={t('form.website')}
          placeholder={t('form.websitePlaceholder')}
        />
      </FormSection>

      {/* Address Information Section - Middle Left */}
      <FormSection title={t('form.addressInfo')}>
        <FormField
          form={form}
          name="street"
          label={t('form.street')}
          placeholder={t('form.streetPlaceholder')}
        />
        <FormField
          form={form}
          name="addon"
          label={t('form.addon')}
          placeholder={t('form.addonPlaceholder')}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            form={form}
            name="zip"
            label={t('form.zip')}
            placeholder={t('form.zipPlaceholder')}
          />
          <FormField
            form={form}
            name="place"
            label={t('form.place')}
            placeholder={t('form.placePlaceholder')}
          />
          <FormCountrySelect
            form={form}
            name="country"
            label={t('form.country')}
            placeholder={t('form.countryPlaceholder')}
          />
        </div>
      </FormSection>

      {/* Banking Information Section - Middle Right */}
      <FormSection title={t('form.bankingInfo')}>
        <FormIbanInput
          name="iban"
          label={t('form.iban')}
          placeholder={t('form.ibanPlaceholder')}
        />
        <FormField
          form={form}
          name="bic"
          label={t('form.bic')}
          placeholder={t('form.bicPlaceholder')}
        />
      </FormSection>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <FormSection title={t('form.loanDefaults')} >
          <FormSelect
            form={form}
            name="interestMethod"
            label={t('form.interestMethod')}
            disabled={hasHistoricTransactions}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={Object.entries(InterestMethod).map(([key, value]) => ({
              value,
              label: commonT(`enums.interestMethod.${key}`)
            }))}
            hint={hasHistoricTransactions ? t('form.hasHistoricTransactions') : undefined}
          />
          <FormMultiSelect
            form={form}
            name="altInterestMethods"
            label={t('form.altInterestMethods')}
            placeholder={t('form.noAltInterestMethods')}
            options={Object.entries(InterestMethod).map(([key, value]) => ({
              value,
              label: commonT(`enums.interestMethod.${key}`)
            }))}
            hint={t('form.altInterestMethodsHint')}
          />
        </FormSection>
        {/* User Defaults Section - Bottom Left */}
        <FormSection title={t('form.userDefaults')}>
          <FormSelect
            form={form}
            name="userLanguage"
            label={t('form.userLanguage')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(Language).map(([key, value]) => ({
              value,
              label: commonT(`enums.language.${key}`)
            }))}
          />
          <FormSelect
            form={form}
            name="userTheme"
            label={t('form.userTheme')}
            placeholder={commonT('ui.form.noDefault')}
            options={Object.entries(SoliLoansTheme).map(([key, value]) => ({
              value,
              label: commonT(`enums.theme.${key}`)
            }))}
          />
        </FormSection>
      </div>
      {/* Lender Defaults Section - Bottom Right */}
      <FormSection title={t('form.lenderDefaults')}>
        <FormMultiSelect
          form={form}
          name="lenderRequiredFields"
          label={t('form.lenderRequiredFields')}
          placeholder={commonT('ui.form.noRequiredFields')}
          options={Object.entries(LenderRequiredField).map(([key, value]) => ({
            value,
            label: commonT(`enums.lender.requiredField.${key}`)
          }))}
        />

        <FormSelect
          form={form}
          name="lenderSalutation"
          clearable
          label={t('form.lenderSalutation')}
          placeholder={commonT('ui.form.noDefault')}
          options={Object.entries(Salutation).map(([key, value]) => ({
            value,
            label: commonT(`enums.lender.salutation.${key}`)
          }))}
        />
        <FormCountrySelect
          form={form}
          name="lenderCountry"
          clearable
          label={t('form.lenderCountry')}
          placeholder={commonT('ui.form.noDefault')}
        />
        <FormSelect
          form={form}
          name="lenderNotificationType"
          clearable
          label={t('form.lenderNotificationType')}
          placeholder={commonT('ui.form.noDefault')}
          options={Object.entries(NotificationType).map(([key, value]) => ({
            value,
            label: commonT(`enums.lender.notificationType.${key}`)
          }))}
        />
        <FormSelect
          form={form}
          name="lenderMembershipStatus"
          clearable
          label={t('form.lenderMembershipStatus')}
          placeholder={commonT('ui.form.noDefault')}
          options={Object.entries(MembershipStatus).map(([key, value]) => ({
            value,
            label: commonT(`enums.lender.membershipStatus.${key}`)
          }))}
        />
      </FormSection>


    </div>
  )
} 