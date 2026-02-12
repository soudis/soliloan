'use client';

import { redirect } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';

export default function AdminTemplatesPage() {
  const { data: session } = useSession();
  const t = useTranslations('templates');

  if (!session) {
    return null;
  }

  // Redirect non-admins
  if (!session?.user?.isAdmin) {
    redirect({ href: '/', locale: 'de' });
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.description')}</p>
        </div>
        <TemplateDialog isAdmin />
      </div>

      <TemplateList isAdmin />
    </div>
  );
}
