'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ViewType } from '@prisma/client'

export async function getViewsByType(viewType: ViewType) {
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