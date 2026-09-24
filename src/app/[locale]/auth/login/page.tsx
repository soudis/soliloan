import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeLoginCallbackUrl } from '@/lib/login-callback-url';

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations('auth.login');
  const { callbackUrl } = await searchParams;

  return (
    <div className="space-y-4 md:space-y-8">
      <Card className="gap-4 py-4 md:gap-6 md:py-6">
        <CardHeader className="hidden md:block">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm callbackUrl={sanitizeLoginCallbackUrl(callbackUrl)} />
        </CardContent>
      </Card>
    </div>
  );
}
