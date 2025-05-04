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
interface FormNumberInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function FormNumberInput({
  name,
  label,
  placeholder,
  min,
  max,
  step = 1,
}: FormNumberInputProps) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              {...field}
              value={field.value}
              onChange={(e) => {
                const value =
                  e.target.value === "" ? "" : parseFloat(e.target.value);
                field.onChange(value);
              }}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
