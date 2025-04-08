import { FormSelect } from '@/components/form/FormSelect'
import { SelectItem, SelectSeparator } from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface FormCountrySelectProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  placeholder?: string
}

// Primary countries that should appear at the top
const PRIMARY_COUNTRIES = ['DE', 'AT', 'CH'] as const

// All other countries
const OTHER_COUNTRIES = [
  'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI',
  'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU',
  'IE', 'PT', 'GR'
] as const

export function FormCountrySelect({
  form,
  name,
  label = 'Country',
  placeholder = 'Select a country',
}: FormCountrySelectProps) {
  const t = useTranslations('common.countries')

  // Create options for primary countries
  const primaryOptions = PRIMARY_COUNTRIES.map(code => ({
    value: code,
    label: t(code.toLowerCase())
  }))

  // Create options for other countries
  const otherOptions = OTHER_COUNTRIES.map(code => ({
    value: code,
    label: t(code.toLowerCase())
  }))

  // Custom render function for the select content
  const renderSelectContent = () => (
    <>
      {primaryOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
      <SelectSeparator />
      {otherOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </>
  )

  return (
    <FormSelect
      form={form}
      name={name}
      label={label}
      placeholder={placeholder}
      options={[...primaryOptions, ...otherOptions]}
      side="bottom"
      align="start"
      position="popper"
      customContent={renderSelectContent}
    />
  )
} 