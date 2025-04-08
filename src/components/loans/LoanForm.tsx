'use client'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { loanFormSchema, type LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { LoanFormFields } from './LoanFormFields'

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
  const t = useTranslations('loans')
  const { selectedProject } = useProject()

  if (!selectedProject) {
    return null
  }

  const initialTerminationType = initialData?.terminationType || 'ENDDATE'

  // Create base default values that apply to all termination types
  const baseDefaultValues = {
    terminationType: initialTerminationType,
    interestPaymentType: initialData?.interestPaymentType || 'YEARLY',
    interestPayoutType: initialData?.interestPayoutType || 'MONEY',
    contractStatus: initialData?.contractStatus ?? 'PENDING',
    lenderId: initialData?.lenderId || undefined,
    signDate: initialData?.signDate || undefined,
    amount: initialData?.amount || undefined,
    interestRate: initialData?.interestRate || undefined,
    altInterestMethod: initialData?.altInterestMethod || undefined,
    // Initialize all optional fields to null to prevent uncontrolled to controlled warnings
    endDate: initialData?.endDate || undefined,
    terminationDate: initialData?.terminationDate || undefined,
    terminationPeriod: initialData?.terminationPeriod || undefined,
    terminationPeriodType: initialData?.terminationPeriodType || undefined,
    duration: initialData?.duration || undefined,
    durationType: initialData?.durationType || undefined,
  }

  // Add termination type specific defaults
  const defaultValues = {
    ...baseDefaultValues,
    ...initialData,
  }

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: defaultValues as any,
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data as LoanFormData)
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