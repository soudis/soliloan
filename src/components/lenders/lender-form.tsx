'use client'

import { Form } from '@/components/ui/form'
import { FormActions } from '@/components/ui/form-actions'
import { FormLayout } from '@/components/ui/form-layout'
import { validateAddressOptional, validateAddressRequired, validateFieldRequired } from '@/lib/schemas/common'
import { lenderFormSchema, type LenderFormData } from '@/lib/schemas/lender'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { LenderRequiredField } from '@prisma/client'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { LenderFormFields } from './lender-form-fields'

interface LenderFormProps {
  title: string
  submitButtonText: string
  submittingButtonText: string
  cancelButtonText: string
  onSubmit: (data: LenderFormData) => Promise<void>
  initialData?: Partial<LenderFormData>
  lenderId?: string
  isLoading?: boolean
  error?: string | null
}

export function LenderForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  lenderId,
  isLoading,
  error,
}: LenderFormProps) {
  const t = useTranslations('dashboard.lenders')
  const { selectedProject } = useProject()

  if (!selectedProject) {
    return null
  }

  const initialType = initialData?.type || 'PERSON'
  const defaultValues: LenderFormData = {
    type: initialType,
    salutation: initialData?.salutation || selectedProject.configuration?.lenderSalutation || '',
    notificationType: initialData?.notificationType || selectedProject.configuration?.lenderNotificationType || '',
    membershipStatus: initialData?.membershipStatus || selectedProject.configuration?.lenderMembershipStatus || '',
    projectId: selectedProject.id,
    // Contact Information
    email: initialData?.email || '',
    telNo: initialData?.telNo || '',
    // Address Information
    street: initialData?.street || '',
    addon: initialData?.addon || '',
    zip: initialData?.zip || '',
    place: initialData?.place || '',
    country: initialData?.country || selectedProject.configuration?.lenderCountry || '',
    // Banking Information
    iban: initialData?.iban || '',
    bic: initialData?.bic || '',
    // Additional Information
    tag: initialData?.tag || '',
    // Person-specific fields
    ...(initialType === 'PERSON'
      ? {
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        titlePrefix: initialData?.titlePrefix || '',
        titleSuffix: initialData?.titleSuffix || '',
        organisationName: '',
      }
      : {
        organisationName: initialData?.organisationName || '',
        firstName: '',
        lastName: '',
        titlePrefix: '',
        titleSuffix: '',
      }),
    // Include any other fields from initialData that might not be explicitly handled
  }

  let schema: any = lenderFormSchema

  if (selectedProject.configuration?.lenderRequiredFields.includes(LenderRequiredField.address)) {
    schema = schema.superRefine(validateAddressRequired)
  } else {
    schema = schema.superRefine(validateAddressOptional)
  }
  if (selectedProject.configuration?.lenderRequiredFields.includes(LenderRequiredField.email)) {
    schema = schema.superRefine(validateFieldRequired('email'))
  }
  if (selectedProject.configuration?.lenderRequiredFields.includes(LenderRequiredField.telNo)) {
    schema = schema.superRefine(validateFieldRequired('telNo'))
  }

  const form = useForm<LenderFormData>({
    resolver: zodResolver(schema),
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
          <LenderFormFields form={form} />

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