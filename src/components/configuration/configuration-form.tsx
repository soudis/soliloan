'use client'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { configurationFormSchema, type ConfigurationFormData } from '@/lib/schemas/configuration'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { ConfigurationFormFields } from './configuration-form-fields'

interface ConfigurationFormProps {
  title: string
  submitButtonText: string
  submittingButtonText: string
  cancelButtonText: string
  onSubmit: (data: ConfigurationFormData) => Promise<void>
  initialData?: Partial<ConfigurationFormData>
  isLoading?: boolean
  error?: string | null
}

export function ConfigurationForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  isLoading,
  error,
}: ConfigurationFormProps) {
  const t = useTranslations('dashboard.configuration')
  const { selectedProject } = useProject()

  if (!selectedProject) {
    return null
  }

  const defaultValues = {
    name: initialData?.name || '',
    logo: initialData?.logo || undefined,
    email: initialData?.email || undefined,
    telNo: initialData?.telNo || undefined,
    website: initialData?.website || undefined,
    street: initialData?.street || undefined,
    addon: initialData?.addon || undefined,
    zip: initialData?.zip || undefined,
    place: initialData?.place || undefined,
    country: initialData?.country || undefined,
    iban: initialData?.iban || undefined,
    bic: initialData?.bic || undefined,
    userLanguage: initialData?.userLanguage || undefined,
    userTheme: initialData?.userTheme || undefined,
    lenderSalutation: initialData?.lenderSalutation || undefined,
    lenderCountry: initialData?.lenderCountry || undefined,
    lenderNotificationType: initialData?.lenderNotificationType || undefined,
    lenderMembershipStatus: initialData?.lenderMembershipStatus || undefined,
    lenderTags: initialData?.lenderTags || [],
    interestMethod: initialData?.interestMethod || undefined,
    altInterestMethods: initialData?.altInterestMethods || [],
    customLoans: initialData?.customLoans || false,
  }

  const form = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationFormSchema),
    defaultValues,
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  })

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <ConfigurationFormFields form={form} />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={isLoading}
            >
              {cancelButtonText}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? submittingButtonText : submitButtonText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 