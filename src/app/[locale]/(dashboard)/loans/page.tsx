'use client';

import { ContractStatus, InterestMethod, TerminationType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { getLoansByProjectAction } from '@/actions';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
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
import { useProjects } from '@/store/projects-store';
import { LoanStatus, type LoanWithRelations } from '@/types/loans';

export default function LoansPage() {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const router = useRouter();
  const { selectedProject } = useProjects();
  const locale = useLocale();

  const { data: loans = [], isLoading: loading } = useQuery({
    queryKey: ['loans', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const result = await getLoansByProjectAction({ projectId: selectedProject.id });
      if (result.serverError) {
        throw new Error(result.serverError);
      }
      return result.data?.loans;
    },
    enabled: !!selectedProject,
  });

  const columns: ColumnDef<LoanWithRelations>[] = [
    createNumberColumn<LoanWithRelations>('loanNumber', 'table.loanNumber', t, locale),

    createColumn<LoanWithRelations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
        accessorFn: (row: LoanWithRelations) => row.lender?.lenderNumber,
        cell: ({ row }) => {
          const value = row.original.lender?.lenderNumber || 0;
          return value.toFixed(0);
        },
      },
      t,
    ),

    createLenderColumn<LoanWithRelations>(t),

    createDateColumn<LoanWithRelations>('signDate', 'table.signDate', t),

    createCurrencyColumn<LoanWithRelations>('amount', 'table.amount', t, locale),

    createCurrencyColumn<LoanWithRelations>('balance', 'table.balance', t, locale),

    createCurrencyColumn<LoanWithRelations>('deposits', 'table.deposits', t, locale),

    createCurrencyColumn<LoanWithRelations>('withdrawals', 'table.withdrawals', t, locale),

    createCurrencyColumn<LoanWithRelations>('notReclaimed', 'table.notReclaimed', t, locale),

    createPercentageColumn<LoanWithRelations>('interestRate', 'table.interestRate', t, locale),

    createCurrencyColumn<LoanWithRelations>('interest', 'table.interest', t, locale),

    createCurrencyColumn<LoanWithRelations>('interestPaid', 'table.interestPaid', t, locale),

    createEnumBadgeColumn<LoanWithRelations>(
      'terminationType',
      'table.terminationType',
      'enums.loan.terminationType',
      t,
      commonT,
      () => 'outline',
    ),

    createTerminationModalitiesColumn<LoanWithRelations>(t, commonT),

    createDateColumn<LoanWithRelations>('repayDate', 'table.repayDate', t),

    createEnumBadgeColumn<LoanWithRelations>('status', 'table.status', 'enums.loan.status', t, commonT, (value) => {
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

    createEnumBadgeColumn<LoanWithRelations>(
      'altInterestMethod',
      'table.altInterestMethod',
      'enums.interestMethod',
      t,
      commonT,
      () => 'outline',
    ),

    createEnumBadgeColumn<LoanWithRelations>(
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
    ...createAdditionalFieldsColumns<LoanWithRelations>(
      selectedProject?.configuration.loanAdditionalFields,
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
    ...createAdditionalFieldFilters('additionalFields', selectedProject?.configuration.loanAdditionalFields),
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
    contractStatus: true,
    ...createAdditionalFieldDefaultColumnVisibility(
      'additionalFields',
      selectedProject?.configuration.loanAdditionalFields,
    ),
  };

  if (!selectedProject) {
    return null;
  }

  if (loading) {
    return null;
  }

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
        viewType="LOAN"
        showFilter={true}
        onRowClick={(row) => router.push(`/lenders/${row.lender.id}?loanId=${row.id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              tooltip={commonT('ui.actions.edit')}
              srOnly={commonT('ui.actions.edit')}
              onClick={() => {
                router.push(`/loans/${row.id}/edit`);
              }}
            />
          </div>
        )}
      />
    </div>
  );
}
