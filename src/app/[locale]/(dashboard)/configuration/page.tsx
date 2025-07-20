'use client';

import { useSession } from 'next-auth/react';

import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { useProjects } from '@/store/projects-store';

export default function ConfigPage() {
  const { data: session } = useSession();
  const { selectedProject } = useProjects();

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  return <ConfigurationPage project={selectedProject} />;
}
