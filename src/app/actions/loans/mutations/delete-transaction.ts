'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteTransaction(loanId: string, transactionId: string) {
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

    // Delete the transaction
    await db.transaction.delete({
      where: {
        id: transactionId
      }
    })

    // Revalidate the loan page
    revalidatePath(`/dashboard/loans/${loanId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return { error: error instanceof Error ? error.message : 'Failed to delete transaction' }
  }
} 