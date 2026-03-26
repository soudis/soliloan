'use client';

import { NotificationType, Salutation, type View } from '@prisma/client';
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
import type { LenderWithCalculations } from '@/types/lenders';
import { useProject } from '../providers/project-provider';

interface LenderTableProps {
  lenders: LenderWithCalculations[];
  views: View[];
}

export function LenderTable({ lenders, views }: LenderTableProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { project } = useProject();

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

  const columns: ColumnDef<LenderWithCalculations>[] = [
    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
      },
      t,
    ),

    createLenderNameColumn<LenderWithCalculations>(t),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'type',
      'table.type',
      'enums.lender.type',
      t,
      commonT,
      () => 'outline',
    ),

    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'email',
        header: 'table.email',
      },
      t,
    ),

    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'telNo',
        header: 'table.telNo',
      },
      t,
    ),

    createLenderAddressColumn<LenderWithCalculations>(t),

    createLenderBankingColumn<LenderWithCalculations>(t),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'salutation',
      'table.salutation',
      'enums.lender.salutation',
      t,
      commonT,
      () => 'outline',
    ),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'notificationType',
      'table.notificationType',
      'enums.lender.notificationType',
      t,
      commonT,
      () => 'outline',
    ),

    ...createAdditionalFieldsColumns<LenderWithCalculations>(
      project.configuration.lenderAdditionalFields,
      'additionalFields',
      t,
      locale,
    ),

    createCurrencyColumn<LenderWithCalculations>('amount', 'table.amount', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('balance', 'table.balance', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('deposits', 'table.deposits', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('withdrawals', 'table.withdrawals', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('notReclaimed', 'table.notReclaimed', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('interest', 'table.interest', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('interestPaid', 'table.interestPaid', tLoans, locale),
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
    notificationType: {
      type: 'select' as const,
      label: t('table.notificationType'),
      options: Object.entries(NotificationType).map(([key, value]) => ({
        label: commonT(`enums.lender.notificationType.${key}`),
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
    notificationType: false,
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
        <Button onClick={() => router.push('/lenders/new')}>
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
        views={views}
        showFilter={true}
        onRowClick={(row) => router.push(`/lenders/${row.id}`)}
        bulkActions={bulkActions}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <ActionButton
              icon={<Plus className="h-4 w-4" />}
              tooltip={commonT('ui.actions.createLoan')}
              srOnly={commonT('ui.actions.createLoan')}
              onClick={() => {
                router.push(`/loans/new?lenderId=${row.id}`);
              }}
            />
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              tooltip={commonT('ui.actions.edit')}
              onClick={() => {
                router.push(`/lenders/${row.id}/edit`);
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
          executeBulkDelete({ projectId: project.id, lenderIds: bulkDeleteIds });
        }}
      />
    </div>
  );
}
