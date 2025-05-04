import { ViewType } from "@prisma/client";
import { Table } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { SaveViewDialog } from "./save-view-dialog";
import { ViewManager } from "./view-manager";
interface DataTableHeaderProps<TData> {
  table: Table<TData>;
  filterColumn?: string;
  filterPlaceholder?: string;
  showColumnVisibility?: boolean;
  showFilter?: boolean;
  columnFilters?: {
    [key: string]: {
      type: "text" | "select" | "number" | "date";
      options?: { label: string; value: string }[];
      label?: string;
    };
  };
  viewType?: ViewType;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  showColumnFilters: boolean;
  setShowColumnFilters: (value: boolean) => void;
  hasActiveFilters: () => boolean;
  isSaving: boolean;
  handleSaveView: (name: string, isDefault: boolean) => Promise<void>;
  viewRefreshTrigger: number;
  onViewLoad?: () => void;
}

export function DataTableHeader<TData>({
  table,
  filterColumn,
  filterPlaceholder,
  showColumnVisibility = true,
  showFilter = true,
  columnFilters = {},
  viewType,
  globalFilter,
  setGlobalFilter,
  showColumnFilters,
  setShowColumnFilters,
  hasActiveFilters,
  isSaving,
  handleSaveView,
  viewRefreshTrigger,
  onViewLoad,
}: DataTableHeaderProps<TData>) {
  const t = useTranslations("dataTable");

  return (
    <div className="flex items-center py-4">
      {showFilter && (
        <div className="flex items-center gap-4">
          {filterColumn && (
            <Input
              placeholder={filterPlaceholder}
              value={
                (table.getColumn(filterColumn)?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn(filterColumn)
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          <Input
            placeholder={t("globalFilter") || "Search all columns..."}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="ml-auto flex items-center space-x-2">
        {viewType && (
          <>
            <ViewManager
              viewType={viewType}
              onLoad={onViewLoad}
              onViewSelect={(view) => {
                if (view === null) {
                  // Reset to default state
                  table.resetColumnVisibility();
                  table.resetSorting();
                  table.resetColumnFilters();
                  setGlobalFilter("");
                  table.setPageSize(10);
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

                if (columnVisibility)
                  table.setColumnVisibility(columnVisibility);
                if (sorting) table.setSorting(sorting);
                if (columnFilters) table.setColumnFilters(columnFilters);
                if (globalFilter !== undefined) setGlobalFilter(globalFilter);
                if (pageSize) table.setPageSize(pageSize);
              }}
              onViewDelete={async (viewId) => {
                try {
                  const response = await fetch(`/api/views/${viewId}`, {
                    method: "DELETE",
                  });

                  if (!response.ok) {
                    throw new Error("Failed to delete view");
                  }
                } catch (error) {
                  console.error("Error deleting view:", error);
                }
              }}
              refreshTrigger={viewRefreshTrigger}
            />
            <SaveViewDialog onSave={handleSaveView} isLoading={isSaving} />
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
  );
}
