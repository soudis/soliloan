'use client'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UseFormReturn } from 'react-hook-form'

interface FormNumberInputProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

export function FormNumberInput({
  form,
  name,
  label,
  placeholder,
  min,
  max,
  step = 1,
}: FormNumberInputProps) {
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
              value={field.value === undefined || field.value === null ? '' : field.value}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value)
                field.onChange(value)
              }}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 