'use client';

import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { getProjectsAction } from '@/actions/projects/queries/get-projects';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

import { useProjects } from '@/store/projects-store';
import type { ProjectWithConfiguration } from '@/types/projects';
import { useQuery } from '@tanstack/react-query';
import { ProjectLogo } from './project-logo';

export default function ProjectSelector() {
  const { selectedProject, setSelectedProject } = useProjects();
  const t = useTranslations('navigation');

  const { data: response, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectsAction(),
  });

  useEffect(() => {
    if (response?.data?.projects?.length && !selectedProject) {
      setSelectedProject(response?.data?.projects[0] ?? null);
    }
  }, [response, selectedProject, setSelectedProject]);

  if (isLoading || !response) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const { data, serverError } = response ?? {};

  if (serverError || !data?.projects) {
    console.error(response);
    throw new Error(serverError);
  }

  return (
    <div className="mb-4 ">
      <Select
        value={selectedProject?.id}
        onValueChange={(value: string) => {
          const project = data.projects.find((p: ProjectWithConfiguration) => p.id === value);
          setSelectedProject(project || null);
        }}
      >
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
          {data.projects.map((project: ProjectWithConfiguration) => (
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
