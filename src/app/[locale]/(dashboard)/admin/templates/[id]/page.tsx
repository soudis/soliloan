import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getTemplateAction } from '@/actions/templates/queries/get-template';
import { TemplateEditor } from '@/components/templates/template-editor';
import { auth } from '@/lib/auth';
import { loadTemplateEditorPageData } from '@/lib/templates/template-editor-page-data';

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

  const pageData = await loadTemplateEditorPageData({
    template: {
      dataset: data.template.dataset,
      type: data.template.type,
      projectId: data.template.projectId,
      isGlobal: data.template.isGlobal,
    },
    isAdmin: true,
  });

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
        pageData={pageData}
        isAdmin
      />
    </div>
  );
}
