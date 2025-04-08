'use client'

import { LoanForm } from '@/components/loans/LoanForm'
import { useRouter } from '@/i18n/navigation'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewLoanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.loans')
  const [error, setError] = useState<string | null>(null)

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      // Send the data to the API
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create loan')
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
      submitButtonText={t('new.form.submit')}
      submittingButtonText={t('new.form.submitting')}
      cancelButtonText={t('new.form.cancel')}
      onSubmit={handleSubmit}
      error={error}
    />
  )
} 