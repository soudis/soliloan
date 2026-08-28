import { TransactionsListPage } from '../transactions-list-page';

interface PageProps {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TransactionsViewPage({ params, searchParams }: PageProps) {
  const { view } = await params;
  return <TransactionsListPage viewId={view} searchParams={searchParams} />;
}
