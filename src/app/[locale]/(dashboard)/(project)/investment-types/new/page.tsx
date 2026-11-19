import { notFound } from 'next/navigation';
import { InvestmentTypeFormClient } from '@/components/investment-types/investment-type-form-client';
import { searchParamsCache } from '@/lib/params';
import { getProjectUnsafe } from '@/lib/projects/get-project';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewInvestmentTypePage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const { projectId } = searchParamsCache.parse(resolved);
  const project = await getProjectUnsafe(projectId);

  if (!project.configuration.deInvestmentActCompliance) {
    notFound();
  }

  const prefilledInterestRate = typeof resolved?.interestRate === 'string' ? resolved.interestRate : undefined;

  return <InvestmentTypeFormClient project={project} prefilledInterestRate={prefilledInterestRate} />;
}
