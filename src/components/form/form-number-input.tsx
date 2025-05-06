"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberParser } from "@/lib/utils";
interface FormNumberInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  prefix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function FormNumberInput({
  name,
  label,
  placeholder,
  min,
  max,
  step = 1,
  disabled,
  prefix,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: FormNumberInputProps) {
  const form = useFormContext();

  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits,
    minimumFractionDigits,
  });

  const parser = new NumberParser("de-DE");

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="relative">
              {prefix && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center ">
                  <span className="text-gray-500 sm:text-sm border-r border-gray-300 py-1.5 min-w-10 text-center">
                    {prefix}
                  </span>
                </div>
              )}
              <Input
                type="text"
                placeholder={placeholder}
                min={min}
                max={max}
                disabled={disabled}
                step={step}
                {...field}
                value={field.value}
                onBlur={(event) => {
                  const value = event.target.value;
                  const number = parser.parse(value) ?? 0;
                  field.onChange(formatter.format(number));
                }}
                onChange={(event) => {
                  const value = parser.strip(event.target.value);
                  field.onChange(value);
                }}
                className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  prefix ? "pl-12 " : ""
                }`}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
