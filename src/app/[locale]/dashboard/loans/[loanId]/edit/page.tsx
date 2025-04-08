'use client'

import { LoanForm } from '@/components/loans/LoanForm'
import { useRouter } from '@/i18n/navigation'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function EditLoanPage({ params }: { params: Promise<{ loanId: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('loans')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<LoanFormData> | null>(null)

  // Fetch loan data
  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const response = await fetch(`/api/loans/${resolvedParams.loanId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch loan')
        }
        const data = await response.json()
        setInitialData(data)
      } catch (error) {
        console.error('Error fetching loan:', error)
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        toast.error(t('edit.form.error'))
      } finally {
        setIsLoading(false)
      }
    }

    if (resolvedParams.loanId) {
      fetchLoan()
    }
  }, [resolvedParams.loanId, t])

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
      initialData={initialData || undefined}
      loanId={resolvedParams.loanId}
      isLoading={isLoading}
      error={error}
    />
  )
} 