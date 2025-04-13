'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ViewFormData } from '@/lib/schemas/view'
import { revalidatePath } from 'next/cache'

export async function createView(data: ViewFormData) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Create the view
    const view = await db.view.create({
      data: {
        name: data.name,
        type: data.type,
        data: data.data,
        isDefault: data.isDefault,
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