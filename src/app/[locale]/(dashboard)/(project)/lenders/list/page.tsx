import { LendersListPage } from './lenders-list-page';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function LendersPage({ searchParams }: PageProps) {
  return <LendersListPage searchParams={searchParams} />;
}
