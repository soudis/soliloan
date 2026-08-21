import { InvestmentTypesListPage } from '../investment-types-list-page';

interface PageProps {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InvestmentTypesViewPage({ params, searchParams }: PageProps) {
  const { view } = await params;
  return <InvestmentTypesListPage viewId={view} searchParams={searchParams} />;
}
