'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

// Define the Lender interface to match the client-side interface
interface Transaction {
  id: string
  type: 'INTEREST' | 'DEPOSIT' | 'WITHDRAWAL' | 'TERMINATION' | 'INTERESTPAYMENT' | 'NOTRECLAIMEDPARTIAL' | 'NOTRECLAIMED'
  date: string
  amount: number
  paymentType: 'BANK' | 'CASH' | 'OTHER'
  note?: string
}

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
  altInterestMethod?: string
  lender: {
    id: string
    lenderNumber: number
    firstName?: string
    lastName?: string
    organisationName?: string
  }
  transactions: Transaction[]
}

interface Lender {
  id: string
  lenderNumber: number
  type: 'PERSON' | 'ORGANISATION'
  salutation: 'PERSONAL' | 'FORMAL'
  firstName?: string
  lastName?: string
  organisationName?: string
  titlePrefix?: string
  titleSuffix?: string
  street?: string
  addon?: string
  zip?: string
  place?: string
  country?: string
  email?: string
  telNo?: string
  iban?: string
  bic?: string
  notificationType: 'ONLINE' | 'EMAIL' | 'MAIL'
  membershipStatus?: 'UNKNOWN' | 'MEMBER' | 'EXTERNAL'
  tag?: string
  loans: Loan[]
}

// Helper function to convert Decimal to number
function decimalToNumber(decimal: Decimal | null | undefined): number | undefined {
  if (decimal === null || decimal === undefined) return undefined
  return Number(decimal.toString())
}

// Helper function to transform a database lender to the client interface
function transformLender(dbLender: any): Lender {
  return {
    id: dbLender.id,
    lenderNumber: dbLender.lenderNumber,
    type: dbLender.type,
    salutation: dbLender.salutation,
    firstName: dbLender.firstName || undefined,
    lastName: dbLender.lastName || undefined,
    organisationName: dbLender.organisationName || undefined,
    titlePrefix: dbLender.titlePrefix || undefined,
    titleSuffix: dbLender.titleSuffix || undefined,
    street: dbLender.street || undefined,
    addon: dbLender.addon || undefined,
    zip: dbLender.zip || undefined,
    place: dbLender.place || undefined,
    country: dbLender.country || undefined,
    email: dbLender.email || undefined,
    telNo: dbLender.telNo || undefined,
    iban: dbLender.iban || undefined,
    bic: dbLender.bic || undefined,
    notificationType: dbLender.notificationType,
    membershipStatus: dbLender.membershipStatus || undefined,
    tag: dbLender.tag || undefined,
    loans: dbLender.loans?.map((loan: any) => ({
      id: loan.id,
      loanNumber: loan.loanNumber,
      amount: decimalToNumber(loan.amount) || 0,
      interestRate: decimalToNumber(loan.interestRate) || 0,
      signDate: loan.signDate.toISOString(),
      endDate: loan.endDate?.toISOString(),
      contractStatus: loan.contractStatus,
      interestPaymentType: loan.interestPaymentType,
      interestPayoutType: loan.interestPayoutType,
      terminationType: loan.terminationType,
      terminationDate: loan.terminationDate?.toISOString(),
      terminationPeriod: loan.terminationPeriod || undefined,
      terminationPeriodType: loan.terminationPeriodType || undefined,
      duration: loan.duration || undefined,
      durationType: loan.durationType || undefined,
      altInterestMethod: loan.altInterestMethod || undefined,
      lender: {
        id: loan.lender.id,
        lenderNumber: loan.lender.lenderNumber,
        firstName: loan.lender.firstName || undefined,
        lastName: loan.lender.lastName || undefined,
        organisationName: loan.lender.organisationName || undefined
      },
      transactions: loan.transactions?.map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type,
        date: transaction.date.toISOString(),
        amount: decimalToNumber(transaction.amount) || 0,
        paymentType: transaction.paymentType,
        note: undefined // Note field doesn't exist in the database model
      })) || []
    })) || []
  }
}

export async function getLenderById(lenderId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    const dbLender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        loans: {
          orderBy: {
            loanNumber: 'desc'
          },
          include: {
            lender: {
              select: {
                id: true,
                lenderNumber: true,
                firstName: true,
                lastName: true,
                organisationName: true
              }
            },
            transactions: {
              orderBy: {
                date: 'desc'
              }
            }
          }
        },
        project: {
          include: {
            managers: true
          }
        }
      }
    })

    if (!dbLender) {
      throw new Error('Lender not found')
    }

    // Check if the user has access to the project
    const hasAccess = dbLender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Transform the database lender to match the expected Lender interface
    const lender = transformLender(dbLender)

    return { lender }
  } catch (error) {
    console.error('Error fetching lender:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch lender' }
  }
}

export async function getLendersByProjectId(projectId: string) {
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
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Fetch all lenders for the project
    const dbLenders = await db.lender.findMany({
      where: {
        projectId
      },
      include: {
        loans: {
          orderBy: {
            loanNumber: 'desc'
          },
          include: {
            lender: {
              select: {
                id: true,
                lenderNumber: true,
                firstName: true,
                lastName: true,
                organisationName: true
              }
            },
            transactions: {
              orderBy: {
                date: 'desc'
              }
            }
          }
        }
      },
      orderBy: {
        lenderNumber: 'asc'
      }
    })

    // Transform the database lenders to match the expected Lender interface
    const lenders = dbLenders.map(transformLender)

    return { lenders }
  } catch (error) {
    console.error('Error fetching lenders:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch lenders' }
  }
}

export async function updateLender(lenderId: string, data: any) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Get the lender to check access
    const existingLender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
            configuration: true
          },
        },
      },
    })

    if (!existingLender) {
      throw new Error('Lender not found')
    }

    // Check if the user has access to the project
    const hasAccess = existingLender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this project')
    }

    // Update the lender
    const updatedLender = await db.lender.update({
      where: {
        id: lenderId,
      },
      data: {
        ...data,
        user: data.email ? {
          connectOrCreate: {
            where: { email: data.email },
            create: {
              email: data.email,
              name: data.type === 'PERSON'
                ? `${data.firstName} ${data.lastName}`
                : data.organisationName || '',
              language: existingLender.project.configuration?.userLanguage || 'de',
              theme: existingLender.project.configuration?.userTheme || 'default',
            }
          }
        } : undefined
      },
    })

    // Revalidate the lender page
    revalidatePath(`/dashboard/lenders/${lenderId}`)
    revalidatePath(`/dashboard/lenders/${lenderId}/edit`)

    return { lender: updatedLender }
  } catch (error) {
    console.error('Error updating lender:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update lender' }
  }
}

export async function revalidateLender(lenderId: string) {
  revalidatePath(`/dashboard/lenders/${lenderId}`)
} 