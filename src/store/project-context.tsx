'use client';

import { type ReactNode, createContext, useContext, useState } from 'react';

import type { ProjectWithConfiguration } from '@/types/projects';

interface ProjectContextType {
  selectedProject: ProjectWithConfiguration | null;
  setSelectedProject: (project: ProjectWithConfiguration | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<ProjectWithConfiguration | null>(null);

  return <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
