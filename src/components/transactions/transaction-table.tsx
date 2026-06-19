'use client';

import { type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteTransactionAction } from '@/actions/loans';
import { bulkDeleteTransactionsAction } from '@/actions/transactions/mutations/bulk-delete-transactions';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { TransactionTimeRangeControl } from '@/components/transactions/transaction-time-range-control';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  buildAllTransactionTableColumns,
  buildTransactionTableDefaultColumnVisibility,
} from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import { buildTransactionTableColumnFilters } from '@/lib/entity-filters/filter-definitions';
import {
  getTransactionTimeRangeFromState,
  useTransactionTableUrlState,
} from '@/lib/hooks/use-transaction-table-url-state';
import {
  getTransactionIdFromListItemRowId,
  getTransactionListItemRowId,
} from '@/lib/transactions/build-transaction-list-items';
import { applyTransactionTableFilters, isTransactionDeletable } from '@/lib/transactions/transaction-table-filters';
import { useRouter } from '@/i18n/navigation';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import type { TransactionListItem } from '@/types/transactions';
import type { ProjectWithConfiguration } from '@/types/projects';

interface TransactionTableProps {
  transactions: TransactionListItem[];
  project: ProjectWithConfiguration;
  projectId: string;
  views: View[];
}

export function TransactionTable({ transactions, project, projectId, views }: TransactionTableProps) {
  const t = useTranslations('dashboard.transactions');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const router = useRouter();
  const locale = useLocale();
  const selectedViewName = useSelectedViewName(views);

  const defaultColumnVisibility = useMemo(() => buildTransactionTableDefaultColumnVisibility(project), [project]);

  const {
    state: tableState,
    setState: setTableState,
    extraViewData,
    isExtraViewDataDirty,
  } = useTransactionTableUrlState({
    defaultColumnVisibility,
    views,
  });

  type DeleteState = { mode: 'bulk'; ids: string[] } | { mode: 'single'; transactionId: string } | null;

  const [deleteState, setDeleteState] = useState<DeleteState>(null);

  const { execute: executeBulkDelete } = useAction(bulkDeleteTransactionsAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      if (data.skippedCount > 0) {
        toast.success(t('bulkDelete.partialSuccess', { deleted: data.deletedCount, skipped: data.skippedCount }));
      } else {
        toast.success(t('bulkDelete.success', { count: data.deletedCount }));
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('bulkDelete.error'));
    },
  });

  const { execute: executeDeleteTransaction } = useAction(deleteTransactionAction, {
    onSuccess: () => {
      toast.success(t('delete.success'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('delete.error'));
    },
  });

  const bulkActions: BulkAction[] = [
    {
      label: commonT('ui.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: (ids) => {
        setDeleteState({
          mode: 'bulk',
          ids: ids.map(getTransactionIdFromListItemRowId),
        });
      },
    },
  ];

  const columns: ColumnDef<TransactionListItem>[] = buildAllTransactionTableColumns(
    project,
    t,
    tLoans,
    tLenders,
    commonT,
    locale,
    (key, values) => tDuration(key, values),
  );

  const columnFilters = useMemo(
    () => buildTransactionTableColumnFilters(project, t, tLoans, tLenders, commonT),
    [project, t, tLoans, tLenders, commonT],
  );

  const filteredTransactions = useMemo(
    () => applyTransactionTableFilters(transactions, getTransactionTimeRangeFromState(tableState)),
    [transactions, tableState.txRange, tableState.txRangeFrom, tableState.txRangeTo, tableState.includeInterest],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          {selectedViewName ? (
            <p className="mt-0.5 text-base font-normal text-muted-foreground">{selectedViewName}</p>
          ) : null}
        </div>
      </div>

      <DataTable
        fillHeight
        columns={columns}
        data={filteredTransactions}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.TRANSACTION}
        views={views}
        allowSidebarViews
        showFilter={true}
        showExport
        exportPrefix="Transaktionen"
        tableState={tableState}
        setTableState={setTableState}
        extraViewData={extraViewData}
        isExtraViewDataDirty={isExtraViewDataDirty}
        toolbarExtra={<TransactionTimeRangeControl state={tableState} setTableState={setTableState} />}
        getRowId={getTransactionListItemRowId}
        onRowClick={(row) => router.push(`/lenders/${row.loan.lender.id}?loanId=${row.loan.id}`)}
        bulkActions={bulkActions}
        actions={(row) => (
          <>
            <DropdownMenuItem onClick={() => router.push(`/lenders/${row.loan.lender.id}?loanId=${row.loan.id}`)}>
              <Pencil className="h-4 w-4 mr-2" />
              {commonT('ui.actions.edit')}
            </DropdownMenuItem>
            {isTransactionDeletable(row) ? (
              <DropdownMenuItem
                onClick={() => setDeleteState({ mode: 'single', transactionId: row.id })}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {commonT('ui.actions.delete')}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      />

      <ConfirmDialog
        open={deleteState !== null}
        onOpenChange={(open) => !open && setDeleteState(null)}
        title={deleteState?.mode === 'bulk' ? t('bulkDelete.confirmTitle') : t('delete.confirmTitle')}
        description={
          deleteState?.mode === 'bulk'
            ? t('bulkDelete.confirmDescription', { count: deleteState.ids.length })
            : t('delete.confirmDescription')
        }
        onConfirm={() => {
          if (deleteState?.mode === 'bulk') {
            executeBulkDelete({ projectId, transactionIds: deleteState.ids });
          } else if (deleteState?.mode === 'single') {
            executeDeleteTransaction({ transactionId: deleteState.transactionId });
          }
        }}
      />
    </div>
  );
}
