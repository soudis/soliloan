'use client'

import { LenderForm } from '@/components/lenders/LenderForm'
import { useRouter } from '@/i18n/navigation'
import type { LenderFormData } from '@/lib/schemas/lender'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function EditLenderPage({ params }: { params: Promise<{ lenderId: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<LenderFormData> | null>(null)

  // Fetch lender data
  useEffect(() => {
    const fetchLender = async () => {
      try {
        const response = await fetch(`/api/lenders/${resolvedParams.lenderId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch lender')
        }
        const data = await response.json()
        setInitialData(data)
      } catch (error) {
        console.error('Error fetching lender:', error)
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        toast.error(t('edit.form.error'))
      } finally {
        setIsLoading(false)
      }
    }

    if (resolvedParams.lenderId) {
      fetchLender()
    }
  }, [resolvedParams.lenderId, t])

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const handleSubmit = async (data: LenderFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Send the data to the API
      const response = await fetch(`/api/lenders/${resolvedParams.lenderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update lender')
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
    <LenderForm
      title={t('edit.title')}
      submitButtonText={t('edit.form.submit')}
      submittingButtonText={t('edit.form.submitting')}
      cancelButtonText={t('edit.form.cancel')}
      onSubmit={handleSubmit}
      initialData={initialData || undefined}
      lenderId={resolvedParams.lenderId}
      isLoading={isLoading}
      error={error}
    />
  )
} 