'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function getLenderById(lenderId: string) {
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
        },
        loans: {
          include: {
            transactions: true
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

    return { lender }
  } catch (error) {
    console.error('Error fetching lender:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch lender' }
  }
} 