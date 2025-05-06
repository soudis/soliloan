import { View, ViewType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Table, VisibilityState } from "@tanstack/react-table";
import { isEqual } from "lodash";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { createView } from "@/app/actions";
import { deleteView } from "@/app/actions/views";
import { updateView } from "@/app/actions/views/mutations/update-view";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTableStore, ViewState } from "@/store/table-store";

import { DataTableColumnFilters } from "./data-table-column-filters";
import { SaveViewDialog } from "./save-view-dialog";
import { ViewManager } from "./view-manager";

interface DataTableHeaderProps<TData> {
  table: Table<TData>;
  showColumnVisibility?: boolean;
  showFilter?: boolean;
  columnFilters?: {
    [key: string]: {
      type: "text" | "select" | "number" | "date";
      options?: { label: string; value: string }[];
      label?: string;
    };
  };
  viewType: ViewType;
  views: View[];
  hasActiveFilters: () => boolean;
  defaultColumnVisibility: VisibilityState;
  state: ViewState;
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
  state,
}: DataTableHeaderProps<TData>) {
  const t = useTranslations("dataTable");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { setState } = useTableStore();
  const queryClient = useQueryClient();

  // Function to save the current view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    if (!viewType) return;

    setIsSaving(true);
    try {
      // Use type assertion to satisfy the TypeScript compiler
      const { error, view } = await createView({
        name,
        type: viewType as ViewType,
        isDefault,
        data: {
          ...state,
          pagination: {
            pageIndex: 0,
            pageSize: state.pagination?.pageSize ?? 25,
          },
        },
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh the view list
      queryClient.invalidateQueries({ queryKey: ["views", viewType] });
      if (view) {
        setState(viewType, {
          selectedView: view.id,
        });
      }
    } catch (err) {
      console.error("Error saving view:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDefault = async (viewId: string, isDefault: boolean) => {
    if (!viewType) return;

    await updateView(viewId, { isDefault });
    queryClient.invalidateQueries({ queryKey: ["views", viewType] });
  };

  const handleViewDelete = async (viewId: string) => {
    if (!viewType) return;

    await deleteView(viewId);
    queryClient.invalidateQueries({ queryKey: ["views", viewType] });
  };

  const viewDirty = useMemo(() => {
    const view = (views.find((view) => view.id === state.selectedView)
      ?.data as Partial<ViewState>) ?? {
      selectedView: "",
      columnVisibility: defaultColumnVisibility,
      sorting: [],
      columnFilters: [],
      globalFilter: "",
      pagination: { pageIndex: 0, pageSize: 25 },
    };

    return (
      state.globalFilter !== view.globalFilter ||
      state.pagination?.pageSize !== view.pagination?.pageSize ||
      !isEqual(state.columnVisibility, view.columnVisibility) ||
      !isEqual(state.sorting, view.sorting) ||
      !isEqual(state.columnFilters, view.columnFilters)
    );
  }, [views, state, defaultColumnVisibility]);

  return (
    <>
      <div className="flex items-center py-4">
        {showFilter && (
          <div className="flex items-center gap-4">
            <Input
              placeholder={t("globalFilter") || "Search all columns..."}
              value={state.globalFilter || ""}
              onChange={(event) =>
                setState(viewType, {
                  globalFilter: event.target.value,
                })
              }
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
                state={state}
                onViewDefault={handleViewDefault}
                onViewSelect={(view) => {
                  if (view === null) {
                    // Reset to default state
                    setState(viewType, {
                      selectedView: "",
                      columnVisibility: defaultColumnVisibility,
                      sorting: [],
                      columnFilters: [],
                      globalFilter: "",
                      pagination: { pageIndex: 0, pageSize: 25 },
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } = view.data as any;
                  setState(viewType, {
                    selectedView: view.id,
                    columnVisibility,
                    sorting,
                    columnFilters,
                    globalFilter,
                    pagination: { pageIndex: 0, pageSize: pageSize ?? 25 },
                  });
                }}
                onViewDelete={handleViewDelete}
              />
              <SaveViewDialog
                onSave={handleSaveView}
                isLoading={isSaving}
                disabled={!viewDirty}
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
              {t("filters")}
              {hasActiveFilters() && (
                <span className="ml-2 flex h-2 w-2 rounded-full bg-primary"></span>
              )}
            </Button>
          )}
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8">
                  {t("columns")}
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
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
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
      {showColumnFilters &&
        viewType &&
        Object.keys(columnFilters).length > 0 && (
          <DataTableColumnFilters
            state={state}
            columnFilters={columnFilters}
            viewType={viewType}
          />
        )}
    </>
  );
}
