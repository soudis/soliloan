"use client";

import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface FormDatePickerProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
}

export function FormDatePicker({
  name,
  label,
  placeholder = "Pick a date",
  disabled,
}: FormDatePickerProps) {
  const locale = useLocale();
  const dateLocale = locale === "de" ? de : enUS;
  const form = useFormContext();
  const [open, setOpen] = useState(false);

  // Function to convert a date to UTC
  const toUTC = (date: Date | undefined) => {
    if (!date) return null;
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    );
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          {label && <FormLabel>{label}</FormLabel>}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value && field.value !== "" ? (
                    format(field.value, "PPP", { locale: dateLocale })
                  ) : (
                    <span>{placeholder}</span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {field.value && field.value !== "" && (
                      <div
                        role="button"
                        className="flex h-4 w-4 items-center justify-center rounded-sm opacity-50 hover:bg-accent hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          field.onChange("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </div>
                    )}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={(date) => {
                  field.onChange(toUTC(date));
                  setOpen(false);
                }}
                autoFocus
                disabled={disabled}
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
