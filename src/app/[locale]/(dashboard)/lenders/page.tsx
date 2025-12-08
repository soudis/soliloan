'use client';

import { Salutation } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { getLendersByProjectAction } from '@/actions/lenders';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useProjects } from '@/store/projects-store';
import type { LenderWithRelations } from '@/types/lenders';

export default function LendersPage() {
  const router = useRouter();
  const { selectedProject } = useProjects();
  const t = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();

  const { data: lenders = [], isLoading: loading } = useQuery({
    queryKey: ['lenders', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const result = await getLendersByProjectAction({ projectId: selectedProject.id });
      if (result.serverError) {
        throw new Error(result.serverError);
      }
      return result.data?.lenders;
    },
    enabled: !!selectedProject,
  });

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
      selectedProject?.configuration.lenderAdditionalFields,
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
    ...createAdditionalFieldFilters('additionalFields', selectedProject?.configuration.lenderAdditionalFields),
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
    ...createAdditionalFieldDefaultColumnVisibility(
      'additionalFields',
      selectedProject?.configuration.lenderAdditionalFields,
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
        showFilter={true}
        onRowClick={(row) => router.push(`/lenders/${row.id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/loans/new?lenderId=${row.id}`);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">{commonT('ui.actions.createLoan')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commonT('ui.actions.createLoan')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/lenders/${row.id}/edit`);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{commonT('ui.actions.edit')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commonT('ui.actions.edit')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      />
    </div>
  );
}
