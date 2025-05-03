'use client'

import { Form } from '@/components/ui/form'
import { FormActions } from '@/components/ui/form-actions'
import { FormLayout } from '@/components/ui/form-layout'
import { configurationFormSchema, type ConfigurationFormData } from '@/lib/schemas/configuration'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
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
  hasHistoricTransactions?: boolean
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
  hasHistoricTransactions,
}: ConfigurationFormProps) {
  const t = useTranslations('dashboard.configuration')
  const { selectedProject } = useProject()
  const router = useRouter()

  if (!selectedProject) {
    return null
  }

  const defaultValues: ConfigurationFormData = {
    name: initialData?.name || '',
    logo: initialData?.logo || '',
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
    lenderRequiredFields: initialData?.lenderRequiredFields || [],
    lenderSalutation: initialData?.lenderSalutation || undefined,
    lenderCountry: initialData?.lenderCountry || undefined,
    lenderNotificationType: initialData?.lenderNotificationType || undefined,
    lenderMembershipStatus: initialData?.lenderMembershipStatus || undefined,
    lenderTags: initialData?.lenderTags || [],
    interestMethod: initialData?.interestMethod || "",
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
    <FormLayout title={title} error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <ConfigurationFormFields form={form} hasHistoricTransactions={hasHistoricTransactions} />

          <FormActions
            submitButtonText={submitButtonText}
            submittingButtonText={submittingButtonText}
            cancelButtonText={cancelButtonText}
            isLoading={isLoading}

          />
        </form>
      </Form>
    </FormLayout>
  )
} 