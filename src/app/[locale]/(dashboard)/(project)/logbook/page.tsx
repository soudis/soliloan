import { ViewType } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { getViewsByType } from '@/actions';
import { LogbookTable } from '@/components/dashboard/logbook/logbook-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';
import { requireSession } from '@/lib/require-session';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LogbookPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);
  await requireSession();

  const [project, viewsResult] = await Promise.all([
    db.project.findUnique({
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
    }),
    getViewsByType(ViewType.LOGBOOK),
  ]);

  const t = await getTranslations('logbook');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <LogbookTable changes={project?.changes ?? []} views={viewsResult?.views ?? []} />
    </div>
  );
}
