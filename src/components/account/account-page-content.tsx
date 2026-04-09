'use client';

import type { Language } from '@prisma/client';
import { AlertTriangle, KeyRound, UserCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/ui/form-section';
import { AccountSettingsForm } from './account-settings-form';
import { ChangePasswordForm } from './change-password-form';
import { DeleteAccountSection } from './delete-account-section';

interface AccountPageContentProps {
  user: {
    name: string;
    language: Language;
  };
}

export function AccountPageContent({ user }: AccountPageContentProps) {
  const t = useTranslations('account');

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

      <FormSection
        title={t('profile.title')}
        icon={<UserCircle className="h-4 w-4 text-muted-foreground" />}
      >
        <AccountSettingsForm
          name={user.name}
          language={user.language}
          onSuccess={() => signOut({ callbackUrl: '/auth/login' })}
        />
      </FormSection>

      <FormSection
        title={t('password.title')}
        icon={<KeyRound className="h-4 w-4 text-muted-foreground" />}
      >
        <ChangePasswordForm />
      </FormSection>

      <FormSection
        title={t('deleteAccount.title')}
        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
      >
        <DeleteAccountSection />
      </FormSection>
    </div>
  );
}
