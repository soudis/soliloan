'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getProjectsAction } from '@/actions/projects/queries/get-projects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useProjects } from '@/store/projects-store';
import type { ProjectWithConfiguration } from '@/types/projects';
import { useQuery } from '@tanstack/react-query';
import { useAction } from 'next-safe-action/hooks';

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
    <div className="mb-4">
      <Select
        value={selectedProject?.id}
        onValueChange={(value: string) => {
          const project = data.projects.find((p: ProjectWithConfiguration) => p.id === value);
          setSelectedProject(project || null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('selectProject')} />
        </SelectTrigger>
        <SelectContent>
          {data.projects.map((project: ProjectWithConfiguration) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
