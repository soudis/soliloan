'use client'

import { getLenderById } from '@/app/actions/lenders'
import { createLoan } from '@/app/actions/loans'
import { LoanForm } from '@/components/loans/loan-form'
import { useRouter } from '@/i18n/navigation'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { Prisma } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewLoanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const [error, setError] = useState<string | null>(null)

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
      const result = await createLoan({
        ...data,
        loanNumber: 0, // This will be auto-incremented by the database
        amount: new Prisma.Decimal(data.amount),
        interestRate: new Prisma.Decimal(data.interestRate),
        terminationPeriod: data.terminationPeriod || undefined,
        terminationPeriodType: data.terminationPeriodType || undefined,
        duration: data.duration || undefined,
        durationType: data.durationType || undefined,
        altInterestMethod: data.altInterestMethod || undefined,
        lender: {
          connect: {
            id: data.lenderId
          }
        }
      })

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

  return (
    <LoanForm
      title={t('new.title')}
      submitButtonText={commonT('ui.actions.create')}
      submittingButtonText={commonT('ui.actions.creating')}
      cancelButtonText={commonT('ui.actions.cancel')}
      onSubmit={handleSubmit}
      error={error}
    />
  )
} 