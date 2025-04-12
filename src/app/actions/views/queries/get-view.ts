'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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