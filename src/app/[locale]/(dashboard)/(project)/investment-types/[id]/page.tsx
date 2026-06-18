import { notFound } from 'next/navigation';
import { getInvestmentTypeUnsafe } from '@/actions/investment-types/queries/get-investment-type';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { InvestmentTypeDetailContent } from '@/components/investment-types/investment-type-detail-content';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InvestmentTypeDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const { projectId } = searchParamsCache.parse(rawSearchParams);
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const { investmentType } = await getInvestmentTypeUnsafe(id);

  if (!investmentType) {
    notFound();
  }

  return <InvestmentTypeDetailContent investmentType={investmentType} project={project} />;
}
