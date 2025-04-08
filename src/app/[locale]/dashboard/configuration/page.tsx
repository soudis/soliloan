'use client'

import { ConfigurationForm } from '@/components/configuration/ConfigurationForm'
import { useRouter } from '@/i18n/navigation'
import type { ConfigurationFormData } from '@/lib/schemas/configuration'
import { useProject } from '@/store/project-context'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ConfigurationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.configuration')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<ConfigurationFormData> | null>(null)

  // Fetch configuration data
  useEffect(() => {
    const fetchConfiguration = async () => {
      if (!selectedProject) return

      try {
        const response = await fetch(`/api/projects/${selectedProject.id}/configuration`)
        if (!response.ok) {
          throw new Error('Failed to fetch configuration')
        }
        const data = await response.json()
        setInitialData(data)
      } catch (error) {
        console.error('Error fetching configuration:', error)
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        toast.error(t('form.error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfiguration()
  }, [selectedProject, t])

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const handleSubmit = async (data: ConfigurationFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Send the data to the API
      const response = await fetch(`/api/projects/${selectedProject.id}/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }

      // Show success message
      toast.success(t('form.success'))

      // Navigate back to the previous page using the router
      router.back()
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error(t('form.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ConfigurationForm
      title={t('title')}
      submitButtonText={t('form.submit')}
      submittingButtonText={t('form.submitting')}
      cancelButtonText={t('form.cancel')}
      onSubmit={handleSubmit}
      initialData={initialData || undefined}
      isLoading={isLoading}
      error={error}
    />
  )
} 