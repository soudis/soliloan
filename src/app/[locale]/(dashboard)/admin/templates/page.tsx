import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getGlobalTemplatesUnsafe } from '@/actions/templates/queries/get-templates';
import { RestoreAllSystemTemplatesButton } from '@/components/templates/restore-all-system-templates-button';
import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';
import { requireAdmin } from '@/lib/require-session';

export default async function AdminTemplatesPage() {
  await requireAdmin();

  const [templates, t] = await Promise.all([getGlobalTemplatesUnsafe(), getTranslations('templates')]);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.description')}</p>
        </div>
        <Suspense>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RestoreAllSystemTemplatesButton />
            <TemplateDialog isAdmin />
          </div>
        </Suspense>
      </div>

      <Suspense>
        <TemplateList isAdmin templates={templates} />
      </Suspense>
    </div>
  );
}
