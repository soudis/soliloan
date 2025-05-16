'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const t = useTranslations('auth.login');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">{t('title')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('createAccount')}{' '}
          <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            {t('createAccount')}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
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
