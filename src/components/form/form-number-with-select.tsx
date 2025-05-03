import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomSelectTrigger, Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { UseFormReturn } from 'react-hook-form'



interface FormNumberWithSelectProps {
  form: UseFormReturn<any>
  numberName: string
  selectName: string
  numberLabel: string
  selectLabel?: string
  numberPlaceholder?: string
  selectPlaceholder?: string
  numberMin?: number
  numberStep?: number
  selectOptions: Array<{ value: string; label: string }>
  className?: string
}

export function FormNumberWithSelect({
  form,
  numberName,
  selectName,
  numberLabel,
  selectLabel,
  numberPlaceholder,
  selectPlaceholder,
  numberMin,
  numberStep,
  selectOptions,
  className,
}: FormNumberWithSelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label>{numberLabel}</Label>
        <Label className="text-muted-foreground">{selectLabel}</Label>
      </div>
      <div className="flex">
        <FormField
          control={form.control}
          name={numberName}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  type="number"
                  placeholder={numberPlaceholder}
                  min={numberMin}
                  step={numberStep}
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  className="rounded-r-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-r-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={selectName}
          render={({ field }) => (
            <FormItem className="w-[120px]">
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <CustomSelectTrigger className="rounded-l-none h-10">
                    <SelectValue placeholder={selectPlaceholder} />
                  </CustomSelectTrigger>
                  <SelectContent>
                    {selectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
} 