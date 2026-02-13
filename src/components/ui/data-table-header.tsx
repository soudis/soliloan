'use client';

import type { View, ViewType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Table, VisibilityState } from '@tanstack/react-table';
import { isEqual } from 'lodash';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { createViewAction } from '@/actions/views/mutations/create-view';
import { deleteViewAction } from '@/actions/views/mutations/delete-view';
import { updateViewAction } from '@/actions/views/mutations/update-view';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useProjectId } from '@/lib/hooks/use-project-id';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import { DataTableColumnFilters } from './data-table-column-filters';
import { SaveViewDialog } from './save-view-dialog';
import { ViewManager } from './view-manager';

interface DataTableHeaderProps<TData> {
  table: Table<TData>;
  showColumnVisibility?: boolean;
  showFilter?: boolean;
  columnFilters?: {
    [key: string]: {
      type: 'text' | 'select' | 'number' | 'date';
      options?: { label: string; value: string }[];
      label?: string;
    };
  };
  viewType?: ViewType;
  views: View[];
  hasActiveFilters: () => boolean;
  defaultColumnVisibility: VisibilityState;
  tableState: TableUrlState;
  setTableState: SetTableUrlState;
}

export function DataTableHeader<TData>({
  table,
  showColumnVisibility = true,
  showFilter = true,
  columnFilters = {},
  defaultColumnVisibility,
  viewType,
  views,
  hasActiveFilters,
  tableState,
  setTableState,
}: DataTableHeaderProps<TData>) {
  const projectId = useProjectId();
  const t = useTranslations('dataTable');
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { executeAsync: executeCreateView } = useAction(createViewAction);
  const { executeAsync: executeUpdateView } = useAction(updateViewAction);
  const { executeAsync: executeDeleteView } = useAction(deleteViewAction);

  // Function to save the current view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    if (!viewType) return;

    setIsSaving(true);
    try {
      const result = await executeCreateView({
        name,
        type: viewType as ViewType,
        isDefault,
        data: {
          sorting: tableState.sorting,
          columnFilters: tableState.columnFilters,
          columnVisibility: tableState.columnVisibility,
          globalFilter: tableState.globalFilter,
          pageSize: tableState.pageSize,
          pagination: {
            pageIndex: 0,
            pageSize: tableState.pageSize,
          },
        },
        ...(projectId && { projectId }),
      });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Saving failed');
      }

      const view = result?.data?.view;

      // Refresh the view list
      await queryClient.invalidateQueries({ queryKey: ['views', viewType] });
      if (view) {
        // Select the new view — since the saved data matches current state,
        // all URL overrides will be cleared by the hook's diff logic.
        setTableState({
          selectedView: view.id,
          pageIndex: 0,
          pageSize: tableState.pageSize,
        });
      }
    } catch (err) {
      console.error('Error saving view:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDefault = async (viewId: string, isDefault: boolean) => {
    if (!viewType) return;

    await executeUpdateView({ viewId, data: { isDefault }, ...(projectId && { projectId }) });
    queryClient.invalidateQueries({ queryKey: ['views', viewType] });
  };

  const handleViewDelete = async (viewId: string) => {
    if (!viewType) return;

    await executeDeleteView({ viewId });
    queryClient.invalidateQueries({ queryKey: ['views', viewType] });
  };

  const viewDirty = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: view data is stored as JSON
    const viewData = (views.find((v) => v.id === tableState.selectedView)?.data as any) ?? {
      selectedView: '',
      columnVisibility: defaultColumnVisibility,
      sorting: [],
      columnFilters: [],
      globalFilter: '',
      pagination: { pageIndex: 0, pageSize: 25 },
    };

    return (
      tableState.globalFilter !== (viewData.globalFilter ?? '') ||
      tableState.pageSize !== (viewData.pagination?.pageSize ?? viewData.pageSize ?? 25) ||
      !isEqual(tableState.columnVisibility, viewData.columnVisibility ?? defaultColumnVisibility) ||
      !isEqual(tableState.sorting, viewData.sorting ?? []) ||
      !isEqual(tableState.columnFilters, viewData.columnFilters ?? [])
    );
  }, [views, tableState, defaultColumnVisibility]);

  return (
    <>
      <div className="flex items-center py-4">
        {showFilter && (
          <div className="flex items-center gap-4">
            <Input
              placeholder={t('globalFilter') || 'Search all columns...'}
              value={tableState.globalFilter}
              onChange={(event) => {
                setTableState({ globalFilter: event.target.value });
              }}
              className="max-w-sm"
            />
          </div>
        )}
        <div className="ml-auto flex items-center space-x-2">
          {viewType && (
            <>
              <ViewManager
                viewDirty={viewDirty}
                views={views}
                state={tableState}
                onViewDefault={handleViewDefault}
                onViewSelect={(view) => {
                  if (view === null) {
                    // Reset to default — the hook will clear all URL overrides since they match the baseline
                    setTableState({
                      selectedView: '',
                      columnVisibility: defaultColumnVisibility,
                      sorting: [],
                      columnFilters: [],
                      globalFilter: '',
                      pageIndex: 0,
                      pageSize: 25,
                    });
                    return;
                  }

                  if (!view.data) return;

                  const {
                    columnVisibility,
                    sorting,
                    columnFilters,
                    globalFilter,
                    pageSize,
                    pagination,
                    // biome-ignore lint/suspicious/noExplicitAny: view data is stored as JSON
                  } = view.data as any;
                  // Set the view — the hook diffs against the new view's baseline and only
                  // keeps URL params that differ, so selecting a view yields a clean URL.
                  setTableState({
                    selectedView: view.id,
                    columnVisibility: columnVisibility ?? defaultColumnVisibility,
                    sorting: sorting ?? [],
                    columnFilters: columnFilters ?? [],
                    globalFilter: globalFilter ?? '',
                    pageIndex: 0,
                    pageSize: pagination?.pageSize ?? pageSize ?? 25,
                  });
                }}
                onViewDelete={handleViewDelete}
              />
              <SaveViewDialog onSave={handleSaveView} isLoading={isSaving} disabled={!viewDirty} />
            </>
          )}
          {Object.keys(columnFilters).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowColumnFilters(!showColumnFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t('filters')}
              {hasActiveFilters() && <span className="ml-2 flex h-2 w-2 rounded-full bg-primary" />}
            </Button>
          )}
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8">
                  {t('columns')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {columnFilters[column.id]?.label || column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {showColumnFilters && viewType && Object.keys(columnFilters).length > 0 && (
        <DataTableColumnFilters tableState={tableState} setTableState={setTableState} columnFilters={columnFilters} />
      )}
    </>
  );
}
