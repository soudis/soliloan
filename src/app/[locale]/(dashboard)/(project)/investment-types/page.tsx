import { ViewType } from '@prisma/client';
import { notFound } from 'next/navigation';
import { getViewsByType } from '@/actions';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { getInvestmentTypesByProjectUnsafe } from '@/actions/investment-types/queries/get-investment-types-by-project';
import { InvestmentTypesPageContent } from '@/components/investment-types/investment-types-page-content';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InvestmentTypesPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const [{ investmentTypes }, views] = await Promise.all([
    getInvestmentTypesByProjectUnsafe(projectId),
    getViewsByType(ViewType.INVESTMENT_TYPE),
  ]);

  return <InvestmentTypesPageContent investmentTypes={investmentTypes} project={project} views={views?.views ?? []} />;
}
