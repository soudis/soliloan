import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/multi-select'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface SelectOption {
  value: string
  label: string
}

interface FormMultiSelectProps {
  form: UseFormReturn<any>
  name: string
  label: string
  placeholder: string
  options: SelectOption[]
  required?: boolean
  hint?: string
  maxCount?: number
}

export function FormMultiSelect({
  form,
  name,
  label,
  placeholder,
  options,
  required = false,
  maxCount,
  hint,
}: FormMultiSelectProps) {
  const t = useTranslations('common')

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => {
        console.log(field.value)
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <MultiSelect
                options={options}
                onValueChange={field.onChange}

                defaultValue={field.value || []}
                placeholder={placeholder}
                maxCount={maxCount}
              />
            </FormControl>
            {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
} 