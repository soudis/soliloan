import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReactNode } from 'react'
import { UseFormReturn } from 'react-hook-form'

interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  form: UseFormReturn<any>
  name: string
  label: string
  placeholder: string
  options: SelectOption[]
  required?: boolean
  position?: 'popper' | 'item-aligned'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  customContent?: () => ReactNode
}

export function FormSelect({
  form,
  name,
  label,
  placeholder,
  options,
  required = false,
  position = 'popper',
  side = 'bottom',
  align = 'start',
  customContent,
}: FormSelectProps) {
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent position={position} side={side} align={align} className="max-h-[300px]">
              {customContent ? (
                customContent()
              ) : (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 