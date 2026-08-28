'use client';

import { createContext, useContext, useMemo } from 'react';
import { useProjectId } from '@/lib/hooks/use-project-id';
import type { ProjectWithConfiguration } from '@/types/projects';

type ProjectContextType = {
  project: ProjectWithConfiguration;
  projectId: string;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

const ProjectsCatalogContext = createContext<ProjectWithConfiguration[]>([]);

export function ProjectsCatalogProvider({
  projects,
  children,
}: {
  projects: ProjectWithConfiguration[];
  children: React.ReactNode;
}) {
  return <ProjectsCatalogContext.Provider value={projects}>{children}</ProjectsCatalogContext.Provider>;
}

export function ProjectProvider({
  project: serverProject,
  children,
}: {
  project: ProjectWithConfiguration;
  children: React.ReactNode;
}) {
  const catalog = useContext(ProjectsCatalogContext);
  const urlProjectId = useProjectId();
  const project = useMemo(() => {
    if (!urlProjectId || serverProject.id === urlProjectId) {
      return serverProject;
    }
    return catalog.find((p) => p.id === urlProjectId) ?? serverProject;
  }, [catalog, serverProject, urlProjectId]);

  const value = useMemo(() => ({ project, projectId: project.id }), [project]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
