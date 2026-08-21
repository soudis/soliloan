import { LoansListPage } from '../loans-list-page';

interface PageProps {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoansViewPage({ params, searchParams }: PageProps) {
  const { view } = await params;
  return <LoansListPage viewId={view} searchParams={searchParams} />;
}
