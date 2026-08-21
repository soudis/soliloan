import { LoansListPage } from './loans-list-page';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function LoansPage({ searchParams }: PageProps) {
  return <LoansListPage searchParams={searchParams} />;
}
