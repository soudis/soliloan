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
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <FormField
                form={form}
                name="zip"
                label={t('form.zip')}
                placeholder={t('form.zipPlaceholder')}
              />
            </div>
            <div className="col-span-2">
              <FormField
                form={form}
                name="place"
                label={t('form.place')}
                placeholder={t('form.placePlaceholder')}
              />
            </div>
          </div>
          <FormCountrySelect
            form={form}
            name="country"
            label={t('form.country')}
            placeholder={t('form.countryPlaceholder')}
          />
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
            placeholder={t('form.userLanguagePlaceholder')}
            options={[
              { value: 'de', label: t('form.userLanguageDe') },
              { value: 'en', label: t('form.userLanguageEn') },
            ]}
          />
          <FormSelect
            form={form}
            name="userTheme"
            label={t('form.userTheme')}
            placeholder={t('form.userThemePlaceholder')}
            options={[
              { value: 'default', label: t('form.userThemeDefault') },
              { value: 'dark', label: t('form.userThemeDark') },
              { value: 'light', label: t('form.userThemeLight') },
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
            placeholder={t('form.lenderSalutationPlaceholder')}
            options={[
              { value: 'PERSONAL', label: t('form.lenderSalutationPersonal') },
              { value: 'FORMAL', label: t('form.lenderSalutationFormal') },
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
            placeholder={t('form.lenderNotificationTypePlaceholder')}
            options={[
              { value: 'ONLINE', label: t('form.lenderNotificationTypeOnline') },
              { value: 'EMAIL', label: t('form.lenderNotificationTypeEmail') },
              { value: 'MAIL', label: t('form.lenderNotificationTypeMail') },
            ]}
          />
          <FormSelect
            form={form}
            name="lenderMembershipStatus"
            label={t('form.lenderMembershipStatus')}
            placeholder={t('form.lenderMembershipStatusPlaceholder')}
            options={[
              { value: 'UNKNOWN', label: t('form.lenderMembershipStatusUnknown') },
              { value: 'MEMBER', label: t('form.lenderMembershipStatusMember') },
              { value: 'EXTERNAL', label: t('form.lenderMembershipStatusExternal') },
            ]}
          />
        </div>
      </div>

      {/* Loan Defaults Section - Bottom Left (Second Row) */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('form.loanDefaults')}</h2>

        <div className="space-y-4">
          <FormSelect
            form={form}
            name="interestMethod"
            label={t('form.interestMethod')}
            placeholder={t('form.interestMethodPlaceholder')}
            options={[
              { value: 'ACT_365_NOCOMPOUND', label: t('form.interestMethodAct365NoCompound') },
              { value: 'E30_360_NOCOMPOUND', label: t('form.interestMethodE30360NoCompound') },
              { value: 'ACT_360_NOCOMPOUND', label: t('form.interestMethodAct360NoCompound') },
              { value: 'ACT_ACT_NOCOMPOUND', label: t('form.interestMethodActActNoCompound') },
              { value: 'ACT_365_COMPOUND', label: t('form.interestMethodAct365Compound') },
              { value: 'E30_360_COMPOUND', label: t('form.interestMethodE30360Compound') },
              { value: 'ACT_360_COMPOUND', label: t('form.interestMethodAct360Compound') },
              { value: 'ACT_ACT_COMPOUND', label: t('form.interestMethodActActCompound') },
            ]}
          />
        </div>
      </div>
    </div>
  )
} 