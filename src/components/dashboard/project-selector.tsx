'use client';

import { ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryState } from 'nuqs';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { PROJECT_ID_KEY, projectIdParser } from '@/lib/params';
import type { ProjectWithConfiguration } from '@/types/projects';
import { ProjectLogo } from './project-logo';

export default function ProjectSelector({ projects }: { projects: ProjectWithConfiguration[] }) {
  const t = useTranslations('navigation');
  const [projectId, setProjectId] = useQueryState(PROJECT_ID_KEY, {
    ...projectIdParser,
    shallow: false,
  });
  const currentProjectId = projectId && projectId.length > 0 ? projectId : null;

  const selectedProject = projects.find((p) => p.id === currentProjectId) ?? null;

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === currentProjectId) return;
    setProjectId(newProjectId);
  };

  return (
    <div className="mb-4 ">
      <Select value={selectedProject?.id} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-full h-auto py-2 flex items-center justify-start gap-3 border-none shadow-none bg-transparent hover:bg-muted/20 focus:ring-0 [&>svg]:hidden relative">
          <div className="flex items-center gap-3 min-w-0 text-left">
            <ProjectLogo project={selectedProject} className="h-16 w-16 rounded-2xl shadow-sm shrink-0" />
            <span className="font-bold text-lg leading-tight whitespace-normal break-words pb-2">
              {selectedProject?.configuration.name || t('selectProject')}
            </span>
          </div>
          <div className="absolute bottom-2 right-2">
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/80" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {projects.map((project: ProjectWithConfiguration) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-3">
                <ProjectLogo project={project} className="h-6 w-6 rounded-md" />
                <span className="font-medium">{project.configuration.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
