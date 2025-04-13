'use client'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { loanFormSchema, type LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { LoanFormFields } from './loan-form-fields'

interface LoanFormProps {
  title: string
  submitButtonText: string
  submittingButtonText: string
  cancelButtonText: string
  onSubmit: (data: LoanFormData) => Promise<void>
  initialData?: LoanFormData
  loanId?: string
  isLoading?: boolean
  error?: string | null
}

export function LoanForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  loanId,
  isLoading,
  error,
}: LoanFormProps) {
  const t = useTranslations('dashboard.loans')
  const { selectedProject } = useProject()

  if (!selectedProject) {
    return null
  }


  // Create base default values that apply to all termination types
  const baseDefaultValues: LoanFormData = {
    lenderId: initialData?.lenderId || '',
    signDate: initialData?.signDate || null,
    amount: initialData?.amount || null,
    interestRate: initialData?.interestRate || null,
    interestPaymentType: initialData?.interestPaymentType || 'YEARLY',
    interestPayoutType: initialData?.interestPayoutType || 'MONEY',
    altInterestMethod: initialData?.altInterestMethod || null,
    contractStatus: initialData?.contractStatus || 'PENDING',
    terminationType: initialData?.terminationType || 'TERMINATION',
    endDate: initialData?.endDate || null,
    terminationDate: initialData?.terminationDate || null,
    terminationPeriod: initialData?.terminationPeriod || null,
    terminationPeriodType: initialData?.terminationPeriodType || null,
    duration: initialData?.duration || null,
    durationType: initialData?.durationType || null,
  }

  // Create termination type specific default values
  let defaultValues: LoanFormData

  // Add any additional initial data
  if (initialData) {
    defaultValues = {
      ...baseDefaultValues,
      ...initialData,
    }
  }

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema) as any,
    defaultValues: { ...baseDefaultValues, ...initialData },
  })

  const handleSubmit = form.handleSubmit(async (formData: LoanFormData) => {
    try {
      await onSubmit(formData)
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
          <LoanFormFields form={form} />

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