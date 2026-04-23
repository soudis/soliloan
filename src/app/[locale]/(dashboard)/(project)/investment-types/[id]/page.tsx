import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { getInvestmentTypeUnsafe } from '@/actions/investment-types/queries/get-investment-type';
import { InvestmentTypeDetailContent } from '@/components/investment-types/investment-type-detail-content';
import { calcInvestmentTypeMetrics } from '@/lib/investment-types/calc-investment-type-metrics';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InvestmentTypeDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const { projectId } = searchParamsCache.parse(rawSearchParams);
  const effectiveDate =
    typeof rawSearchParams.effectiveDate === 'string' && rawSearchParams.effectiveDate
      ? rawSearchParams.effectiveDate
      : format(new Date(), 'yyyy-MM-dd');
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const { investmentType } = await getInvestmentTypeUnsafe(id);

  if (!investmentType) {
    notFound();
  }

  const metrics = calcInvestmentTypeMetrics(investmentType, new Date(effectiveDate));

  return (
    <InvestmentTypeDetailContent
      investmentType={investmentType}
      project={project}
      initialEffectiveDate={effectiveDate}
      initialMetrics={metrics}
    />
  );
}
