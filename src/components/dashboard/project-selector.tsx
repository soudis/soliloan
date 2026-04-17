'use client';

import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryState } from 'nuqs';
import { useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { usePathname, useRouter } from '@/i18n/navigation';
import { PROJECT_ID_KEY, projectIdParser } from '@/lib/params';
import { useNavigationUiStore } from '@/store';
import type { ProjectWithConfiguration } from '@/types/projects';
import { ProjectLogo } from './project-logo';

function pathnameIsDashboard(pathname: string | null): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] === 'dashboard';
}

export default function ProjectSelector({ projects }: { projects: ProjectWithConfiguration[] }) {
  const t = useTranslations('navigation');
  const router = useRouter();
  const pathname = usePathname();
  const isProjectSwitching = useNavigationUiStore((s) => s.isProjectSwitching);
  const setProjectSwitching = useNavigationUiStore((s) => s.setProjectSwitching);
  const pendingTargetRef = useRef<string | null>(null);
  const failSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchStartedAtRef = useRef<number | null>(null);

  const [projectId] = useQueryState(PROJECT_ID_KEY, {
    ...projectIdParser,
    shallow: false,
  });
  const currentProjectId = projectId && projectId.length > 0 ? projectId : null;

  const selectedProject = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    const target = pendingTargetRef.current;
    if (target === null) return;
    if (currentProjectId !== target) return;

    pendingTargetRef.current = null;
    if (failSafeRef.current) {
      clearTimeout(failSafeRef.current);
      failSafeRef.current = null;
    }

    const started = switchStartedAtRef.current;
    switchStartedAtRef.current = null;
    const elapsed = started != null ? Date.now() - started : 0;
    const wait = Math.max(0, 350 - elapsed);

    const id = window.setTimeout(() => {
      setProjectSwitching(false);
    }, wait);
    return () => clearTimeout(id);
  }, [currentProjectId, setProjectSwitching]);

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === currentProjectId) return;

    if (failSafeRef.current) {
      clearTimeout(failSafeRef.current);
    }
    pendingTargetRef.current = newProjectId;
    setProjectSwitching(true);
    switchStartedAtRef.current = Date.now();
    failSafeRef.current = setTimeout(() => {
      failSafeRef.current = null;
      pendingTargetRef.current = null;
      switchStartedAtRef.current = null;
      setProjectSwitching(false);
    }, 15000);

    const href = `/dashboard?${PROJECT_ID_KEY}=${encodeURIComponent(newProjectId)}`;
    const onDashboard = pathnameIsDashboard(pathname);

    if (onDashboard) {
      router.replace(href);
      router.refresh();
    } else {
      router.push(href);
    }
  };

  return (
    <div className="mb-4 relative">
      <Select value={selectedProject?.id} onValueChange={handleProjectChange} disabled={isProjectSwitching}>
        <SelectTrigger
          className="w-full h-auto py-2 flex items-center justify-start gap-3 border-none shadow-none bg-transparent hover:bg-muted/20 focus:ring-0 [&>svg]:hidden relative data-[disabled]:opacity-70"
          aria-busy={isProjectSwitching}
        >
          <div className="flex items-center gap-3 min-w-0 text-left">
            <ProjectLogo project={selectedProject} className="h-16 w-16 rounded-2xl shadow-sm shrink-0" />
            <span className="font-bold text-lg leading-tight whitespace-normal break-words pb-2">
              {selectedProject?.configuration.name || t('selectProject')}
            </span>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {isProjectSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground/80" />
            )}
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
