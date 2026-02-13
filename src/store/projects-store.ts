import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProjectsAction } from '@/actions/projects/queries/get-projects';
import type { ProjectWithConfiguration } from '@/types/projects';

type ProjectsStore = {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  // Computed getter for selected project - will be used in custom hook
};

export const useProjectsStore = create<ProjectsStore>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (projectId: string | null) => set({ selectedProjectId: projectId }),
    }),
    { name: 'projects' },
  ),
);

// Custom hook that combines the store with TanStack Query
export const useProjects = () => {
  const { selectedProjectId, setSelectedProjectId } = useProjectsStore();

  // Fetch all projects using TanStack Query
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectsAction(),
  });

  const projects = response?.data?.projects || [];

  // Get the selected project object based on the selectedProjectId
  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) || null
    : null;

  // Helper to set selected project by project object (for backward compatibility)
  const setSelectedProject = (project: ProjectWithConfiguration | null) => {
    setSelectedProjectId(project?.id || null);
  };

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  return {
    // Store state
    selectedProjectId,
    setSelectedProjectId,

    // Query state
    projects,
    isLoading,
    error: error || response?.serverError,
    refetch,

    // Computed values
    selectedProject,

    // Helper methods
    setSelectedProject,
  };
};
