'use client'

import { getLenderById } from '@/app/actions/lenders'
import { createLoan } from '@/app/actions/loans'
import { LoanForm } from '@/components/loans/loan-form'
import { useRouter } from '@/i18n/navigation'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewLoanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const [error, setError] = useState<string | null>(null)

  // Get the lenderId from the URL search params
  const lenderId = searchParams.get('lenderId')

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      // Get the lender details first
      const lenderResult = await getLenderById(data.lenderId)
      if (lenderResult.error) {
        throw new Error(lenderResult.error)
      }

      if (!lenderResult.lender) {
        throw new Error('Lender not found')
      }

      // Create the loan using the server action
      const result = await createLoan(data)

      if (result.error) {
        throw new Error(result.error)
      }

      // Show success message
      toast.success(t('new.form.success'))

      // Redirect to the loans list page for this project
      router.push(`/dashboard/loans/${selectedProject.id}`)
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error(t('new.form.error'))
    }
  }

  // Set up initial data with required fields based on the default termination type
  const initialData = lenderId ? {
    lenderId,
    terminationType: 'ENDDATE' as const,
    signDate: new Date(),
    amount: 0,
    interestRate: 0,
    interestPaymentType: 'YEARLY' as const,
    interestPayoutType: 'MONEY' as const,
    contractStatus: 'PENDING' as const,
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default to 1 year from now
  } : undefined

  return (
    <LoanForm
      title={t('new.title')}
      submitButtonText={commonT('ui.actions.create')}
      submittingButtonText={commonT('ui.actions.creating')}
      cancelButtonText={commonT('ui.actions.cancel')}
      onSubmit={handleSubmit}
      error={error}
      initialData={initialData}
    />
  )
} 