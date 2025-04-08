'use client'

import { getLoanById } from '@/app/actions/loans'
import { LoanForm } from '@/components/loans/loan-form'
import { useRouter } from '@/i18n/navigation'
import { interestMethodEnum } from '@/lib/schemas/common'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { use, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export default function EditLoanPage({ params }: { params: Promise<{ loanId: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.loans')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch loan data using React Query
  const { data: loan, isLoading, error: fetchError } = useQuery({
    queryKey: ['loan', resolvedParams.loanId],
    queryFn: async () => {
      const result = await getLoanById(resolvedParams.loanId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.loan
    },
    enabled: !!resolvedParams.loanId
  })

  // Transform loan data to match LoanFormData type based on terminationType
  const transformedLoan: LoanFormData | undefined = loan ? (() => {
    const baseData = {
      lenderId: loan.lender.id,
      signDate: new Date(loan.signDate),
      amount: loan.amount,
      interestRate: loan.interestRate,
      interestPaymentType: loan.interestPaymentType,
      interestPayoutType: loan.interestPayoutType,
      altInterestMethod: loan.altInterestMethod ? (loan.altInterestMethod as z.infer<typeof interestMethodEnum>) : null,
      contractStatus: loan.contractStatus
    }

    switch (loan.terminationType) {
      case 'ENDDATE':
        return {
          ...baseData,
          terminationType: 'ENDDATE',
          endDate: new Date(loan.endDate!),
          terminationDate: loan.terminationDate ? new Date(loan.terminationDate) : null,
          terminationPeriod: loan.terminationPeriod ?? null,
          terminationPeriodType: loan.terminationPeriodType ?? null,
          duration: loan.duration ?? null,
          durationType: loan.durationType ?? null,
        }
      case 'TERMINATION':
        return {
          ...baseData,
          terminationType: 'TERMINATION',
          endDate: loan.endDate ? new Date(loan.endDate) : null,
          terminationDate: loan.terminationDate ? new Date(loan.terminationDate) : null,
          terminationPeriod: loan.terminationPeriod ?? 1,
          terminationPeriodType: loan.terminationPeriodType ?? 'MONTHS',
          duration: loan.duration ?? null,
          durationType: loan.durationType ?? null,
        }
      case 'DURATION':
        return {
          ...baseData,
          terminationType: 'DURATION',
          endDate: loan.endDate ? new Date(loan.endDate) : null,
          terminationDate: loan.terminationDate ? new Date(loan.terminationDate) : null,
          terminationPeriod: loan.terminationPeriod ?? null,
          terminationPeriodType: loan.terminationPeriodType ?? null,
          duration: loan.duration ?? 1,
          durationType: loan.durationType ?? 'MONTHS',
        }
      default:
        throw new Error(`Invalid termination type: ${loan.terminationType}`)
    }
  })() : undefined

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Send the data to the API
      const response = await fetch(`/api/loans/${resolvedParams.loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update loan')
      }

      // Show success message
      toast.success(t('edit.form.success'))

      // Navigate back to the previous page using the router
      router.back()
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error(t('edit.form.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <LoanForm
      title={t('edit.title')}
      submitButtonText={t('edit.form.submit')}
      submittingButtonText={t('edit.form.submitting')}
      cancelButtonText={t('edit.form.cancel')}
      onSubmit={handleSubmit}
      initialData={transformedLoan}
      loanId={resolvedParams.loanId}
      isLoading={isLoading}
      error={error}
    />
  )
} 