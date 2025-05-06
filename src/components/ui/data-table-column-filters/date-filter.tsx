import { ColumnFilter } from "@tanstack/react-table";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
}

export function DateFilter({ filterState, onFilterChange }: DateFilterProps) {
  const t = useTranslations("dataTable");
  const locale = useLocale();
  const dateLocale = locale === "de" ? de : enUS;

  return (
    <div className="flex w-full flex-col space-y-2">
      <div className="flex w-full items-center space-x-2">
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !(filterState?.value as [string, string])?.[0] &&
                    "text-muted-foreground"
                )}
              >
                {(filterState?.value as [string, string])?.[0] ? (
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {format(
                        new Date((filterState?.value as [string, string])[0]),
                        "PPP",
                        { locale: dateLocale }
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const current = filterState?.value as
                          | [string, string]
                          | undefined;
                        if (!current?.[1]) {
                          onFilterChange(undefined);
                        } else {
                          onFilterChange([undefined, current[1]]);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span>{t("startDate") || "Start date"}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  (filterState?.value as [string, string])?.[0]
                    ? new Date((filterState?.value as [string, string])[0])
                    : undefined
                }
                onSelect={(date) => {
                  const value = date
                    ? new Date(
                        date.getTime() - date.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .split("T")[0]
                    : undefined;
                  const current = filterState?.value as
                    | [string, string]
                    | undefined;
                  onFilterChange([value, current?.[1]]);
                }}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
        <span className="text-sm whitespace-nowrap">{t("to")}</span>
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !(filterState?.value as [string, string])?.[1] &&
                    "text-muted-foreground"
                )}
              >
                {(filterState?.value as [string, string])?.[1] ? (
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {format(
                        new Date((filterState?.value as [string, string])[1]),
                        "PPP",
                        { locale: dateLocale }
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const current = filterState?.value as
                          | [string, string]
                          | undefined;
                        if (!current?.[0]) {
                          onFilterChange(undefined);
                        } else {
                          onFilterChange([current[0], undefined]);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span>{t("endDate") || "End date"}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  (filterState?.value as [string, string])?.[1]
                    ? new Date((filterState?.value as [string, string])[1])
                    : undefined
                }
                onSelect={(date) => {
                  const value = date
                    ? new Date(
                        date.getTime() - date.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .split("T")[0]
                    : undefined;
                  const current = filterState?.value as
                    | [string, string]
                    | undefined;
                  onFilterChange([current?.[0], value]);
                }}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
