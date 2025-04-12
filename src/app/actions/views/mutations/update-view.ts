'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function updateView(viewId: string, data: Prisma.ViewUpdateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the view
    const view = await db.view.findUnique({
      where: {
        id: viewId
      }
    })

    if (!view) {
      throw new Error('View not found')
    }

    // Check if the user has access to the view
    if (view.userId !== session.user.id) {
      throw new Error('You do not have access to this view')
    }

    // Update the view
    const updatedView = await db.view.update({
      where: {
        id: viewId
      },
      data
    })

    // Revalidate the view
    revalidatePath(`/dashboard/${view.type.toLowerCase()}`)

    return { view: updatedView }
  } catch (error) {
    console.error('Error updating view:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update view' }
  }
} 