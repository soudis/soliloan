import { getTranslations } from 'next-intl/server';

import { LogbookTable } from '@/components/dashboard/logbook/logbook-table';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LogbookPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get changes for the current project only
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      changes: {
        orderBy: {
          committedAt: 'desc',
        },
        include: {
          project: true,
        },
      },
    },
  });

  const t = await getTranslations('logbook');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <LogbookTable changes={project?.changes ?? []} />
    </div>
  );
}
