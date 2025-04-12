'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function getDashboardStats(projectId: string) {
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

    // Get lender statistics
    const lenders = await db.lender.findMany({
      where: {
        projectId: projectId
      },
      include: {
        _count: {
          select: {
            loans: true
          }
        }
      }
    })

    // Get loan statistics
    const loans = await db.loan.findMany({
      where: {
        lender: {
          projectId: projectId
        }
      },
      include: {
        transactions: true
      }
    })

    // Calculate statistics
    const totalLenders = lenders.length
    const totalLoans = loans.length

    // Calculate total loan amount
    const totalLoanAmount = loans.reduce((sum, loan) => {
      return sum + Number(loan.amount)
    }, 0)

    // Calculate average interest rate
    const avgInterestRate = totalLoans > 0
      ? loans.reduce((sum, loan) => sum + Number(loan.interestRate), 0) / totalLoans
      : 0

    // Count loans by status
    const pendingLoans = loans.filter(loan => loan.contractStatus === 'PENDING').length
    const completedLoans = loans.filter(loan => loan.contractStatus === 'COMPLETED').length

    // Count lenders by type
    const personLenders = lenders.filter(lender => lender.type === 'PERSON').length
    const organisationLenders = lenders.filter(lender => lender.type === 'ORGANISATION').length

    return {
      stats: {
        totalLenders,
        totalLoans,
        totalLoanAmount,
        avgInterestRate,
        pendingLoans,
        completedLoans,
        personLenders,
        organisationLenders
      }
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' }
  }
} 