'use client';

import { type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, FileCode, Mail, Pencil, Trash2, Wand2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { deleteTransactionAction } from '@/actions/loans';
import { bulkDeleteTransactionsAction } from '@/actions/transactions/mutations/bulk-delete-transactions';
import { previewNotifyTransactionsAction } from '@/actions/transactions/mutations/notify-transactions';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { NotifyTransactionsDialog } from '@/components/transactions/notify-transactions-dialog';
import { OutboundPaymentDialog } from '@/components/transactions/outbound-payment-dialog';
import { TransactionTimeRangeControl } from '@/components/transactions/transaction-time-range-control';
import { ActionButton } from '@/components/ui/action-button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import {
  buildAllTransactionTableColumns,
  buildTransactionTableDefaultColumnVisibility,
} from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import { buildTransactionTableColumnFilters } from '@/lib/entity-filters/filter-definitions';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import {
  DEFAULT_TRANSACTION_TABLE_SORTING,
  getTransactionTimeRangeFromState,
  useTransactionTableUrlState,
} from '@/lib/hooks/use-transaction-table-url-state';
import { isOutboundSepaType } from '@/lib/processes/payout-groups';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';
import {
  getTransactionIdFromListItemRowId,
  getTransactionListItemRowId,
} from '@/lib/transactions/build-transaction-list-items';
import { applyTransactionTableFilters, isTransactionDeletable } from '@/lib/transactions/transaction-table-filters';
import type { ProjectWithConfiguration } from '@/types/projects';
import type { TransactionListItem } from '@/types/transactions';

interface TransactionTableProps {
  transactions: TransactionListItem[];
  project: ProjectWithConfiguration;
  projectId: string;
  views: View[];
  viewId?: string;
  hasBankConnection?: boolean;
}

export function TransactionTable({
  transactions,
  project,
  projectId,
  views,
  viewId,
  hasBankConnection = false,
}: TransactionTableProps) {
  const t = useTranslations('dashboard.transactions');
  const tProcesses = useTranslations('processes');
  const tImport = useTranslations('dashboard.transactions.import');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const router = useRouter();
  const locale = useLocale();
  const selectedViewName = useSelectedViewName(views, viewId);

  const defaultColumnVisibility = useMemo(() => buildTransactionTableDefaultColumnVisibility(project), [project]);

  const {
    state: tableState,
    setState: setTableState,
    extraViewData,
    isExtraViewDataDirty,
  } = useTransactionTableUrlState({
    defaultColumnVisibility,
    views,
    viewId,
    listPath: TABLE_LIST_PATHS.transactions,
  });

  type DeleteState = { mode: 'bulk'; ids: string[] } | { mode: 'single'; transactionId: string } | null;
  type SkippedDelete = {
    id: string;
    loanNumber: number | null;
    lenderName: string | null;
    reason: 'notFound' | 'interest' | 'notLatest';
  };

  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [skippedDeletes, setSkippedDeletes] = useState<SkippedDelete[]>([]);
  const [outbound, setOutbound] = useState<{ mode: 'sepa' | 'stepper'; rows: TransactionListItem[] } | null>(null);
  const [notify, setNotify] = useState<{
    transactionIds: string[];
    preview: {
      sample: { html: string; subject: string } | null;
      alreadyNotifiedCount: number;
      missingEmailCount: number;
      realCount: number;
    };
  } | null>(null);

  const { executeAsync: executeBulkDelete, isExecuting: isDeleting } = useAction(bulkDeleteTransactionsAction);
  const { executeAsync: previewNotify } = useAction(previewNotifyTransactionsAction);

  const rowsForSelection = (rowIds: string[]) => {
    const wanted = new Set(rowIds);
    return transactions.filter((row) => wanted.has(getTransactionListItemRowId(row)));
  };

  const openOutbound = (mode: 'sepa' | 'stepper', rowIds: string[]) => {
    const selected = rowsForSelection(rowIds);
    if (selected.length === 0 || !selected.every((row) => isOutboundSepaType(row.type))) {
      toast.error(tProcesses('sepa.outboundOnly'));
      return;
    }
    setOutbound({ mode, rows: selected });
  };

  const openNotify = async (rowIds: string[]) => {
    const selected = rowsForSelection(rowIds).filter((row) => row.type !== 'INTEREST');
    if (selected.length === 0) {
      toast.error(t('notify.interestOnly'));
      return;
    }
    const result = await previewNotify({
      projectId,
      transactionIds: selected.map((row) => row.id),
    });
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('notify.noSample'));
      return;
    }
    setNotify({ transactionIds: selected.map((row) => row.id), preview: result.data });
  };

  const confirmBulkDelete = async () => {
    if (deleteState?.mode !== 'bulk') return;
    const result = await executeBulkDelete({ projectId, transactionIds: deleteState.ids });
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('bulkDelete.error'));
      return;
    }
    if (result.data.skipped.length === 0) {
      toast.success(t('bulkDelete.success', { count: result.data.deletedCount }));
      setDeleteState(null);
      setSkippedDeletes([]);
      return;
    }
    if (result.data.deletedCount > 0) {
      toast.success(
        t('bulkDelete.partialSuccess', { deleted: result.data.deletedCount, skipped: result.data.skipped.length }),
      );
    }
    setSkippedDeletes(
      result.data.skipped.map((entry) => ({
        ...entry,
        reason: entry.id.endsWith('-interest') ? 'interest' : entry.reason,
      })),
    );
  };

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
      label: t('notify.action'),
      icon: <Mail className="h-4 w-4" />,
      onClick: (ids) => {
        void openNotify(ids);
      },
    },
    {
      label: t('outbound.assistant'),
      icon: <Wand2 className="h-4 w-4" />,
      onClick: (ids) => openOutbound('stepper', ids),
    },
    {
      label: t('outbound.sepa'),
      icon: <FileCode className="h-4 w-4" />,
      onClick: (ids) => openOutbound('sepa', ids),
    },
    {
      label: commonT('ui.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: (ids) => {
        setSkippedDeletes([]);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when table state changes
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
        {hasBankConnection ? (
          <ActionButton
            intent="neutral"
            density="header"
            icon={<ArrowDownToLine className="h-4 w-4" />}
            label={tImport('button')}
            onClick={() => router.push('/transactions/import')}
          />
        ) : null}
      </div>

      <DataTable
        fillHeight
        columns={columns}
        data={filteredTransactions}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        defaultSorting={DEFAULT_TRANSACTION_TABLE_SORTING}
        viewType={ViewType.TRANSACTION}
        views={views}
        viewId={viewId}
        listPath={TABLE_LIST_PATHS.transactions}
        allowSidebarViews
        showFilter={true}
        showExport
        exportPrefix="Transaktionen"
        tableState={tableState}
        setTableState={setTableState}
        extraViewData={extraViewData}
        isExtraViewDataDirty={isExtraViewDataDirty}
        toolbarContent={<TransactionTimeRangeControl state={tableState} setTableState={setTableState} />}
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
        open={deleteState?.mode === 'single'}
        onOpenChange={(open) => !open && setDeleteState(null)}
        title={t('delete.confirmTitle')}
        description={t('delete.confirmDescription')}
        onConfirm={() => {
          if (deleteState?.mode === 'single') {
            executeDeleteTransaction({ transactionId: deleteState.transactionId });
          }
        }}
      />

      <AlertDialog
        open={deleteState?.mode === 'bulk'}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteState(null);
            setSkippedDeletes([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {skippedDeletes.length > 0 ? t('bulkDelete.skippedTitle') : t('bulkDelete.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {skippedDeletes.length > 0
                ? t('bulkDelete.skippedDescription')
                : t('bulkDelete.confirmDescription', {
                    count: deleteState?.mode === 'bulk' ? deleteState.ids.length : 0,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {skippedDeletes.length > 0 ? (
            <ul className="max-h-60 space-y-2 overflow-y-auto text-sm">
              {skippedDeletes.map((entry) => (
                <li key={entry.id}>
                  <span className="font-medium">
                    {[entry.lenderName, entry.loanNumber != null ? `#${entry.loanNumber}` : null]
                      .filter(Boolean)
                      .join(' · ') || entry.id}
                  </span>
                  {` — ${t(`bulkDelete.reasons.${entry.reason}`)}`}
                </li>
              ))}
            </ul>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{commonT('ui.actions.cancel')}</AlertDialogCancel>
            {skippedDeletes.length === 0 ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void confirmBulkDelete()}
              >
                {commonT('ui.actions.delete')}
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {outbound ? (
        <OutboundPaymentDialog
          open
          mode={outbound.mode}
          rows={outbound.rows}
          project={project}
          projectId={projectId}
          onOpenChange={(open) => {
            if (!open) setOutbound(null);
          }}
        />
      ) : null}

      {notify ? (
        <NotifyTransactionsDialog
          open
          projectId={projectId}
          transactionIds={notify.transactionIds}
          preview={notify.preview}
          onOpenChange={(open) => {
            if (!open) setNotify(null);
          }}
        />
      ) : null}
    </div>
  );
}
