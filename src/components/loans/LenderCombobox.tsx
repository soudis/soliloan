'use client'

import { FormCombobox } from '@/components/form/FormCombobox'
import { useProject } from '@/store/project-context'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'

interface Lender {
  id: string
  lenderNumber: number
  type: 'PERSON' | 'ORGANISATION'
  firstName?: string
  lastName?: string
  organisationName?: string
  titlePrefix?: string
  titleSuffix?: string
}

interface LenderComboboxProps {
  form: UseFormReturn<any>
  name: string
  label: string
  placeholder: string
}

export function LenderCombobox({
  form,
  name,
  label,
  placeholder,
}: LenderComboboxProps) {
  const t = useTranslations('loans')
  const { selectedProject } = useProject()
  const [lenders, setLenders] = useState<Lender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLenders = async () => {
      if (!selectedProject) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/lenders?projectId=${selectedProject.id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch lenders')
        }

        const data = await response.json()
        setLenders(data)
      } catch (err) {
        console.error('Error fetching lenders:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLenders()
  }, [selectedProject])

  // Format lender options for the combobox
  const lenderOptions = lenders.map(lender => ({
    value: lender.id,
    label: lender.type === 'PERSON'
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
      : lender.organisationName || ''
  }))

  return (
    <FormCombobox
      form={form}
      name={name}
      label={label}
      placeholder={isLoading ? t('new.form.loadingLenders') : placeholder}
      options={lenderOptions}
    />
  )
} 