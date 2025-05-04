"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { getProjects } from "@/app/actions/projects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/store/project-context";
import { ProjectWithConfiguration } from "@/types/projects";

export default function ProjectSelector() {
  const { selectedProject, setSelectedProject } = useProject();
  const t = useTranslations("navigation");
  const [projects, setProjects] = useState<ProjectWithConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { projects: fetchedProjects, error } = await getProjects();
        if (error) {
          throw new Error(error);
        }
        if (fetchedProjects) {
          setProjects(fetchedProjects);
          if (fetchedProjects.length > 0 && !selectedProject) {
            setSelectedProject(fetchedProjects[0]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [selectedProject, setSelectedProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mb-4">
      <Select
        value={selectedProject?.id}
        onValueChange={(value: string) => {
          const project = projects.find(
            (p: ProjectWithConfiguration) => p.id === value
          );
          setSelectedProject(project || null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("selectProject")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project: ProjectWithConfiguration) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
