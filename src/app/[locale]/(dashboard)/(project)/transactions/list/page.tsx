import { TransactionsListPage } from './transactions-list-page';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function TransactionsPage({ searchParams }: PageProps) {
  return <TransactionsListPage searchParams={searchParams} />;
}
