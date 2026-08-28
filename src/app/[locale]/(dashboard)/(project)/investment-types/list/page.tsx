import { InvestmentTypesListPage } from './investment-types-list-page';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function InvestmentTypesPage({ searchParams }: PageProps) {
  return <InvestmentTypesListPage searchParams={searchParams} />;
}
