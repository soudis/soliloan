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
import {
  createAdditionalFieldDefaultColumnVisibility,
  createAdditionalFieldFilters,
  createAdditionalFieldsColumns,
  createColumn,
  createCurrencyColumn,
  createDateColumn,
  createEnumBadgeColumn,
  createLenderColumn,
  createNumberColumn,
  createPercentageColumn,
  createTerminationModalitiesColumn,
} from '@/lib/table-column-utils';
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
  const router = useRouter();
  const locale = useLocale();

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

  const columns: ColumnDef<LoanWithCalculations>[] = [
    createNumberColumn<LoanWithCalculations>('loanNumber', 'table.loanNumber', t, locale),

    createColumn<LoanWithCalculations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
        accessorFn: (row: LoanWithCalculations) => row.lender?.lenderNumber,
        cell: ({ row }) => {
          const value = row.original.lender?.lenderNumber || 0;
          return value.toFixed(0);
        },
      },
      t,
    ),

    createDateColumn<LoanWithCalculations>('signDate', 'table.signDate', t),

    createLenderColumn<LoanWithCalculations>(t),

    createCurrencyColumn<LoanWithCalculations>('amount', 'table.amount', t, locale),

    createCurrencyColumn<LoanWithCalculations>('balance', 'table.balance', t, locale),

    createCurrencyColumn<LoanWithCalculations>('deposits', 'table.deposits', t, locale),

    createCurrencyColumn<LoanWithCalculations>('withdrawals', 'table.withdrawals', t, locale),

    createCurrencyColumn<LoanWithCalculations>('notReclaimed', 'table.notReclaimed', t, locale),

    createPercentageColumn<LoanWithCalculations>('interestRate', 'table.interestRate', t, locale),

    createCurrencyColumn<LoanWithCalculations>('interest', 'table.interest', t, locale),

    createCurrencyColumn<LoanWithCalculations>('interestPaid', 'table.interestPaid', t, locale),

    createEnumBadgeColumn<LoanWithCalculations>(
      'terminationType',
      'table.terminationType',
      'enums.loan.terminationType',
      t,
      commonT,
      () => 'outline',
    ),

    createTerminationModalitiesColumn<LoanWithCalculations>(t, commonT),

    createDateColumn<LoanWithCalculations>('repayDate', 'table.repayDate', t),

    createEnumBadgeColumn<LoanWithCalculations>('status', 'table.status', 'enums.loan.status', t, commonT, (value) => {
      switch (value) {
        case 'ACTIVE':
          return 'default';
        case 'TERMINATED':
          return 'destructive';
        case 'PENDING':
          return 'secondary';
        default:
          return 'outline';
      }
    }),

    createEnumBadgeColumn<LoanWithCalculations>(
      'altInterestMethod',
      'table.altInterestMethod',
      'enums.interestMethod',
      t,
      commonT,
      () => 'outline',
    ),

    createEnumBadgeColumn<LoanWithCalculations>(
      'contractStatus',
      'table.contractStatus',
      'enums.loan.contractStatus',
      t,
      commonT,
      (value) => {
        switch (value) {
          case ContractStatus.COMPLETED:
            return 'default';
          default:
            return 'outline';
        }
      },
    ),
    ...createAdditionalFieldsColumns<LoanWithCalculations>(
      project.configuration.loanAdditionalFields,
      'additionalFields',
      t,
      locale,
    ),
  ];

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
      type: 'select' as const,
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
    status: true,
    altInterestMethod: false,
    contractStatus: false,
    ...createAdditionalFieldDefaultColumnVisibility('additionalFields', project.configuration.loanAdditionalFields),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push('/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={loans}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.LOAN}
        views={views}
        showFilter={true}
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
