import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { SetPasswordForm } from '@/components/auth/set-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSetPasswordTokenContext } from '@/lib/auth-set-password';

type SetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const t = await getTranslations('auth');
  const { token } = await searchParams;
  const context = token ? await getSetPasswordTokenContext(token) : null;

  if (!token || !context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('setPassword.invalidToken')}</CardTitle>
          <CardDescription>{t('setPassword.invalidTokenDescription')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const title = context.requireName ? t('setPassword.inviteTitle') : t('setPassword.title');
  const description = context.requireName ? t('setPassword.inviteDescription') : t('setPassword.description');

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <SetPasswordForm token={token} requireName={context.requireName} email={context.email} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
