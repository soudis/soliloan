'use client'

import { FormCountrySelect } from '@/components/form/form-country-select'
import { FormField } from '@/components/form/form-field'
import { FormIbanInput } from '@/components/form/form-iban-input'
import { FormSelect } from '@/components/form/form-select'
import type { LenderFormData } from '@/lib/schemas/lender'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface LenderFormFieldsProps {
  form: UseFormReturn<LenderFormData>
}

export function LenderFormFields({ form }: LenderFormFieldsProps) {
  const t = useTranslations('dashboard.lenders')
  const commonT = useTranslations('common')
  const type = form.watch('type')
  const salutation = form.watch('salutation')

  return (
    <>
      {/* General Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.generalInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="type"
            label={t('new.form.type') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'PERSON', label: commonT('enums.lender.type.PERSON') },
              { value: 'ORGANISATION', label: commonT('enums.lender.type.ORGANISATION') },
            ]}
          />

          <FormSelect
            form={form}
            name="salutation"
            label={t('new.form.salutation') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'PERSONAL', label: commonT('enums.lender.salutation.PERSONAL') },
              { value: 'FORMAL', label: commonT('enums.lender.salutation.FORMAL') },
            ]}
          />
        </div>

        {type === 'PERSON' ? (
          <>
            {salutation === 'FORMAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  form={form}
                  name="titlePrefix"
                  label={t('new.form.titlePrefix')}
                  placeholder={t('new.form.titlePrefixPlaceholder')}
                />

                <FormField
                  form={form}
                  name="titleSuffix"
                  label={t('new.form.titleSuffix')}
                  placeholder={t('new.form.titleSuffixPlaceholder')}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                form={form}
                name="firstName"
                label={t('new.form.firstName') + ' *'}
                placeholder={t('new.form.firstNamePlaceholder')}
              />

              <FormField
                form={form}
                name="lastName"
                label={t('new.form.lastName') + ' *'}
                placeholder={t('new.form.lastNamePlaceholder')}
              />
            </div>
          </>
        ) : (
          <FormField
            form={form}
            name="organisationName"
            label={t('new.form.organisationName') + ' *'}
            placeholder={t('new.form.organisationNamePlaceholder')}
          />
        )}
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.contactInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            form={form}
            name="email"
            label={t('new.form.email')}
            placeholder={t('new.form.emailPlaceholder')}
            type="email"
          />

          <FormField
            form={form}
            name="telNo"
            label={t('new.form.telNo')}
            placeholder={t('new.form.telNoPlaceholder')}
            type="tel"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            form={form}
            name="street"
            label={t('new.form.street')}
            placeholder={t('new.form.streetPlaceholder')}
          />

          <FormField
            form={form}
            name="addon"
            label={t('new.form.addon')}
            placeholder={t('new.form.addonPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <FormField
              form={form}
              name="zip"
              label={t('new.form.zip')}
              placeholder={t('new.form.zipPlaceholder')}
            />
          </div>

          <div className="md:col-span-4">
            <FormField
              form={form}
              name="place"
              label={t('new.form.place')}
              placeholder={t('new.form.placePlaceholder')}
            />
          </div>

          <div className="md:col-span-6">
            <FormCountrySelect
              form={form}
              name="country"
              label={t('new.form.country')}
              placeholder={t('new.form.countryPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Banking Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.bankingInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormIbanInput
            name="iban"
            label={t('new.form.iban')}
            placeholder={t('new.form.ibanPlaceholder')}
          />

          <FormField
            form={form}
            name="bic"
            label={t('new.form.bic')}
            placeholder={t('new.form.bicPlaceholder')}
          />
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.additionalInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="notificationType"
            label={t('new.form.notificationType') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'ONLINE', label: commonT('enums.lender.notificationType.ONLINE') },
              { value: 'EMAIL', label: commonT('enums.lender.notificationType.EMAIL') },
              { value: 'MAIL', label: commonT('enums.lender.notificationType.MAIL') },
            ]}
          />

          <FormSelect
            form={form}
            name="membershipStatus"
            label={t('new.form.membershipStatus')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'UNKNOWN', label: commonT('enums.lender.membershipStatus.UNKNOWN') },
              { value: 'MEMBER', label: commonT('enums.lender.membershipStatus.MEMBER') },
              { value: 'EXTERNAL', label: commonT('enums.lender.membershipStatus.EXTERNAL') },
            ]}
          />
        </div>

        <FormField
          form={form}
          name="tag"
          label={t('new.form.tag')}
          placeholder={t('new.form.tagPlaceholder')}
        />
      </div>
    </>
  )
} 