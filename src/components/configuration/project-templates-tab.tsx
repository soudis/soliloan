'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';

interface ProjectTemplatesTabProps {
  projectId: string;
}

export function ProjectTemplatesTab({ projectId }: ProjectTemplatesTabProps) {
  const t = useTranslations('templates');
  const queryClient = useQueryClient();

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['templates', projectId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('project.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('project.description')}</p>
        </div>
        <TemplateDialog projectId={projectId} onCreated={handleCreated} />
      </div>

      <TemplateList projectId={projectId} includeGlobal />
    </div>
  );
}
