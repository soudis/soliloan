import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getTemplateAction } from '@/actions/templates/queries/get-template';
import { TemplateEditor } from '@/components/templates/template-editor';
import { auth } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTemplateEditorPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const t = await getTranslations('templates');

  // Redirect non-admins
  if (!session?.user?.isAdmin) {
    redirect('/');
  }

  const { data } = await getTemplateAction({ id });

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('editor.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TemplateEditor
        template={{
          id: data.template.id,
          name: data.template.name,
          type: data.template.type,
          dataset: data.template.dataset,
          designJson: data.template.designJson,
          projectId: data.template.projectId,
          isGlobal: data.template.isGlobal,
        }}
      />
    </div>
  );
}
