import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useFormContext } from 'react-hook-form'

interface FormIbanInputProps {
  name: string
  label: string
  placeholder?: string
}

export function FormIbanInput({ name, label, placeholder }: FormIbanInputProps) {
  const form = useFormContext()
  const value = form.watch(name) || ''

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-alphanumeric characters
    const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    // Split into blocks of 4 characters
    const blocks = cleaned.match(/.{1,4}/g) || []

    // Join blocks with spaces
    const formatted = blocks.join(' ')

    // Update form value
    form.setValue(name, formatted, { shouldValidate: true })
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              onChange={handleIbanChange}
              className={cn(
                'font-mono',
                field.value && 'uppercase'
              )}
              maxLength={34} // Maximum IBAN length is 34 characters
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 