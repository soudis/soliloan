'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function getLoanById(loanId: string) {
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

    return { loan }
  } catch (error) {
    console.error('Error fetching loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch loan' }
  }
} 