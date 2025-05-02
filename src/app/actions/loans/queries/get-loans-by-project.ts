'use server'

import { auth } from '@/lib/auth'
import { calculateLoanFields } from '@/lib/calculations/loan-calculations'
import { db } from '@/lib/db'
import { Lender, Loan, Transaction } from '@prisma/client'

// Define the type for the loan with included relations
type LoanWithRelations = Loan & {
  lender: Pick<Lender, 'id' | 'lenderNumber' | 'firstName' | 'lastName' | 'organisationName'>
  transactions: Transaction[]
}

export async function getLoansByProjectId(projectId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Check if the user has access to the project
    const project = await db.project.findUnique({
      where: {
        id: projectId
      },
      include: {
        managers: true
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Fetch all loans for the project
    const loans = await db.loan.findMany({
      where: {
        lender: {
          projectId: projectId
        }
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                configuration: { select: { interestMethod: true } }
              }
            },
            user: { select: { name: true, id: true, email: true, lastLogin: true, lastInvited: true } },
            notes: { include: { createdBy: { select: { id: true, name: true } } } },
            files: { select: { id: true, name: true, description: true, public: true, mimeType: true, lenderId: true, loanId: true, thumbnail: true } }
          }
        },
        transactions: true,
        notes: { include: { createdBy: { select: { id: true, name: true } } } },
        files: { select: { id: true, name: true, description: true, public: true, mimeType: true, lenderId: true, loanId: true, thumbnail: true } }
      }
    })

    // Calculate virtual fields for each loan
    const loansWithCalculations = loans.map(loan =>
      calculateLoanFields<Omit<LoanWithRelations, keyof Loan>>(loan)
    )

    return { loans: loansWithCalculations }
  } catch (error) {
    console.error('Error fetching loans:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch loans' }
  }
} 