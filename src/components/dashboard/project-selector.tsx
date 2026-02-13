'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getProjectsAction } from '@/actions/projects/queries/get-projects';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import type { ProjectWithConfiguration } from '@/types/projects';
import { ProjectLogo } from './project-logo';

export default function ProjectSelector() {
  const t = useTranslations('navigation');
  const router = useRouter();
  const pathname = usePathname();
  const currentProjectId = useProjectId();

  const { data: response, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectsAction(),
  });

  const projects = response?.data?.projects ?? [];
  const selectedProject = projects.find((p) => p.id === currentProjectId) ?? null;

  // Auto-redirect to first project if on a non-project route
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      router.replace(`/${projects[0].id}`);
    }
  }, [projects, currentProjectId, router]);

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

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === currentProjectId) return;

    // Extract the sub-path after the current projectId and navigate to the same sub-path
    // on the new project. Pathname is like /de/[projectId]/lenders/...
    const segments = pathname.split('/').filter(Boolean);
    // segments[0] = locale, segments[1] = projectId, segments[2+] = sub-path
    const subPath = currentProjectId && segments.length > 2 ? `/${segments.slice(2).join('/')}` : '';
    router.push(`/${newProjectId}${subPath}`);
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
