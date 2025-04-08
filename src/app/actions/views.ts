'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getViewsByType(viewType: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch all views for the user
    const views = await db.view.findMany({
      where: {
        userId: session.user.id,
        type: viewType
      },
      orderBy: {
        name: 'asc'
      }
    })

    return { views }
  } catch (error) {
    console.error('Error fetching views:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch views' }
  }
}

export async function getViewById(viewId: string) {
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

    return { view }
  } catch (error) {
    console.error('Error fetching view:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch view' }
  }
}

export async function updateView(viewId: string, data: any) {
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

export async function createView(data: any) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Create the view
    const view = await db.view.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })

    // Revalidate the view
    revalidatePath(`/dashboard/${view.type.toLowerCase()}`)

    return { view }
  } catch (error) {
    console.error('Error creating view:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create view' }
  }
}

export async function deleteView(viewId: string) {
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

    // Delete the view
    await db.view.delete({
      where: {
        id: viewId
      }
    })

    // Revalidate the view
    revalidatePath(`/dashboard/${view.type.toLowerCase()}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting view:', error)
    return { error: error instanceof Error ? error.message : 'Failed to delete view' }
  }
}

export async function revalidateView(viewType: string) {
  revalidatePath(`/dashboard/${viewType.toLowerCase()}`)
} 