"use server"
import { calculateLenderFields } from '@/lib/calculations/lender-calculations'
import { db } from '@/lib/db'
import { Lender, Loan, Transaction } from '@prisma/client'

// Define the type for the lender with included relations
type LenderWithRelations = Lender & {
  loans: (Loan & {
    transactions: Transaction[]
  })[]
}

export async function getLendersByProjectId(projectId: string) {
  try {
    const lenders = await db.lender.findMany({
      where: {
        projectId
      },
      orderBy: {
        lenderNumber: 'asc'
      },
      include: {
        loans: {
          include: {
            transactions: true,
            notes: { include: { createdBy: { select: { id: true, name: true } } } },
            files: { select: { id: true, name: true, description: true, public: true, mimeType: true, lenderId: true, loanId: true, thumbnail: true } }
          }
        },
        notes: { include: { createdBy: { select: { id: true, name: true } } } },
        files: { select: { id: true, name: true, description: true, public: true, mimeType: true, lenderId: true, loanId: true, thumbnail: true } },
        user: true,
        project: true
      }

    })

    // Calculate virtual fields for each lender
    const lendersWithCalculations = lenders.map(lender =>
      calculateLenderFields<Omit<LenderWithRelations, keyof Lender>>(lender)
    )

    return { lenders: lendersWithCalculations }
  } catch (error) {
    console.error('Error fetching lenders:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch lenders' }
  }
} 