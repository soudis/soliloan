'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createView(data: Prisma.ViewCreateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Create the view
    const view = await db.view.create({
      data: {
        ...data,
        user: {
          connect: {
            id: session.user.id
          }
        }
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