'use client';

import { useTranslations } from 'next-intl';
import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';
import type { ProjectWithConfiguration } from '@/types/projects';

interface ProjectTemplatesTabProps {
  project: ProjectWithConfiguration;
}

export function ProjectTemplatesTab({ project }: ProjectTemplatesTabProps) {
  const t = useTranslations('templates');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('project.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('project.description')}</p>
        </div>
        <TemplateDialog projectId={project.id} />
      </div>

      <TemplateList project={project} includeGlobal />
    </div>
  );
}
