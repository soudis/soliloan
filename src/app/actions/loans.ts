'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { User } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

// Define the Transaction interface
interface Transaction {
  id: string
  type: 'INTEREST' | 'DEPOSIT' | 'WITHDRAWAL' | 'TERMINATION' | 'INTERESTPAYMENT' | 'NOTRECLAIMEDPARTIAL' | 'NOTRECLAIMED'
  date: string
  amount: number
  paymentType: 'BANK' | 'CASH' | 'OTHER'
  note?: string
}

// Define the Loan interface
interface Loan {
  id: string
  loanNumber: number
  amount: number
  interestRate: number
  signDate: string
  endDate?: string
  contractStatus: 'PENDING' | 'COMPLETED'
  interestPaymentType: 'YEARLY' | 'END'
  interestPayoutType: 'MONEY' | 'COUPON'
  terminationType: 'ENDDATE' | 'TERMINATION' | 'DURATION'
  terminationDate?: string
  terminationPeriod?: number
  terminationPeriodType?: 'MONTHS' | 'YEARS'
  duration?: number
  durationType?: 'MONTHS' | 'YEARS'
  altInterestMethod?: 'ACT_365_NOCOMPOUND' | 'E30_360_NOCOMPOUND' | 'ACT_360_NOCOMPOUND' | 'ACT_ACT_NOCOMPOUND' | 'ACT_365_COMPOUND' | 'E30_360_COMPOUND' | 'ACT_360_COMPOUND' | 'ACT_ACT_COMPOUND'
  lender: {
    id: string
    lenderNumber: number
    firstName?: string
    lastName?: string
    organisationName?: string
    projectId: string
  }
  transactions: Transaction[]
}

// Helper function to convert Decimal to number
function decimalToNumber(decimal: Decimal | null | undefined): number | undefined {
  if (decimal === null || decimal === undefined) return undefined
  return Number(decimal.toString())
}

// Helper function to transform a database loan to the client interface
function transformLoan(dbLoan: any): Loan {
  return {
    id: dbLoan.id,
    loanNumber: dbLoan.loanNumber,
    amount: decimalToNumber(dbLoan.amount) || 0,
    interestRate: decimalToNumber(dbLoan.interestRate) || 0,
    signDate: dbLoan.signDate.toISOString(),
    endDate: dbLoan.endDate?.toISOString(),
    contractStatus: dbLoan.contractStatus,
    interestPaymentType: dbLoan.interestPaymentType,
    interestPayoutType: dbLoan.interestPayoutType,
    terminationType: dbLoan.terminationType,
    terminationDate: dbLoan.terminationDate?.toISOString(),
    terminationPeriod: dbLoan.terminationPeriod || undefined,
    terminationPeriodType: dbLoan.terminationPeriodType || undefined,
    duration: dbLoan.duration || undefined,
    durationType: dbLoan.durationType || undefined,
    altInterestMethod: dbLoan.altInterestMethod || undefined,
    lender: {
      id: dbLoan.lender.id,
      lenderNumber: dbLoan.lender.lenderNumber,
      firstName: dbLoan.lender.firstName || undefined,
      lastName: dbLoan.lender.lastName || undefined,
      organisationName: dbLoan.lender.organisationName || undefined,
      projectId: dbLoan.lender.projectId
    },
    transactions: dbLoan.transactions?.map((transaction: any) => ({
      id: transaction.id,
      type: transaction.type,
      date: transaction.date.toISOString(),
      amount: decimalToNumber(transaction.amount) || 0,
      paymentType: transaction.paymentType,
      note: undefined // Note field doesn't exist in the database model
    })) || []
  }
}

export async function getLoanById(loanId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    const dbLoan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          select: {
            id: true,
            lenderNumber: true,
            firstName: true,
            lastName: true,
            organisationName: true,
            projectId: true,
            project: {
              include: {
                managers: true
              }
            }
          }
        },
        transactions: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!dbLoan) {
      throw new Error('Loan not found')
    }

    // Check if the user has access to the project
    const hasAccess = dbLoan.lender.project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Transform the database loan to match the expected Loan interface
    const loan = transformLoan(dbLoan)

    return { loan }
  } catch (error) {
    console.error('Error fetching loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch loan' }
  }
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
        id: projectId,
      },
      include: {
        managers: true
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const hasAccess = project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Fetch all loans for the project
    const dbLoans = await db.loan.findMany({
      where: {
        lender: {
          projectId
        }
      },
      include: {
        lender: {
          select: {
            id: true,
            lenderNumber: true,
            firstName: true,
            lastName: true,
            organisationName: true,
            projectId: true
          }
        },
        transactions: {
          orderBy: {
            date: 'desc'
          }
        }
      },
      orderBy: {
        loanNumber: 'desc'
      }
    })

    // Transform the database loans to match the expected Loan interface
    const loans = dbLoans.map(transformLoan)

    return { loans }
  } catch (error) {
    console.error('Error fetching loans:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch loans' }
  }
}

export async function updateLoan(loanId: string, data: any) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Get the loan to check access
    const existingLoan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          select: {
            projectId: true,
            project: {
              include: {
                managers: true
              }
            }
          }
        }
      },
    })

    if (!existingLoan) {
      throw new Error('Loan not found')
    }

    // Check if the user has access to the project
    const hasAccess = existingLoan.lender.project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Update the loan
    const updatedLoan = await db.loan.update({
      where: {
        id: loanId,
      },
      data
    })

    // Revalidate the loan page
    revalidatePath(`/dashboard/loans/${loanId}`)
    revalidatePath(`/dashboard/loans/${loanId}/edit`)

    return { loan: updatedLoan }
  } catch (error) {
    console.error('Error updating loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update loan' }
  }
}

export async function getLoanTransactions(loanId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Get the loan to check access
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        transactions: {
          orderBy: {
            date: 'desc'
          }
        },
        lender: {
          select: {
            projectId: true,
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

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Transform the transactions
    const transactions = loan.transactions.map((transaction: any) => ({
      id: transaction.id,
      type: transaction.type,
      date: transaction.date.toISOString(),
      amount: decimalToNumber(transaction.amount) || 0,
      paymentType: transaction.paymentType,
      note: undefined // Note field doesn't exist in the database model
    }))

    return { transactions }
  } catch (error) {
    console.error('Error fetching loan transactions:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch loan transactions' }
  }
}

export async function addTransaction(loanId: string, data: any) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Get the loan to check access
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          select: {
            projectId: true,
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

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Add the transaction
    const transaction = await db.transaction.create({
      data: {
        ...data,
        loanId
      }
    })

    // Revalidate the loan page
    revalidatePath(`/dashboard/loans/${loanId}`)

    return { transaction }
  } catch (error) {
    console.error('Error adding transaction:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add transaction' }
  }
}

export async function deleteTransaction(loanId: string, transactionId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Get the loan to check access
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          select: {
            projectId: true,
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

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
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

export async function revalidateLoan(loanId: string) {
  revalidatePath(`/dashboard/loans/${loanId}`)
}

export async function createLoan(data: Omit<Loan, 'id' | 'transactions'>) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Check if the user has access to the project
    const project = await db.project.findUnique({
      where: {
        id: data.lender.projectId,
      },
      include: {
        managers: true
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const hasAccess = project.managers.some(
      (manager: User) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Create the loan
    const dbLoan = await db.loan.create({
      data: {
        loanNumber: data.loanNumber,
        amount: new Decimal(data.amount),
        interestRate: new Decimal(data.interestRate),
        signDate: new Date(data.signDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        contractStatus: data.contractStatus,
        interestPaymentType: data.interestPaymentType,
        interestPayoutType: data.interestPayoutType,
        terminationType: data.terminationType,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
        terminationPeriod: data.terminationPeriod,
        terminationPeriodType: data.terminationPeriodType,
        duration: data.duration,
        durationType: data.durationType,
        altInterestMethod: data.altInterestMethod,
        lender: {
          connect: {
            id: data.lender.id
          }
        }
      },
      include: {
        lender: {
          select: {
            id: true,
            lenderNumber: true,
            firstName: true,
            lastName: true,
            organisationName: true,
            projectId: true
          }
        },
        transactions: true
      }
    })

    // Transform the database loan to match the expected Loan interface
    const loan = transformLoan(dbLoan)

    // Revalidate the loans list page
    revalidatePath('/dashboard/loans/[projectId]')

    return { loan }
  } catch (error) {
    console.error('Error creating loan:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create loan' }
  }
} 