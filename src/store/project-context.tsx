'use client'

import { createContext, ReactNode, useContext, useState } from 'react'

interface Project {
  id: string
  name: string
  slug: string
  configuration?: {
    id: string
    name: string
    email: string
    telNo: string
    website: string
    street: string
    addon: string
    zip: string
    place: string
    country: string
    iban: string
    bic: string
    userLanguage: string
    userTheme: string
    lenderSalutation: string
    lenderCountry: string
    lenderNotificationType: string
    lenderMembershipStatus: string
    lenderTags: string[]
    interestMethod: string
    altInterestMethods: string[]
    customLoans: string[]
  }
  // Add other project properties as needed
}

interface ProjectContextType {
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
} 