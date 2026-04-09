'use client';

import { Language } from '@prisma/client';
import { useTranslations } from 'next-intl';

import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AccountSettingsFormFieldsProps {
  email: string;
}

export function AccountSettingsFormFields({ email }: AccountSettingsFormFieldsProps) {
  const t = useTranslations('account.profile');
  const commonT = useTranslations('common');

  const languageOptions = Object.keys(Language).map((key) => ({
    value: key,
    label: commonT(`enums.language.${key}`),
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account-email">{t('email')}</Label>
        <Input id="account-email" value={email ?? ''} disabled readOnly />
      </div>
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
