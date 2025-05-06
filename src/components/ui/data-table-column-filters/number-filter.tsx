import { ColumnFilter } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";

interface NumberFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
}

export function NumberFilter({
  filterState,
  onFilterChange,
}: NumberFilterProps) {
  const t = useTranslations("dataTable");

  return (
    <div className="flex w-full items-center space-x-2">
      <Input
        type="number"
        placeholder="Min"
        value={(filterState?.value as [number, number])?.[0] ?? ""}
        onChange={(e) => {
          const value = e.target.value ? Number(e.target.value) : null;
          const current = filterState?.value as [number, number] | undefined;
          onFilterChange([value, current?.[1] ?? null]);
        }}
        className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-sm whitespace-nowrap">{t("to")}</span>
      <Input
        type="number"
        placeholder="Max"
        value={(filterState?.value as [number, number])?.[1] ?? ""}
        onChange={(e) => {
          const value = e.target.value ? Number(e.target.value) : null;
          const current = filterState?.value as [number, number] | undefined;
          onFilterChange([current?.[0] ?? null, value]);
        }}
        className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}
