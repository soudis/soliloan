import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getTemplateAction } from '@/actions/templates/queries/get-template';
import { TemplateEditor } from '@/components/templates/template-editor';
import { searchParamsCache } from '@/lib/params';
import { loadTemplateEditorPageData } from '@/lib/templates/template-editor-page-data';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectTemplateEditorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { projectId } = searchParamsCache.parse(await searchParams);
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
    redirect(`/configuration?tab=templates`);
  }

  const pageData = await loadTemplateEditorPageData({
    template: {
      dataset: data.template.dataset,
      type: data.template.type,
      projectId: data.template.projectId,
      isGlobal: data.template.isGlobal,
    },
    routeProjectId: projectId,
    isAdmin: false,
  });

  return (
    <div className="flex flex-col">
      <TemplateEditor
        template={{
          id: data.template.id,
          name: data.template.name,
          description: data.template.description,
          subjectOrFilename: data.template.subjectOrFilename,
          type: data.template.type,
          dataset: data.template.dataset,
          designJson: data.template.designJson,
          projectId: data.template.projectId,
          isGlobal: data.template.isGlobal,
          isSystem: data.template.isSystem,
        }}
        pageData={pageData}
        projectId={projectId}
      />
    </div>
  );
}
