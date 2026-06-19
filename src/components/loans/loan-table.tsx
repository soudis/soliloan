'use client';

import { ContractStatus, InterestMethod, TerminationType, type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { bulkDeleteLoansAction, deleteLoanAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import { buildAllLoanTableColumns } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { createAdditionalFieldDefaultColumnVisibility, createAdditionalFieldFilters } from '@/lib/table-column-utils';
import { LoanStatus, type LoanWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

interface LoanTableProps {
  loans: LoanWithCalculations[];
  project: ProjectWithConfiguration;
  projectId: string;
  views: View[];
}

export function LoanTable({ loans, project, projectId, views }: LoanTableProps) {
  const t = useTranslations('dashboard.loans');
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
    commonT,
    locale,
    (key, values) => tDuration(key, values),
  );

  // Define column filters based on data types
  const columnFilters = {
    loanNumber: {
      type: 'number' as const,
      label: t('table.loanNumber'),
    },
    lenderNumber: {
      type: 'number' as const,
      label: t('table.lenderNumber'),
    },
    lenderName: {
      type: 'text' as const,
      label: t('table.lenderName'),
    },
    signDate: {
      type: 'date' as const,
      label: t('table.signDate'),
    },
    amount: {
      type: 'number' as const,
      label: t('table.amount'),
    },
    balance: {
      type: 'number' as const,
      label: t('table.balance'),
    },
    deposits: {
      type: 'number' as const,
      label: t('table.deposits'),
    },
    withdrawals: {
      type: 'number' as const,
      label: t('table.withdrawals'),
    },
    notReclaimed: {
      type: 'number' as const,
      label: t('table.notReclaimed'),
    },
    interestRate: {
      type: 'number' as const,
      label: t('table.interestRate'),
    },
    interest: {
      type: 'number' as const,
      label: t('table.interest'),
    },
    interestPaid: {
      type: 'number' as const,
      label: t('table.interestPaid'),
    },
    terminationType: {
      type: 'multi-select' as const,
      label: t('table.terminationType'),
      options: Object.entries(TerminationType).map(([key, value]) => ({
        label: commonT(`enums.loan.terminationType.${key}`),
        value: value,
      })),
    },
    terminationModalities: {
      type: 'text' as const,
      label: t('table.terminationModalities'),
    },
    repayDate: {
      type: 'date' as const,
      label: t('table.repayDate'),
    },
    loanTermDays: {
      type: 'number' as const,
      label: t('table.loanTerm'),
    },
    repaymentPeriodDays: {
      type: 'number' as const,
      label: t('table.repaymentPeriod'),
    },
    status: {
      type: 'select' as const,
      label: t('table.status'),
      options: Object.entries(LoanStatus).map(([key, value]) => ({
        label: commonT(`enums.loan.status.${key}`),
        value: value,
      })),
    },
    altInterestMethod: {
      type: 'select' as const,
      label: t('table.altInterestMethod'),
      options: Object.entries(InterestMethod).map(([key, value]) => ({
        label: commonT(`enums.interestMethod.${key}`),
        value: value,
      })),
    },
    contractStatus: {
      type: 'select' as const,
      label: t('table.contractStatus'),
      options: Object.entries(ContractStatus).map(([key, value]) => ({
        label: commonT(`enums.loan.contractStatus.${key}`),
        value: value,
      })),
    },
    ...createAdditionalFieldFilters('additionalFields', project.configuration.loanAdditionalFields),
  };

  // Define default column visibility
  const defaultColumnVisibility = {
    loanNumber: false,
    lenderNumber: false,
    lenderName: true,
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
  };

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
