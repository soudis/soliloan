'use client'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { lenderFormSchema, type LenderFormData } from '@/lib/schemas/lender'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { LenderFormFields } from './LenderFormFields'

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
  const defaultValues = {
    type: initialType,
    salutation: initialData?.salutation || 'PERSONAL',
    notificationType: initialData?.notificationType || 'ONLINE',
    membershipStatus: initialData?.membershipStatus || 'UNKNOWN',
    projectId: selectedProject.id,
    ...(initialType === 'PERSON'
      ? {
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
      }
      : {
        organisationName: initialData?.organisationName || '',
      }),
    ...initialData,
  }

  const form = useForm<LenderFormData>({
    resolver: zodResolver(lenderFormSchema),
    defaultValues: defaultValues as any,
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data as LenderFormData)
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
          <LenderFormFields form={form} />

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