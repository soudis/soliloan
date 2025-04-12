'use client'

import { getConfiguration, updateConfiguration } from '@/app/actions/configuration'
import { ConfigurationForm } from '@/components/configuration/configuration-form'
import { useRouter } from '@/i18n/navigation'
import type { ConfigurationFormData } from '@/lib/schemas/configuration'
import { useProject } from '@/store/project-context'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ConfigurationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject, setSelectedProject } = useProject()
  const t = useTranslations('dashboard.configuration')
  const [error, setError] = useState<string | null>(null)

  // Fetch configuration data using React Query
  const { data: configurationData, isLoading } = useQuery({
    queryKey: ['configuration', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return null
      console.log('Fetching configuration for project:', selectedProject.id)
      const result = await getConfiguration(selectedProject.id)
      console.log('Configuration result:', result)
      if ('error' in result) {
        throw new Error(result.error)
      }
      return result.configuration
    },
    enabled: !!selectedProject?.id,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
  })

  console.log('Current configuration data:', configurationData)

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  if (!configurationData) {
    return null
  }

  const handleSubmit = async (data: ConfigurationFormData) => {
    try {
      setError(null)
      console.log('Submitting configuration data:', data)

      // Update the configuration using the server action
      const result = await updateConfiguration(selectedProject.id, data)
      console.log('Update result:', result)

      if ('error' in result) {
        throw new Error(result.error)
      }

      // Update the project store with the new configuration
      setSelectedProject({
        ...selectedProject,
        configuration: {
          ...result.configuration,
          // Keep undefined values as undefined for the project store
          email: result.configuration.email,
          telNo: result.configuration.telNo,
          website: result.configuration.website,
          street: result.configuration.street,
          addon: result.configuration.addon,
          zip: result.configuration.zip,
          place: result.configuration.place,
          country: result.configuration.country,
          iban: result.configuration.iban,
          bic: result.configuration.bic,
          userLanguage: result.configuration.userLanguage,
          userTheme: result.configuration.userTheme,
          lenderSalutation: result.configuration.lenderSalutation,
          lenderCountry: result.configuration.lenderCountry,
          lenderNotificationType: result.configuration.lenderNotificationType,
          lenderMembershipStatus: result.configuration.lenderMembershipStatus,
          lenderTags: result.configuration.lenderTags || [],
          interestMethod: result.configuration.interestMethod,
          altInterestMethods: result.configuration.altInterestMethods || [],
          customLoans: result.configuration.customLoans || false,
        }
      })

      // Show success message
      toast.success(t('form.success'))

    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error(t('form.error'))
    }
  }

  return (
    <ConfigurationForm
      title={t('title')}
      submitButtonText={t('form.submit')}
      submittingButtonText={t('form.submitting')}
      cancelButtonText={t('form.cancel')}
      onSubmit={handleSubmit}
      initialData={configurationData || undefined}
      isLoading={isLoading}
      error={error}
    />
  )
} 