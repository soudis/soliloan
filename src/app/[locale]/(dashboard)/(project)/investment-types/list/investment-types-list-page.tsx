import { ViewType } from '@prisma/client';
import { notFound } from 'next/navigation';
import { getViewsByType } from '@/actions';
import { getInvestmentTypesByProjectUnsafe } from '@/actions/investment-types/queries/get-investment-types-by-project';
import { InvestmentTypesPageContent } from '@/components/investment-types/investment-types-page-content';
import { searchParamsCache } from '@/lib/params';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { resolveTableListViewId } from '@/lib/resolve-table-list-view';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';

export async function InvestmentTypesListPage({
  viewId,
  searchParams,
}: {
  viewId?: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = searchParamsCache.parse(await searchParams);
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const [{ investmentTypes }, viewsResult] = await Promise.all([
    getInvestmentTypesByProjectUnsafe(projectId),
    getViewsByType(ViewType.INVESTMENT_TYPE, projectId),
  ]);

  const views = viewsResult?.views ?? [];
  const resolvedViewId = resolveTableListViewId(viewId, views, TABLE_LIST_PATHS.investmentTypes, projectId);

  return (
    <InvestmentTypesPageContent
      investmentTypes={investmentTypes}
      project={project}
      views={views}
      viewId={resolvedViewId}
    />
  );
}
