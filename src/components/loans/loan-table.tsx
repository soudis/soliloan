'use client';

import { type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { bulkDeleteLoansAction, deleteLoanAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { buildLenderProfileDefaultColumnVisibility } from '@/lib/dashboard/table-widget/lender-profile-columns';
import { buildAllLoanTableColumns } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { buildLoanTableColumnFilters } from '@/lib/entity-filters/filter-definitions';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import { createAdditionalFieldDefaultColumnVisibility } from '@/lib/table-column-utils';
import type { LoanWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

interface LoanTableProps {
  loans: LoanWithCalculations[];
  project: ProjectWithConfiguration;
  projectId: string;
  views: View[];
}

export function LoanTable({ loans, project, projectId, views }: LoanTableProps) {
  const t = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const router = useRouter();
  const locale = useLocale();
  const selectedViewName = useSelectedViewName(views);

  type DeleteState = { mode: 'bulk'; ids: string[] } | { mode: 'single'; loanId: string } | null;

  const [deleteState, setDeleteState] = useState<DeleteState>(null);

  const { execute: executeBulkDelete } = useAction(bulkDeleteLoansAction, {
    onSuccess: () => {
      toast.success(t('bulkDelete.success'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('bulkDelete.error'));
    },
  });

  const { execute: executeDeleteLoan } = useAction(deleteLoanAction, {
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
        setDeleteState({ mode: 'bulk', ids });
      },
    },
  ];

  const columns: ColumnDef<LoanWithCalculations>[] = buildAllLoanTableColumns(
    project,
    t,
    tLenders,
    commonT,
    locale,
    (key, values) => tDuration(key, values),
  );

  const columnFilters = useMemo(
    () => buildLoanTableColumnFilters(project, t, tLenders, commonT),
    [project, t, tLenders, commonT],
  );

  const defaultColumnVisibility = useMemo(
    () => ({
      loanNumber: false,
      signDate: true,
      amount: true,
      balance: true,
      deposits: false,
      withdrawals: false,
      notReclaimed: false,
      interestRate: true,
      interest: false,
      interestPaid: false,
      terminationType: false,
      terminationModalities: false,
      repayDate: false,
      loanTermDays: false,
      repaymentPeriodDays: false,
      status: true,
      altInterestMethod: false,
      contractStatus: false,
      ...createAdditionalFieldDefaultColumnVisibility('additionalFields', project.configuration.loanAdditionalFields),
      ...buildLenderProfileDefaultColumnVisibility(project, 'lender.', ['name']),
    }),
    [project],
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
        <Button onClick={() => router.push('/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        fillHeight
        columns={columns}
        data={loans}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.LOAN}
        views={views}
        allowSidebarViews
        showFilter={true}
        showExport
        exportPrefix="Darlehen"
        onRowClick={(row) => router.push(`/lenders/${row.lender.id}?loanId=${row.id}`)}
        bulkActions={bulkActions}
        actions={(row) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                router.push(`/loans/${row.id}/edit`);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {commonT('ui.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteState({ mode: 'single', loanId: row.id })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {commonT('ui.actions.delete')}
            </DropdownMenuItem>
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
            executeBulkDelete({ projectId, loanIds: deleteState.ids });
          } else if (deleteState?.mode === 'single') {
            executeDeleteLoan({ loanId: deleteState.loanId });
          }
        }}
      />
    </div>
  );
}
