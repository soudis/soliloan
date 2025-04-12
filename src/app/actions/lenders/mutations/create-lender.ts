'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createLender(data: Prisma.LenderCreateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    if (!data.project?.connect?.id) {
      throw new Error('Project ID is required')
    }

    // Check if the user has access to the project
    const project = await db.project.findUnique({
      where: {
        id: data.project.connect.id
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

    // Create the lender
    const lender = await db.lender.create({
      data: {
        ...data,
        project: {
          connect: {
            id: data.project.connect.id
          }
        }
      }
    })

    // Revalidate the lenders page
    revalidatePath(`/dashboard/lenders/${data.project.connect.id}`)

    return { lender }
  } catch (error) {
    console.error('Error creating lender:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create lender' }
  }
} 