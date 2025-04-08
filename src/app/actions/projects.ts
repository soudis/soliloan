'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch all projects for the user
    const projects = await db.project.findMany({
      where: {
        managers: {
          some: {
            id: session.user.id
          }
        }
      },
      include: {
        configuration: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return { projects }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch projects' }
  }
}

export async function getProjectById(projectId: string) {
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

    return { project }
  } catch (error) {
    console.error('Error fetching project:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch project' }
  }
}

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

    return { configuration: project.configuration }
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
        managers: true
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

    // Update the project configuration
    const configuration = await db.configuration.upsert({
      where: {
        id: project.configurationId
      },
      update: data,
      create: {
        ...data,
        project: {
          connect: {
            id: projectId
          }
        }
      }
    })

    // Revalidate the project configuration page
    revalidatePath(`/dashboard/configuration`)

    return { configuration }
  } catch (error) {
    console.error('Error updating project configuration:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update project configuration' }
  }
}

export async function revalidateProject(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`)
} 