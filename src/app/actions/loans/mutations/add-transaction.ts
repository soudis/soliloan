'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function addTransaction(loanId: string, data: Prisma.TransactionCreateInput) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the loan
    const loan = await db.loan.findUnique({
      where: {
        id: loanId
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true
              }
            }
          }
        }
      }
    })

    if (!loan) {
      throw new Error('Loan not found')
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this loan')
    }

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        ...data,
        loan: {
          connect: {
            id: loanId
          }
        }
      }
    })

    // Revalidate the loan page
    revalidatePath(`/dashboard/loans/${loanId}`)

    return { transaction }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create transaction' }
  }
} 