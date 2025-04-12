'use client'

import { getProjects } from '@/app/actions/projects'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProject } from '@/store/project-context'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  name: string
  slug: string
  configuration?: {
    id: string
    name: string
    email?: string
    telNo?: string
    website?: string
    street?: string
    addon?: string
    zip?: string
    place?: string
    country?: string
    iban?: string
    bic?: string
    userLanguage?: string
    userTheme?: string
    lenderSalutation?: string
    lenderCountry?: string
    lenderNotificationType?: string
    lenderMembershipStatus?: string
    lenderTags: string[]
    interestMethod?: string
    altInterestMethods: string[]
    customLoans: boolean
  }
}

export default function ProjectSelector() {
  const { selectedProject, setSelectedProject } = useProject()
  const t = useTranslations('navigation')
  const commonT = useTranslations('common')
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { projects: fetchedProjects, error } = await getProjects()
        if (error) {
          throw new Error(error)
        }
        if (fetchedProjects) {
          // Transform the projects to match the expected format
          const transformedProjects = fetchedProjects.map(project => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            configuration: project.configuration ? {
              id: project.configuration.id,
              name: project.configuration.name,
              email: project.configuration.email || undefined,
              telNo: project.configuration.telNo || undefined,
              website: project.configuration.website || undefined,
              street: project.configuration.street || undefined,
              addon: project.configuration.addon || undefined,
              zip: project.configuration.zip || undefined,
              place: project.configuration.place || undefined,
              country: project.configuration.country || undefined,
              iban: project.configuration.iban || undefined,
              bic: project.configuration.bic || undefined,
              userLanguage: project.configuration.userLanguage || undefined,
              userTheme: project.configuration.userTheme || undefined,
              lenderSalutation: project.configuration.lenderSalutation || undefined,
              lenderCountry: project.configuration.lenderCountry || undefined,
              lenderNotificationType: project.configuration.lenderNotificationType || undefined,
              lenderMembershipStatus: project.configuration.lenderMembershipStatus || undefined,
              lenderTags: project.configuration.lenderTags || [],
              interestMethod: project.configuration.interestMethod || undefined,
              altInterestMethods: project.configuration.altInterestMethods || [],
              customLoans: project.configuration.customLoans || false
            } : undefined
          }))
          setProjects(transformedProjects)
          if (transformedProjects.length > 0 && !selectedProject) {
            setSelectedProject(transformedProjects[0])
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [selectedProject, setSelectedProject])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="mb-4">
      <Select
        value={selectedProject?.id}
        onValueChange={(value: string) => {
          const project = projects.find((p: Project) => p.id === value)
          setSelectedProject(project || null)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('selectProject')} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project: Project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 