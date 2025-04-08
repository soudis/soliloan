'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { configurationFormSchema } from '@/lib/schemas/configuration'
import { revalidatePath } from 'next/cache'

export async function getProjectConfiguration(projectId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the project
    const project = await db.project.findUnique({
      where: {
        id: projectId
      },
      include: {
        managers: true,
        configuration: true
      }
    })

    console.log('Project from DB:', JSON.stringify(project, null, 2))

    if (!project) {
      throw new Error('Project not found')
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Transform the configuration to match the form schema
    const configuration = project.configuration ? {
      id: project.configuration.id,
      name: project.configuration.name,
      // Convert nullable fields to undefined for the form
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
      customLoans: project.configuration.customLoans || false,
    } : null

    console.log('Transformed configuration:', JSON.stringify(configuration, null, 2))

    return { configuration }
  } catch (error) {
    console.error('Error fetching project configuration:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch project configuration' }
  }
}

export async function updateProjectConfiguration(projectId: string, data: any) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the project
    const project = await db.project.findUnique({
      where: {
        id: projectId
      },
      include: {
        managers: true,
        configuration: true
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Validate the data
    const validatedData = configurationFormSchema.parse(data)

    // Transform the data to match the database schema
    const dbData = {
      ...validatedData,
      // Convert undefined fields to null for the database
      email: validatedData.email || null,
      telNo: validatedData.telNo || null,
      website: validatedData.website || null,
      street: validatedData.street || null,
      addon: validatedData.addon || null,
      zip: validatedData.zip || null,
      place: validatedData.place || null,
      country: validatedData.country || null,
      iban: validatedData.iban || null,
      bic: validatedData.bic || null,
      userLanguage: validatedData.userLanguage || null,
      userTheme: validatedData.userTheme || null,
      lenderSalutation: validatedData.lenderSalutation || null,
      lenderCountry: validatedData.lenderCountry || null,
      lenderNotificationType: validatedData.lenderNotificationType || null,
      lenderMembershipStatus: validatedData.lenderMembershipStatus || null,
      lenderTags: validatedData.lenderTags || [],
      interestMethod: validatedData.interestMethod || null,
      altInterestMethods: validatedData.altInterestMethods || [],
      customLoans: validatedData.customLoans || false,
    }

    // Update the project configuration
    const configuration = await db.configuration.upsert({
      where: {
        id: project.configurationId
      },
      update: dbData,
      create: {
        ...dbData,
        project: {
          connect: {
            id: projectId
          }
        }
      }
    })

    // Revalidate the project configuration page
    revalidatePath(`/dashboard/configuration`)

    // Transform the configuration back to match the form schema
    const formConfiguration = {
      ...configuration,
      // Convert null fields to undefined for the form
      email: configuration.email || undefined,
      telNo: configuration.telNo || undefined,
      website: configuration.website || undefined,
      street: configuration.street || undefined,
      addon: configuration.addon || undefined,
      zip: configuration.zip || undefined,
      place: configuration.place || undefined,
      country: configuration.country || undefined,
      iban: configuration.iban || undefined,
      bic: configuration.bic || undefined,
      userLanguage: configuration.userLanguage || undefined,
      userTheme: configuration.userTheme || undefined,
      lenderSalutation: configuration.lenderSalutation || undefined,
      lenderCountry: configuration.lenderCountry || undefined,
      lenderNotificationType: configuration.lenderNotificationType || undefined,
      lenderMembershipStatus: configuration.lenderMembershipStatus || undefined,
      lenderTags: configuration.lenderTags || [],
      interestMethod: configuration.interestMethod || undefined,
      altInterestMethods: configuration.altInterestMethods || [],
      customLoans: configuration.customLoans || false,
    }

    return { configuration: formConfiguration }
  } catch (error) {
    console.error('Error updating project configuration:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update project configuration' }
  }
} 