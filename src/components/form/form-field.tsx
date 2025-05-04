import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
}

export function FormField({
  name,
  label,
  placeholder,
  type = "text",
  multiline = false,
  required = false,
}: FormFieldProps) {
  const form = useFormContext();
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea
                placeholder={placeholder}
                {...field}
                required={required}
              />
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                {...field}
                required={required}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
