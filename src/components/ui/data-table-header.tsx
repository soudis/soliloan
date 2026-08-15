'use client';

import type { View, ViewType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import type { SortingState, Table, VisibilityState } from '@tanstack/react-table';
import { isEqual } from 'lodash';
import { ChevronDown, FileDown, Save, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { type ReactNode, useMemo, useState } from 'react';
import { createViewAction } from '@/actions/views/mutations/create-view';
import { deleteViewAction } from '@/actions/views/mutations/delete-view';
import { updateViewAction } from '@/actions/views/mutations/update-view';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import { DataTableColumnFilters } from './data-table-column-filters';
import { DataTableExportDialog } from './data-table-export-dialog';
import { SaveViewDialog } from './save-view-dialog';
import { ViewManager } from './view-manager';

const EMPTY_SORTING: SortingState = [];

type ColumnFiltersConfig = {
  [key: string]: {
    type: 'text' | 'select' | 'multi-select' | 'number' | 'date' | 'boolean';
    options?: { label: string; value: string }[];
    label?: string;
    allowEmpty?: boolean;
  };
};

interface DataTableHeaderProps<TData> {
  table: Table<TData>;
  showColumnVisibility?: boolean;
  showFilter?: boolean;
  columnFilters?: ColumnFiltersConfig;
  viewType?: ViewType;
  views: View[];
  hasActiveFilters: () => boolean;
  defaultColumnVisibility: VisibilityState;
  defaultSorting?: SortingState;
  tableState: TableUrlState;
  setTableState: SetTableUrlState;
  allowSidebarViews?: boolean;
  showExport?: boolean;
  exportPrefix?: string;
  exportDisabled?: boolean;
  toolbarExtra?: React.ReactNode;
  extraViewData?: Record<string, unknown>;
  isExtraViewDataDirty?: (savedData: Record<string, unknown> | undefined) => boolean;
  toolbarContent?: ReactNode;
}

export function DataTableHeader<TData>({
  table,
  showColumnVisibility = true,
  showFilter = true,
  columnFilters = {},
  defaultColumnVisibility,
  defaultSorting = EMPTY_SORTING,
  viewType,
  views,
  hasActiveFilters,
  tableState,
  setTableState,
  allowSidebarViews = false,
  showExport = false,
  exportPrefix,
  exportDisabled = false,
  toolbarExtra,
  extraViewData,
  isExtraViewDataDirty,
}: DataTableHeaderProps<TData>) {
  const projectId = useProjectId();
  const router = useRouter();
  const t = useTranslations('dataTable');
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const tv = useTranslations('views');
  const queryClient = useQueryClient();

  const { executeAsync: executeCreateView } = useAction(createViewAction);
  const { executeAsync: executeUpdateView } = useAction(updateViewAction);
  const { executeAsync: executeDeleteView } = useAction(deleteViewAction);

  const buildViewDataPayload = () => ({
    sorting: tableState.sorting,
    columnFilters: tableState.columnFilters,
    columnVisibility: tableState.columnVisibility,
    globalFilter: tableState.globalFilter,
    pageSize: tableState.pageSize,
    pagination: {
      pageIndex: 0,
      pageSize: tableState.pageSize,
    },
    ...extraViewData,
  });

  const handleOverwriteView = async () => {
    if (!viewType || !tableState.selectedView) return;
    setIsSaving(true);
    try {
      const result = await executeUpdateView({
        viewId: tableState.selectedView,
        ...(projectId && { projectId }),
        data: {
          data: buildViewDataPayload(),
        },
      });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Saving failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['views', viewType] });
      router.refresh();
    } catch (err) {
      console.error('Error updating view:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveView = async (name: string, isDefault: boolean, saveForProject: boolean, showInSidebar: boolean) => {
    if (!viewType) return;

    setIsSaving(true);
    try {
      const result = await executeCreateView({
        name,
        type: viewType as ViewType,
        isDefault,
        showInSidebar,
        data: buildViewDataPayload(),
        ...(saveForProject && projectId ? { projectId } : {}),
      });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Saving failed');
      }

      const view = result?.data?.view;

      await queryClient.invalidateQueries({ queryKey: ['views', viewType] });
      router.refresh();
      if (view) {
        // Select the new view — since the saved data matches current state,
        // all URL overrides will be cleared by the hook's diff logic.
        setTableState({
          selectedView: view.id,
          pageIndex: 0,
          pageSize: tableState.pageSize,
          viewName: '',
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
    router.refresh();
  };

  const handleViewDelete = async (viewId: string) => {
    if (!viewType) return;

    await executeDeleteView({ viewId });
    queryClient.invalidateQueries({ queryKey: ['views', viewType] });
    router.refresh();
  };

  const viewDirty = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: view data is stored as JSON
    const viewData = (views.find((v) => v.id === tableState.selectedView)?.data as any) ?? {
      selectedView: '',
      columnVisibility: defaultColumnVisibility,
      sorting: defaultSorting,
      columnFilters: [],
      globalFilter: '',
      pagination: { pageIndex: 0, pageSize: 25 },
    };

    return (
      tableState.globalFilter !== (viewData.globalFilter ?? '') ||
      tableState.pageSize !== (viewData.pagination?.pageSize ?? viewData.pageSize ?? 25) ||
      !isEqual(tableState.columnVisibility, viewData.columnVisibility ?? defaultColumnVisibility) ||
      !isEqual(tableState.sorting, viewData.sorting ?? defaultSorting) ||
      !isEqual(tableState.columnFilters, viewData.columnFilters ?? []) ||
      (isExtraViewDataDirty?.(viewData) ?? false)
    );
  }, [views, tableState, defaultColumnVisibility, defaultSorting, isExtraViewDataDirty]);

  return (
    <>
      <div className="flex items-center gap-4 py-4">
        {(showFilter || toolbarExtra) && (
          <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
            {showFilter && (
              <Input
                placeholder={t('globalFilter') || 'Search all columns...'}
                value={tableState.globalFilter}
                onChange={(event) => {
                  setTableState({ globalFilter: event.target.value });
                }}
                className="max-w-60 shrink-0 bg-background dark:bg-background"
              />
            )}
            {toolbarExtra}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center space-x-2">
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
                      sorting: defaultSorting,
                      columnFilters: [],
                      globalFilter: '',
                      pageIndex: 0,
                      pageSize: 25,
                      viewName: '',
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2"
                    disabled={!viewDirty || isSaving}
                    title={tv('saveView.menuTitle')}
                  >
                    <Save className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!tableState.selectedView || !viewDirty || isSaving}
                    onSelect={() => {
                      void handleOverwriteView();
                    }}
                  >
                    {tv('saveView.overwrite')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!viewDirty || isSaving} onSelect={() => setSaveAsOpen(true)}>
                    {tv('saveView.saveAsNew')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SaveViewDialog
                hideTrigger
                open={saveAsOpen}
                onOpenChange={setSaveAsOpen}
                onSave={handleSaveView}
                isLoading={isSaving}
                allowSidebar={allowSidebarViews}
                hasProject={!!projectId}
                defaultName={tableState.viewName}
              />
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
          {showExport && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={exportDisabled}
                onClick={() => setExportOpen(true)}
              >
                <FileDown className="h-4 w-4" />
                {t('export')}
              </Button>
              <DataTableExportDialog
                table={table}
                open={exportOpen}
                onOpenChange={setExportOpen}
                columnFilters={columnFilters}
                exportPrefix={exportPrefix}
              />
            </>
          )}
          {showColumnVisibility && <ColumnVisibilityMenu table={table} columnFilters={columnFilters} />}
        </div>
      </div>
      {showColumnFilters && Object.keys(columnFilters).length > 0 && (
        <DataTableColumnFilters tableState={tableState} setTableState={setTableState} columnFilters={columnFilters} />
      )}
    </>
  );
}

interface ColumnVisibilityMenuProps<TData> {
  table: Table<TData>;
  columnFilters: ColumnFiltersConfig;
}

function ColumnVisibilityMenu<TData>({ table, columnFilters }: ColumnVisibilityMenuProps<TData>) {
  const t = useTranslations('dataTable');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const resolveColumnLabel = (columnId: string, exportLabel?: string) =>
    columnFilters[columnId]?.label ?? exportLabel ?? columnId;

  const groupedHideableColumns = useMemo(() => {
    const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());
    const flatColumns: typeof hideableColumns = [];
    const groupedMap = new Map<string, typeof hideableColumns>();

    for (const column of hideableColumns) {
      const groupKey = column.columnDef.meta?.columnGroup?.key;
      if (!groupKey) {
        flatColumns.push(column);
        continue;
      }
      const existing = groupedMap.get(groupKey) ?? [];
      existing.push(column);
      groupedMap.set(groupKey, existing);
    }

    const groupedColumns = [...groupedMap.entries()]
      .sort(([, columnsA], [, columnsB]) => {
        const orderA = columnsA[0]?.columnDef.meta?.columnGroup?.order ?? 0;
        const orderB = columnsB[0]?.columnDef.meta?.columnGroup?.order ?? 0;
        return orderA - orderB;
      })
      .map(([key, columns]) => ({ key, columns }));

    return { flatColumns, groupedColumns };
  }, [table]);

  const filteredColumns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groupedHideableColumns;

    const matches = (column: (typeof groupedHideableColumns.flatColumns)[number]) => {
      const label =
        columnFilters[column.id]?.label ?? column.columnDef.meta?.export?.label ?? column.id;
      return label.toLowerCase().includes(query);
    };

    return {
      flatColumns: groupedHideableColumns.flatColumns.filter(matches),
      groupedColumns: groupedHideableColumns.groupedColumns
        .map(({ key, columns }) => ({ key, columns: columns.filter(matches) }))
        .filter(({ columns }) => columns.length > 0),
    };
  }, [groupedHideableColumns, searchQuery, columnFilters]);

  const hasResults = filteredColumns.flatColumns.length > 0 || filteredColumns.groupedColumns.length > 0;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchQuery('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8">
          {t('columns')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-0">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={tCommon('ui.actions.search')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto p-1">
          {!hasResults ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{tCommon('ui.actions.noResults')}</div>
          ) : (
            <>
              {filteredColumns.flatColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {resolveColumnLabel(column.id, column.columnDef.meta?.export?.label)}
                </DropdownMenuCheckboxItem>
              ))}
              {filteredColumns.flatColumns.length > 0 && filteredColumns.groupedColumns.length > 0 && (
                <DropdownMenuSeparator />
              )}
              {filteredColumns.groupedColumns.map(({ key, columns }, groupIndex) => (
                <div key={key}>
                  <DropdownMenuLabel>{t(`columnGroups.${key}`)}</DropdownMenuLabel>
                  {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {resolveColumnLabel(column.id, column.columnDef.meta?.export?.label)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {groupIndex < filteredColumns.groupedColumns.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
