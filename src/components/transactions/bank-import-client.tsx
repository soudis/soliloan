'use client';

import type { BankImportRow, Lender, TransactionType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Check, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { discardImportBatchAction } from '@/actions/gocardless/mutations/discard-import-batch';
import { finalizeImportBatchAction } from '@/actions/gocardless/mutations/finalize-import-batch';
import { loadImportBatchAction } from '@/actions/gocardless/mutations/load-import-batch';
import { updateImportRowAction } from '@/actions/gocardless/mutations/update-import-row';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { BankImportLoanCell, EMPTY_LOANS } from '@/components/transactions/bank-import-loan-cell';
import { BankImportProtocolDialog } from '@/components/transactions/bank-import-protocol-dialog';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { isImportRowReadyForSelection } from '@/lib/gocardless/import-matching';
import type { BankImportProtocol } from '@/lib/gocardless/import-protocol';
import { DEBIT_TRANSACTION_TYPES } from '@/lib/gocardless/import-transaction-utils';
import { formatCurrency, getLenderName } from '@/lib/utils';
import { formatIban } from '@/lib/utils/iban';
import type { LoanWithCalculations } from '@/types/loans';

export type BankImportAccountOption = {
  id: string;
  label: string;
  iban: string | null;
};

type Props = {
  projectId: string;
  accounts: BankImportAccountOption[];
  initialRows: BankImportRow[];
  initialAccountId: string | null;
  lenders: Pick<
    Lender,
    'id' | 'type' | 'firstName' | 'lastName' | 'organisationName' | 'titlePrefix' | 'titleSuffix' | 'lenderNumber'
  >[];
  loans: LoanWithCalculations[];
};

function buildAutoRowSelection(rows: BankImportRow[]): Record<string, boolean> {
  return Object.fromEntries(rows.filter(isImportRowReadyForSelection).map((row) => [row.id, true]));
}

function applyRowPatch(
  row: BankImportRow,
  patch: {
    selectedLenderId?: string | null;
    selectedLoanId?: string | null;
    selectedType?: TransactionType | null;
  },
): BankImportRow {
  const next = { ...row, ...patch };
  if (patch.selectedLenderId !== undefined && patch.selectedLenderId !== row.selectedLenderId) {
    if (patch.selectedLoanId === undefined) {
      next.selectedLoanId = null;
    }
  }
  return next;
}

export function BankImportClient({ projectId, accounts, initialRows, initialAccountId, lenders, loans }: Props) {
  const t = useTranslations('dashboard.transactions.import');
  const tLoans = useTranslations('dashboard.loans.transactions');
  const commonT = useTranslations('common');
  const format = useFormatter();
  const router = useRouter();

  const [rows, setRows] = useState(initialRows);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId ?? accounts[0]?.id ?? '');
  const [rowSelection, setRowSelection] = useState(() => buildAutoRowSelection(initialRows));
  const [protocol, setProtocol] = useState<BankImportProtocol | null>(null);
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [everHadRows, setEverHadRows] = useState(initialRows.length > 0);

  const lenderOptions = useMemo(
    () =>
      lenders.map((lender) => ({
        value: lender.id,
        label: `#${lender.lenderNumber} ${getLenderName(lender)}`.trim(),
      })),
    [lenders],
  );

  const loansByLenderId = useMemo(() => {
    const map = new Map<string, LoanWithCalculations[]>();
    for (const loan of loans) {
      const lenderId = loan.lender.id;
      const list = map.get(lenderId) ?? [];
      list.push(loan);
      map.set(lenderId, list);
    }
    return map;
  }, [loans]);

  const loanById = useMemo(() => new Map(loans.map((loan) => [loan.id, loan])), [loans]);

  const { execute: loadBatch, isExecuting: isLoadingBatch } = useAction(loadImportBatchAction, {
    onSuccess: ({ data }) => {
      const nextRows = data?.batch?.rows;
      if (nextRows) {
        setRows(nextRows);
        setRowSelection(buildAutoRowSelection(nextRows));
        if (nextRows.length > 0) {
          setEverHadRows(true);
        }
      }
      toast.success(t('loadSuccess', { count: data?.addedCount ?? 0 }));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('loadError'));
    },
  });

  const { executeAsync: updateRowAsync } = useAction(updateImportRowAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('updateError'));
    },
  });

  const { executeAsync: finalizeBatchAsync, isExecuting: isFinalizing } = useAction(finalizeImportBatchAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      const importedRowIds = new Set(data.imported.map((row) => row.rowId));
      setRows((prev) => prev.filter((row) => !importedRowIds.has(row.id)));
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const rowId of importedRowIds) {
          delete next[rowId];
        }
        return next;
      });
      setProtocol(data);
      setProtocolOpen(true);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('finalizeError'));
    },
  });

  const { execute: discardBatch, isExecuting: isDiscarding } = useAction(discardImportBatchAction, {
    onSuccess: () => {
      setRows([]);
      setRowSelection({});
      setDiscardOpen(false);
      toast.success(t('discardBatchSuccess'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('discardBatchError'));
    },
  });

  const handleRowUpdate = useCallback(
    (
      rowId: string,
      patch: {
        selectedLenderId?: string | null;
        selectedLoanId?: string | null;
        selectedType?: TransactionType | null;
      },
    ) => {
      let updatedRow: BankImportRow | null = null;

      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          updatedRow = applyRowPatch(row, patch);
          return updatedRow;
        }),
      );

      if (updatedRow && isImportRowReadyForSelection(updatedRow)) {
        setRowSelection((prev) => (prev[rowId] ? prev : { ...prev, [rowId]: true }));
      }

      void updateRowAsync({ projectId, rowId, ...patch }).catch(() => {
        toast.error(t('updateError'));
      });
    },
    [projectId, updateRowAsync, t],
  );

  const handleSelectLoan = useCallback(
    (rowId: string, loanId: string | null) => {
      handleRowUpdate(rowId, { selectedLoanId: loanId });
    },
    [handleRowUpdate],
  );

  const columns: ColumnDef<BankImportRow>[] = useMemo(
    () => [
      {
        accessorKey: 'bookingDate',
        header: t('columns.date'),
        cell: ({ row }) => format.dateTime(row.original.bookingDate, { dateStyle: 'medium' }),
      },
      {
        id: 'counterparty',
        header: t('columns.counterparty'),
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <div className="font-medium truncate">{row.original.counterpartyName ?? '—'}</div>
            {row.original.counterpartyIban ? (
              <div className="text-xs text-muted-foreground truncate">{formatIban(row.original.counterpartyIban)}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'remittanceInfo',
        header: t('columns.remittance'),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[220px] text-sm">{row.original.remittanceInfo ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('columns.amount'),
        cell: ({ row }) => (
          <span className={row.original.amount >= 0 ? 'text-success-foreground' : 'text-destructive'}>
            {formatCurrency(row.original.amount)} {row.original.currency}
          </span>
        ),
      },
      {
        id: 'lender',
        header: t('columns.lender'),
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <Combobox
              options={lenderOptions}
              value={row.original.selectedLenderId ?? undefined}
              onSelect={(value) => handleRowUpdate(row.original.id, { selectedLenderId: value || null })}
              placeholder={t('selectLender')}
              emptyText={commonT('ui.table.noResults')}
            />
          </div>
        ),
      },
      {
        id: 'loan',
        header: t('columns.loan'),
        cell: ({ row }) => {
          const lenderId = row.original.selectedLenderId;
          const lenderLoans = lenderId ? (loansByLenderId.get(lenderId) ?? EMPTY_LOANS) : EMPTY_LOANS;
          return (
            <BankImportLoanCell
              rowId={row.original.id}
              selectedLoanId={row.original.selectedLoanId}
              lenderLoans={lenderLoans}
              loanById={loanById}
              onSelectLoan={handleSelectLoan}
            />
          );
        },
      },
      {
        id: 'type',
        header: t('columns.type'),
        cell: ({ row }) => {
          if (row.original.amount > 0) {
            return <span className="text-sm">{commonT('enums.transaction.type.DEPOSIT')}</span>;
          }
          return (
            <Select
              value={row.original.selectedType ?? undefined}
              onValueChange={(value) => handleRowUpdate(row.original.id, { selectedType: value as TransactionType })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tLoans('typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {DEBIT_TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {commonT(`enums.transaction.type.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    [t, tLoans, commonT, format, lenderOptions, loansByLenderId, loanById, handleRowUpdate, handleSelectLoan],
  );

  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        label: t('confirmBulk'),
        icon: isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />,
        onClick: (ids) => {
          if (ids.length === 0) return;
          void finalizeBatchAsync({ projectId, rowIds: ids });
        },
      },
    ],
    [t, projectId, finalizeBatchAsync, isFinalizing],
  );

  const handleLoad = () => {
    if (!selectedAccountId) {
      toast.error(t('selectAccountFirst'));
      return;
    }
    loadBatch({ projectId, accountId: selectedAccountId });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDiscardOpen(true)}
              disabled={isDiscarding || isFinalizing}
            >
              {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t('discardBatch')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-md border border-border p-4">
        <div className="space-y-2 min-w-[280px]">
          <Label>{t('account')}</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder={t('accountPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.label}
                  {account.iban ? ` (${formatIban(account.iban)})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={handleLoad} disabled={isLoadingBatch || !selectedAccountId}>
          {isLoadingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {rows.length > 0 ? t('refreshFromBank') : t('loadFromBank')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{everHadRows ? t('emptyAfterImport') : t('empty')}</p>
      ) : (
        <DataTable
          fillHeight
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          bulkActions={bulkActions}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          hideHeader={false}
          showFilter={true}
          showPagination={true}
          showColumnVisibility={false}
          showExport={false}
        />
      )}

      <BankImportProtocolDialog open={protocolOpen} onOpenChange={setProtocolOpen} protocol={protocol} />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => discardBatch({ projectId })}
        title={t('discardBatchConfirmTitle')}
        description={t('discardBatchConfirmDescription')}
        confirmText={t('discardBatch')}
      />
    </div>
  );
}
