'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createLoan(data: Prisma.LoanCreateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    if (!data.lender?.connect?.id) {
      throw new Error('Lender ID is required')
    }

    // Check if the user has access to the lender's project
    const lender = await db.lender.findUnique({
      where: {
        id: data.lender.connect.id
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

    // Check if the user has access to the project
    const hasAccess = lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Create the loan
    const loan = await db.loan.create({
      data: {
        ...data,
        lender: {
          connect: {
            id: data.lender.connect.id
          }
        }
      }
    })

    // Revalidate the loans page
    revalidatePath(`/dashboard/loans/${data.lender.connect.id}`)

    return { loan }
  } catch (error) {
    console.error('Error creating loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create loan' }
  }
} 