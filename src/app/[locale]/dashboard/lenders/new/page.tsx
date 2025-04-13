'use client'

import { createLender } from '@/app/actions/lenders'
import { LenderForm } from '@/components/lenders/lender-form'
import { useRouter } from '@/i18n/navigation'
import type { LenderFormData } from '@/lib/schemas/lender'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewLenderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')
  const commonT = useTranslations('common')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  const handleSubmit = async (data: LenderFormData) => {
    try {
      setIsSubmitting(true)

      // Create the lender using the server action
      const result = await createLender(data)

      if (result.error) {
        throw new Error(result.error)
      }

      // Show success message
      toast.success(t('new.form.success'))

      // Redirect to the lenders list page for this project
      router.push(`/dashboard/lenders/${selectedProject.id}`)
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error(t('new.form.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <LenderForm
      title={t('new.title')}
      submitButtonText={commonT('ui.actions.create')}
      submittingButtonText={commonT('ui.actions.creating')}
      cancelButtonText={commonT('ui.actions.cancel')}
      onSubmit={handleSubmit}
      error={error}
      isLoading={isSubmitting}
    />
  )
} 