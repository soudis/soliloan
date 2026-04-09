'use client';

import { Language } from '@prisma/client';
import { useTranslations } from 'next-intl';

import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';

export function AccountSettingsFormFields() {
  const t = useTranslations('account.profile');
  const commonT = useTranslations('common');

  const languageOptions = Object.keys(Language).map((key) => ({
    value: key,
    label: commonT(`enums.language.${key}`),
  }));

  return (
    <div className="space-y-4">
      <FormField
        name="name"
        label={t('name')}
        placeholder={t('namePlaceholder')}
      />
      <FormSelect
        name="language"
        label={t('language')}
        placeholder={t('languagePlaceholder')}
        options={languageOptions}
      />
    </div>
  );
}
