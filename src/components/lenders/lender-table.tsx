'use client';

import { Salutation } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { bulkDeleteLendersAction } from '@/actions/lenders';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { useRouter } from '@/i18n/navigation';
import {
  createAdditionalFieldDefaultColumnVisibility,
  createAdditionalFieldFilters,
  createAdditionalFieldsColumns,
  createColumn,
  createCurrencyColumn,
  createLenderAddressColumn,
  createLenderBankingColumn,
  createLenderEnumBadgeColumn,
  createLenderNameColumn,
} from '@/lib/table-column-utils';
import type { LenderWithRelations } from '@/types/lenders';
import type { ProjectWithConfiguration } from '@/types/projects';

interface LenderTableProps {
  lenders: LenderWithRelations[];
  project: ProjectWithConfiguration;
  projectId: string;
}

export function LenderTable({ lenders, project, projectId }: LenderTableProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();

  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { execute: executeBulkDelete } = useAction(bulkDeleteLendersAction, {
    onSuccess: () => {
      toast.success(t('bulkDelete.success'));
      setBulkDeleteIds([]);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('bulkDelete.error'));
    },
  });

  const bulkActions: BulkAction[] = [
    {
      label: commonT('ui.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: (ids) => {
        setBulkDeleteIds(ids);
        setIsConfirmOpen(true);
      },
    },
  ];

  const columns: ColumnDef<LenderWithRelations>[] = [
    createColumn<LenderWithRelations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
      },
      t,
    ),

    createLenderNameColumn<LenderWithRelations>(t),

    createLenderEnumBadgeColumn<LenderWithRelations>(
      'type',
      'table.type',
      'enums.lender.type',
      t,
      commonT,
      () => 'outline',
    ),

    createColumn<LenderWithRelations>(
      {
        accessorKey: 'email',
        header: 'table.email',
      },
      t,
    ),

    createColumn<LenderWithRelations>(
      {
        accessorKey: 'telNo',
        header: 'table.telNo',
      },
      t,
    ),

    createLenderAddressColumn<LenderWithRelations>(t),

    createLenderBankingColumn<LenderWithRelations>(t),

    createLenderEnumBadgeColumn<LenderWithRelations>(
      'salutation',
      'table.salutation',
      'enums.lender.salutation',
      t,
      commonT,
      () => 'outline',
    ),

    ...createAdditionalFieldsColumns<LenderWithRelations>(
      project.configuration.lenderAdditionalFields,
      'additionalFields',
      t,
      locale,
    ),

    createCurrencyColumn<LenderWithRelations>('amount', 'table.amount', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('balance', 'table.balance', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('deposits', 'table.deposits', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('withdrawals', 'table.withdrawals', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('notReclaimed', 'table.notReclaimed', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('interest', 'table.interest', tLoans, locale),

    createCurrencyColumn<LenderWithRelations>('interestPaid', 'table.interestPaid', tLoans, locale),
  ];

  // Define column filters based on data types
  const columnFilters = {
    lenderNumber: {
      type: 'number' as const,
      label: t('table.lenderNumber'),
    },
    type: {
      type: 'select' as const,
      label: t('table.type'),
      options: [
        { label: commonT('enums.lender.type.PERSON'), value: 'PERSON' },
        {
          label: commonT('enums.lender.type.ORGANISATION'),
          value: 'ORGANISATION',
        },
      ],
    },
    name: {
      type: 'text' as const,
      label: t('table.name'),
    },
    email: {
      type: 'text' as const,
      label: t('table.email'),
    },
    telNo: {
      type: 'text' as const,
      label: t('table.telNo'),
    },
    address: {
      type: 'text' as const,
      label: t('table.address'),
    },
    banking: {
      type: 'text' as const,
      label: t('table.banking'),
    },
    salutation: {
      type: 'select' as const,
      label: t('table.salutation'),
      options: Object.entries(Salutation).map(([key, value]) => ({
        label: commonT(`enums.lender.salutation.${key}`),
        value: value,
      })),
    },
    ...createAdditionalFieldFilters('additionalFields', project.configuration.lenderAdditionalFields),
    amount: {
      type: 'number' as const,
      label: tLoans('table.amount'),
    },
    balance: {
      type: 'number' as const,
      label: tLoans('table.balance'),
    },
    deposits: {
      type: 'number' as const,
      label: tLoans('table.deposits'),
    },
    withdrawals: {
      type: 'number' as const,
      label: tLoans('table.withdrawals'),
    },
    notReclaimed: {
      type: 'number' as const,
      label: tLoans('table.notReclaimed'),
    },
    interest: {
      type: 'number' as const,
      label: tLoans('table.interest'),
    },
    interestPaid: {
      type: 'number' as const,
      label: tLoans('table.interestPaid'),
    },
  };

  // Define default column visibility
  const defaultColumnVisibility = {
    lenderNumber: true,
    type: true,
    name: true,
    email: true,
    telNo: false,
    address: false,
    banking: false,
    salutation: false,
    amount: false,
    balance: true,
    deposits: false,
    withdrawals: false,
    notReclaimed: false,
    interest: false,
    interestPaid: false,
    ...createAdditionalFieldDefaultColumnVisibility('additionalFields', project.configuration.lenderAdditionalFields),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${projectId}/lenders/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={lenders}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType="LENDER"
        showFilter={true}
        onRowClick={(row) => router.push(`/${projectId}/lenders/${row.id}`)}
        bulkActions={bulkActions}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <ActionButton
              icon={<Plus className="h-4 w-4" />}
              tooltip={commonT('ui.actions.createLoan')}
              srOnly={commonT('ui.actions.createLoan')}
              onClick={() => {
                router.push(`/${projectId}/loans/new?lenderId=${row.id}`);
              }}
            />
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              tooltip={commonT('ui.actions.edit')}
              onClick={() => {
                router.push(`/${projectId}/lenders/${row.id}/edit`);
              }}
            />
          </div>
        )}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t('bulkDelete.confirmTitle')}
        description={t('bulkDelete.confirmDescription', { count: bulkDeleteIds.length })}
        onConfirm={() => {
          executeBulkDelete({ projectId, lenderIds: bulkDeleteIds });
        }}
      />
    </div>
  );
}
