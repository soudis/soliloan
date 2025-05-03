'use client'

import { getLoanById, updateLoan } from '@/app/actions/loans'
import { LoanForm } from '@/components/loans/loan-form'
import { useRouter } from '@/i18n/navigation'
import { interestMethodEnum } from '@/lib/schemas/common'
import type { LoanFormData } from '@/lib/schemas/loan'
import { getLenderName } from '@/lib/utils'
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
  const transformedLoan: Partial<LoanFormData> | undefined = loan ? (() => {
    const baseData = {
      lenderId: loan.lender.id,
      signDate: loan.signDate ?? "",
      amount: loan.amount,
      interestRate: loan.interestRate,
      interestPaymentType: loan.interestPaymentType,
      interestPayoutType: loan.interestPayoutType,
      altInterestMethod: loan.altInterestMethod ? (loan.altInterestMethod as z.infer<typeof interestMethodEnum>) : null,
      contractStatus: loan.contractStatus
    }

    switch (loan.terminationType) {
      case 'ENDDATE':
        if (!loan.endDate) {
          throw new Error('End date is required for ENDDATE termination type')
        }
        return {
          ...baseData,
          terminationType: 'ENDDATE',
          endDate: loan.endDate ?? "",
          terminationDate: loan.terminationDate ?? "",
          terminationPeriod: loan.terminationPeriod ?? "",
          terminationPeriodType: loan.terminationPeriodType ?? null,
          duration: loan.duration ?? "",
          durationType: loan.durationType ?? null,
        }
      case 'TERMINATION':
        return {
          ...baseData,
          terminationType: 'TERMINATION',
          endDate: loan.endDate ?? "",
          terminationDate: loan.terminationDate ?? "",
          terminationPeriod: loan.terminationPeriod ?? "",
          terminationPeriodType: loan.terminationPeriodType ?? 'MONTHS',
          duration: loan.duration ?? "",
          durationType: loan.durationType ?? null,
        }
      case 'DURATION':
        return {
          ...baseData,
          terminationType: 'DURATION',
          endDate: loan.endDate || "",
          terminationDate: loan.terminationDate || "",
          terminationPeriod: loan.terminationPeriod ?? "",
          terminationPeriodType: loan.terminationPeriodType ?? null,
          duration: loan.duration ?? "",
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

  if (isLoading || !loan) {
    return null
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Update the loan using the server action
      const result = await updateLoan(resolvedParams.loanId, data)

      if (result.error) {
        throw new Error(result.error)
      }

      // Show success message
      toast.success(t('edit.form.success'))

      // Navigate back to the previous page using the router
      router.push(`/dashboard/lenders/${result.loan?.lenderId}?highlightLoan=${result.loan?.id}`)
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
      title={t('edit.title', { lenderName: getLenderName(loan.lender) })}
      submitButtonText={t('edit.form.submit')}
      submittingButtonText={t('edit.form.submitting')}
      cancelButtonText={t('edit.form.cancel')}
      onSubmit={handleSubmit}
      initialData={transformedLoan}
      loanId={resolvedParams.loanId}
      isLoading={isSubmitting}
      error={error}
    />
  )
} 