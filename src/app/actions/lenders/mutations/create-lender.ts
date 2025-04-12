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