'use client';

import { LenderRequiredField, LenderType, Salutation } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FormAdditionalFields } from '@/components/form/form-additional-fields';
import { FormCountrySelect } from '@/components/form/form-country-select';
import { FormField } from '@/components/form/form-field';
import { FormIbanInput } from '@/components/form/form-iban-input';
import { FormSelect } from '@/components/form/form-select';
import { FormSection } from '@/components/ui/form-section';

import type { LenderFormData } from '@/lib/schemas/lender';
import { useProjects } from '@/store/projects-store';

export function LenderFormFields() {
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');

  const form = useFormContext<LenderFormData>();
  const { selectedProject } = useProjects();

  const type = form.watch('type');

  const salutation = form.watch('salutation');

  if (!selectedProject) {
    return null;
  }
  const isAddressRequired = selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.address);
  const isEmailRequired = selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.email);
  const isTelNoRequired = selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.telNo);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section */}
      <FormSection title={t('new.form.generalInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            name="type"
            label={`${t('new.form.type')} *`}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={Object.entries(LenderType).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.type.${key}`),
            }))}
          />

          <FormSelect
            name="salutation"
            label={`${t('new.form.salutation')} *`}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={Object.entries(Salutation).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.salutation.${key}`),
            }))}
          />
        </div>

        {type === 'PERSON' ? (
          <>
            {salutation === 'FORMAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="titlePrefix"
                  label={t('new.form.titlePrefix')}
                  placeholder={commonT('ui.form.enterPlaceholder')}
                />

                <FormField
                  name="titleSuffix"
                  label={t('new.form.titleSuffix')}
                  placeholder={commonT('ui.form.enterPlaceholder')}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="firstName"
                label={`${t('new.form.firstName')} *`}
                placeholder={commonT('ui.form.enterPlaceholder')}
              />

              <FormField
                name="lastName"
                label={`${t('new.form.lastName')} *`}
                placeholder={commonT('ui.form.enterPlaceholder')}
              />
            </div>
          </>
        ) : (
          <FormField
            name="organisationName"
            label={`${t('new.form.organisationName')} *`}
            placeholder={commonT('ui.form.enterPlaceholder')}
          />
        )}
      </FormSection>

      {/* Contact Information Section */}
      <FormSection title={t('new.form.contactInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="email"
            label={isEmailRequired ? `${t('new.form.email')} *` : t('new.form.email')}
            placeholder={commonT('ui.form.enterPlaceholder')}
            type="email"
          />

          <FormField
            name="telNo"
            label={isTelNoRequired ? `${t('new.form.telNo')} *` : t('new.form.telNo')}
            placeholder={commonT('ui.form.enterPlaceholder')}
            type="tel"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField name="street" label={t('new.form.street')} placeholder={commonT('ui.form.enterPlaceholder')} />

          <FormField name="addon" label={t('new.form.addon')} placeholder={commonT('ui.form.enterPlaceholder')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <FormField
              name="zip"
              label={isAddressRequired ? `${t('new.form.zip')} *` : t('new.form.zip')}
              placeholder={commonT('ui.form.enterPlaceholder')}
            />
          </div>

          <div className="md:col-span-4">
            <FormField
              name="place"
              label={isAddressRequired ? `${t('new.form.place')} *` : t('new.form.place')}
              placeholder={commonT('ui.form.enterPlaceholder')}
            />
          </div>

          <div className="md:col-span-6">
            <FormCountrySelect
              name="country"
              label={isAddressRequired ? `${t('new.form.country')} *` : t('new.form.country')}
              placeholder={commonT('ui.form.selectPlaceholder')}
              clearable
            />
          </div>
        </div>
      </FormSection>

      {/* Banking Information Section */}
      <FormSection title={t('new.form.bankingInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormIbanInput name="iban" label={t('new.form.iban')} placeholder={commonT('ui.form.enterPlaceholder')} />

          <FormField name="bic" label={t('new.form.bic')} placeholder={commonT('ui.form.enterPlaceholder')} />
        </div>
      </FormSection>

      {/* Additional Information Section */}
      {selectedProject?.configuration.lenderAdditionalFields.length > 0 && (
        <FormSection title={t('new.form.additionalInfo')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormAdditionalFields
              config={selectedProject?.configuration.lenderAdditionalFields}
              name="additionalFields"
            />
          </div>
        </FormSection>
      )}
    </div>
  );
}
