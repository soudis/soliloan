import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage() {
  const t = await getTranslations('auth.login');

  return (
    <div className="space-y-4 md:space-y-8">
      <Card className="border-none gap-4 py-4 md:gap-6 md:py-6">
        <CardHeader className="hidden md:block">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
