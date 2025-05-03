import { Button } from '@/components/ui/button'
import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  hint?: string
  required?: boolean
  disabled?: boolean
  position?: 'popper' | 'item-aligned'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  customContent?: () => ReactNode
  clearable?: boolean
}

export function FormSelect({
  form,
  name,
  label,
  placeholder,
  options,
  required = false,
  disabled = false,
  hint,
  position = 'popper',
  side = 'bottom',
  align = 'start',
  customContent,
  clearable = false,
}: FormSelectProps) {
  const t = useTranslations('common')
  const { setValue } = form
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <Select

              disabled={disabled}
              onValueChange={(value) => field.onChange(value === 'clear' ? '' : value)}
              value={field.value || undefined}
            >
              <FormControl>
                <SelectTrigger className={field.value ? "" : "text-muted-foreground/60"}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent position={position} side={side} align={align} className="max-h-[300px]">
                {clearable && (
                  <SelectItem value="clear">
                    <span className="text-muted-foreground/60">{placeholder ?? t('clear')}</span>
                  </SelectItem>
                )}
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
            {clearable && field.value && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={(e) => {
                  e.preventDefault()
                  field.onChange('clear')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <FormMessage />
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
        </FormItem>
      )}
    />
  )
} 