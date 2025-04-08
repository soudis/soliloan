'use client'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useLocale } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'
import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

interface FormDatePickerProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  placeholder?: string
}

export function FormDatePicker({
  form,
  name,
  label,
  placeholder = 'Pick a date',
}: FormDatePickerProps) {
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS

  // Function to convert a date to UTC
  const toUTC = (date: Date | undefined) => {
    if (!date) return undefined
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ))
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          {label && <FormLabel>{label}</FormLabel>}
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  {field.value ? (
                    format(field.value, 'PPP', { locale: dateLocale })
                  ) : (
                    <span>{placeholder}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={(date) => field.onChange(toUTC(date))}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 