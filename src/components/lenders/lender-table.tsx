'use client';

import type { View } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { bulkDeleteLendersAction, deleteLenderAction } from '@/actions/lenders';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { LENDER_DETAIL_COLUMN_META } from '@/lib/dashboard/table-widget/lender-profile-columns';
import { buildAllLenderTableColumns } from '@/lib/dashboard/table-widget/lender-table-column-registry';
import { buildLenderTableColumnFilters } from '@/lib/entity-filters/filter-definitions';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import { createAdditionalFieldDefaultColumnVisibility } from '@/lib/table-column-utils';
import type { LenderListItem } from '@/types/lenders';
import { useProject } from '../providers/project-provider';

interface LenderTableProps {
  lenders: LenderListItem[];
  views: View[];
}

export function LenderTable({ lenders, views }: LenderTableProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { project } = useProject();
  const selectedViewName = useSelectedViewName(views);

  type DeleteState = { mode: 'bulk'; ids: string[] } | { mode: 'single'; lenderId: string } | null;

  const [deleteState, setDeleteState] = useState<DeleteState>(null);

  const { execute: executeBulkDelete } = useAction(bulkDeleteLendersAction, {
    onSuccess: () => {
      toast.success(t('bulkDelete.success'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('bulkDelete.error'));
    },
  });

  const { execute: executeDeleteLender } = useAction(deleteLenderAction, {
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

  const columns: ColumnDef<LenderListItem>[] = buildAllLenderTableColumns(project, t, tLoans, commonT, locale);

  const columnFilters = useMemo(
    () => buildLenderTableColumnFilters(project, t, tLoans, commonT),
    [project, t, tLoans, commonT],
  );

  const defaultColumnVisibility = useMemo(
    () => ({
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
      ...Object.fromEntries(LENDER_DETAIL_COLUMN_META.map((column) => [column.id, false])),
    }),
    [project.configuration.lenderAdditionalFields],
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
        <Button onClick={() => router.push('/lenders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        fillHeight
        columns={columns}
        data={lenders}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType="LENDER"
        views={views}
        allowSidebarViews
        showFilter={true}
        showExport
        exportPrefix="Darlehensgeber"
        onRowClick={(row) => router.push(`/lenders/${row.id}`)}
        bulkActions={bulkActions}
        actions={(row) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                router.push(`/loans/new?lenderId=${row.id}`);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {commonT('ui.actions.createLoan')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                router.push(`/lenders/${row.id}/edit`);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {commonT('ui.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteState({ mode: 'single', lenderId: row.id })}
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
            executeBulkDelete({ projectId: project.id, lenderIds: deleteState.ids });
          } else if (deleteState?.mode === 'single') {
            executeDeleteLender({ lenderId: deleteState.lenderId });
          }
        }}
      />
    </div>
  );
}
