import { ColumnFilter } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";

interface TextFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: string) => void;
  label?: string;
  columnId: string;
}

export function TextFilter({
  filterState,
  label,
  columnId,
  onFilterChange,
}: TextFilterProps) {
  return (
    <Input
      placeholder={`Filter ${label || columnId}...`}
      value={(filterState?.value as string) ?? ""}
      onChange={(event) => onFilterChange(event.target.value)}
      className="h-8 w-full"
    />
  );
}
