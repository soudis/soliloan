import { notFound } from 'next/navigation';
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

  const { investmentTypes } = await getInvestmentTypesByProjectUnsafe(projectId);

  return <InvestmentTypesPageContent investmentTypes={investmentTypes} project={project} />;
}
