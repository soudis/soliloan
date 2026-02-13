'use client';

import { createContext, useContext } from 'react';
import type { ProjectWithConfiguration } from '@/types/projects';

type ProjectContextType = {
  project: ProjectWithConfiguration;
  projectId: string;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: ProjectWithConfiguration;
  children: React.ReactNode;
}) {
  return <ProjectContext.Provider value={{ project, projectId: project.id }}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
