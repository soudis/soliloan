'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { LoanFormData } from '@/lib/schemas/loan'
import { revalidatePath } from 'next/cache'

export async function updateLoan(loanId: string, data: LoanFormData) {
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

    // Update the loan
    const updatedLoan = await db.loan.update({
      where: {
        id: loanId
      },
      data: {
        signDate: data.signDate,
        interestPaymentType: data.interestPaymentType,
        interestPayoutType: data.interestPayoutType,
        terminationType: data.terminationType,
        endDate: data.endDate,
        terminationDate: data.terminationDate,
        terminationPeriod: data.terminationPeriod,
        terminationPeriodType: data.terminationPeriodType,
        duration: data.duration,
        durationType: data.durationType,
        amount: data.amount,
        interestRate: data.interestRate,
        altInterestMethod: data.altInterestMethod,
        contractStatus: data.contractStatus,
      }
    })

    // Revalidate the loans page
    revalidatePath(`/dashboard/loans/${loan.lenderId}`)

    return { loan: updatedLoan }
  } catch (error) {
    console.error('Error updating loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update loan' }
  }
} 