'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { use } from 'react';

import { getTemplateAction } from '@/actions/templates/queries/get-template';
import { TemplateEditor } from '@/components/templates/template-editor';
import { redirect } from '@/i18n/navigation';
import { useProjects } from '@/store/projects-store';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectTemplateEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { selectedProject } = useProjects();
  const t = useTranslations('templates');

  if (!session) {
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const result = await getTemplateAction({ id });
      return result?.data?.template;
    },
  });

  // Redirect if template doesn't belong to selected project
  if (data && selectedProject && data.projectId !== selectedProject.id && !data.isGlobal) {
    redirect('/configuration?tab=templates');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('editor.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TemplateEditor
        template={{
          id: data.id,
          name: data.name,
          type: data.type,
          dataset: data.dataset,
          designJson: data.designJson,
          projectId: data.projectId,
          isGlobal: data.isGlobal,
        }}
        projectId={selectedProject?.id}
      />
    </div>
  );
}
