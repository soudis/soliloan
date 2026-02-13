import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getTemplateAction } from '@/actions/templates/queries/get-template';
import { TemplateEditor } from '@/components/templates/template-editor';

interface PageProps {
  params: Promise<{ projectId: string; id: string }>;
}

export default async function ProjectTemplateEditorPage({ params }: PageProps) {
  const { projectId, id } = await params;
  const t = await getTranslations('templates');

  const { data } = await getTemplateAction({ id });

  if (!data?.template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('editor.notFound')}</p>
      </div>
    );
  }

  // Redirect if template doesn't belong to this project and isn't global
  if (data.template.projectId !== projectId && !data.template.isGlobal) {
    redirect(`/${projectId}/configuration?tab=templates`);
  }

  return (
    <div className="flex flex-col">
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
        projectId={projectId}
      />
    </div>
  );
}
