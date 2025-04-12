'use client'

import { FormCountrySelect } from '@/components/form/form-country-select'
import { FormField } from '@/components/form/form-field'
import { FormIbanInput } from '@/components/form/form-iban-input'
import { FormSelect } from '@/components/form/form-select'
import type { ConfigurationFormData } from '@/lib/schemas/configuration'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface ConfigurationFormFieldsProps {
  form: UseFormReturn<ConfigurationFormData>
}

export function ConfigurationFormFields({ form }: ConfigurationFormFieldsProps) {
  const t = useTranslations('dashboard.configuration')
  const commonT = useTranslations('common')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section - Top Left */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.generalInfo')}</h2>

        <div className="space-y-4">
          <FormField
            form={form}
            name="name"
            label={t('form.name') + ' *'}
            placeholder={t('form.namePlaceholder')}
          />
        </div>
      </div>

      {/* Contact Information Section - Top Right */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.contactInfo')}</h2>

        <div className="space-y-4">
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
        </div>
      </div>

      {/* Address Information Section - Middle Left */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.addressInfo')}</h2>

        <div className="space-y-4">
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
        </div>
      </div>

      {/* Banking Information Section - Middle Right */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.bankingInfo')}</h2>

        <div className="space-y-4">
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
        </div>
      </div>

      {/* User Defaults Section - Bottom Left */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.userDefaults')}</h2>

        <div className="space-y-4">
          <FormSelect
            form={form}
            name="userLanguage"
            label={t('form.userLanguage')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'de', label: t('form.userLanguageDe') },
              { value: 'en', label: t('form.userLanguageEn') },
            ]}
          />
          <FormSelect
            form={form}
            name="userTheme"
            label={t('form.userTheme')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'default', label: commonT('enums.theme.DEFAULT') },
              { value: 'dark', label: commonT('enums.theme.DARK') },
              { value: 'light', label: commonT('enums.theme.LIGHT') },
            ]}
          />
        </div>
      </div>

      {/* Lender Defaults Section - Bottom Right */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.lenderDefaults')}</h2>

        <div className="space-y-4">
          <FormSelect
            form={form}
            name="lenderSalutation"
            label={t('form.lenderSalutation')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'PERSONAL', label: commonT('enums.lender.salutation.PERSONAL') },
              { value: 'FORMAL', label: commonT('enums.lender.salutation.FORMAL') },
            ]}
          />
          <FormCountrySelect
            form={form}
            name="lenderCountry"
            label={t('form.lenderCountry')}
            placeholder={t('form.lenderCountryPlaceholder')}
          />
          <FormSelect
            form={form}
            name="lenderNotificationType"
            label={t('form.lenderNotificationType')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'ONLINE', label: commonT('enums.lender.notificationType.ONLINE') },
              { value: 'EMAIL', label: commonT('enums.lender.notificationType.EMAIL') },
              { value: 'MAIL', label: commonT('enums.lender.notificationType.MAIL') },
            ]}
          />
          <FormSelect
            form={form}
            name="lenderMembershipStatus"
            label={t('form.lenderMembershipStatus')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'UNKNOWN', label: commonT('enums.lender.membershipStatus.UNKNOWN') },
              { value: 'MEMBER', label: commonT('enums.lender.membershipStatus.MEMBER') },
              { value: 'EXTERNAL', label: commonT('enums.lender.membershipStatus.EXTERNAL') },
            ]}
          />
        </div>
      </div>

      {/* Loan Defaults Section - Bottom Full Width */}
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.loanDefaults')}</h2>

        <div className="space-y-4">
          <FormSelect
            form={form}
            name="interestMethod"
            label={t('form.interestMethod')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'ACT_365_NOCOMPOUND', label: commonT('enums.interestMethod.ACT365NOCOMPOUND') },
              { value: 'E30_360_NOCOMPOUND', label: commonT('enums.interestMethod.E30360NOCOMPOUND') },
              { value: 'ACT_360_NOCOMPOUND', label: commonT('enums.interestMethod.ACT360NOCOMPOUND') },
              { value: 'ACT_ACT_NOCOMPOUND', label: commonT('enums.interestMethod.ACTACTNOCOMPOUND') },
              { value: 'ACT_365_COMPOUND', label: commonT('enums.interestMethod.ACT365COMPOUND') },
              { value: 'E30_360_COMPOUND', label: commonT('enums.interestMethod.E30360COMPOUND') },
              { value: 'ACT_360_COMPOUND', label: commonT('enums.interestMethod.ACT360COMPOUND') },
              { value: 'ACT_ACT_COMPOUND', label: commonT('enums.interestMethod.ACTACTCOMPOUND') },
            ]}
          />
        </div>
      </div>
    </div>
  )
} 