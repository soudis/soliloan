'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { ProjectSystemTemplatesTable } from '@/components/configuration/project-system-templates-table';
import { TemplateDialog } from '@/components/templates/template-dialog';
import { TemplateList } from '@/components/templates/template-list';
import type { ProjectSystemTemplateOverviewRow } from '@/lib/templates/project-system-templates-overview';
import type { ProjectWithConfiguration } from '@/types/projects';

interface ProjectTemplatesTabProps {
  project: ProjectWithConfiguration;
  systemTemplatesOverviewRows: ProjectSystemTemplateOverviewRow[];
}

export function ProjectTemplatesTab({ project, systemTemplatesOverviewRows }: ProjectTemplatesTabProps) {
  const t = useTranslations('templates');

  const nonSystemTemplates = useMemo(
    () =>
      (project.templates ?? [])
        .filter((tpl) => !tpl.isSystem)
        .map((template) => ({
          ...template,
          project: {
            id: project.id,
            configuration: { name: project.configuration.name },
          },
          createdBy: template.createdBy,
        })),
    [project],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">{t('project.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('project.description')}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{t('project.sections.customTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('project.sections.customDescription')}</p>
          </div>
          <TemplateDialog projectId={project.id} />
        </div>
        <TemplateList project={project} templates={nonSystemTemplates} />
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-lg font-medium">{t('project.sections.systemTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('project.sections.systemDescription')}</p>
        </div>
        <ProjectSystemTemplatesTable projectId={project.id} initialRows={systemTemplatesOverviewRows} />
      </div>
    </div>
  );
}
