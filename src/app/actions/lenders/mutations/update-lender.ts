'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function updateLender(lenderId: string, data: Prisma.LenderUpdateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the lender
    const lender = await db.lender.findUnique({
      where: {
        id: lenderId
      },
      include: {
        project: {
          include: {
            managers: true
          }
        }
      }
    })

    if (!lender) {
      throw new Error('Lender not found')
    }

    // Check if the user has access to the lender's project
    const hasAccess = lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this lender')
    }

    // Update the lender
    const updatedLender = await db.lender.update({
      where: {
        id: lenderId
      },
      data
    })

    // Revalidate the lenders page
    revalidatePath(`/dashboard/lenders/${lender.projectId}`)

    return { lender: updatedLender }
  } catch (error) {
    console.error('Error updating lender:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update lender' }
  }
} 