import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getGlobalTemplatesUnsafe } from '@/actions/templates/queries/get-templates';
import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';
import { auth } from '@/lib/auth';

export default async function AdminTemplatesPage() {
  const session = await auth();
  if (!session) {
    redirect('/auth/login');
  }
  if (!session.user.isAdmin) {
    redirect('/');
  }

  const [templates, t] = await Promise.all([getGlobalTemplatesUnsafe(), getTranslations('templates')]);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.description')}</p>
        </div>
        <TemplateDialog isAdmin />
      </div>

      <TemplateList isAdmin templates={templates} />
    </div>
  );
}
