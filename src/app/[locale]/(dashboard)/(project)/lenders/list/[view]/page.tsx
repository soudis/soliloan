import { LendersListPage } from '../lenders-list-page';

interface PageProps {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LendersViewPage({ params, searchParams }: PageProps) {
  const { view } = await params;
  return <LendersListPage viewId={view} searchParams={searchParams} />;
}
