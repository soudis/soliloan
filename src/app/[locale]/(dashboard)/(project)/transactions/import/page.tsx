import { redirect } from 'next/navigation';
import { getImportBatch, getLinkedBankConnection } from '@/actions/gocardless/queries/get-import-batch';
import { getLendersByProjectIdUnsafe } from '@/actions/lenders/queries/get-lenders-by-project';
import { getLoansByProjectUnsafe } from '@/actions/loans/queries/get-loans-by-project';
import { type BankImportAccountOption, BankImportClient } from '@/components/transactions/bank-import-client';
import { getAccountDetails } from '@/lib/gocardless/client';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BankImportPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const connection = await getLinkedBankConnection(projectId);
  if (!connection) {
    redirect(`/configuration?projectId=${encodeURIComponent(projectId)}&tab=general`);
  }

  const [batch, lendersResult, loansResult] = await Promise.all([
    getImportBatch(projectId),
    getLendersByProjectIdUnsafe(projectId),
    getLoansByProjectUnsafe(projectId),
  ]);

  const lenders = 'lenders' in lendersResult && lendersResult.lenders ? lendersResult.lenders : [];
  const loans = 'loans' in loansResult && loansResult.loans ? loansResult.loans : [];

  const accounts: BankImportAccountOption[] = await Promise.all(
    connection.accountIds.map(async (accountId) => {
      try {
        const details = await getAccountDetails(accountId);
        const iban = details.account?.iban ?? null;
        const ownerName = details.account?.ownerName ?? details.account?.name ?? null;
        const label = ownerName ?? iban ?? accountId;
        return { id: accountId, label, iban };
      } catch {
        return { id: accountId, label: accountId, iban: null };
      }
    }),
  );

  return (
    <BankImportClient
      projectId={projectId}
      accounts={accounts}
      initialRows={batch?.rows ?? []}
      initialAccountId={batch?.accountId ?? accounts[0]?.id ?? null}
      lenders={lenders}
      loans={loans}
    />
  );
}
