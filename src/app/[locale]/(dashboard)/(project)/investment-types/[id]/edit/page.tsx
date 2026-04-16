import { notFound } from 'next/navigation';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { getInvestmentTypeUnsafe } from '@/actions/investment-types/queries/get-investment-type';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditInvestmentTypePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { projectId } = searchParamsCache.parse(await searchParams);
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const { investmentType } = await getInvestmentTypeUnsafe(id);

  if (!investmentType) {
    notFound();
  }

  return <InvestmentTypeFormClient project={project} initialData={investmentType} />;
}
