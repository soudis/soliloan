'use server'

import { auth } from '@/lib/auth'
import { calculateLenderFields } from '@/lib/calculations/lender-calculations'
import { calculateLoanFields, calculateLoanPerYear, getLoanStatus } from '@/lib/calculations/loan-calculations'
import { db } from '@/lib/db'
import { LoanStatus } from '@/types/loans'

export async function getDashboardStats(projectId: string) {
  try {
    const session = await auth()
    if (!session) {
      return { error: 'Unauthorized' }
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
      return { error: 'Project not found' }
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return { error: 'You do not have access to this project' }
    }

    // Get lender statistics
    const lenders = await db.lender.findMany({
      where: {
        projectId: projectId
      },
      include: {
        project: true,
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        files: true
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
        transactions: true,
        lender: {
          include: {
            project: {
              include: {
                configuration: { select: { interestMethod: true } }
              }
            },
            notes: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            files: true
          }
        },
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        files: true
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

    // Calculate loan status breakdown using the calculation functions
    const today = new Date()
    const loanStatusBreakdown = {
      active: 0,
      repaid: 0,
      terminated: 0,
      notDeposited: 0
    }

    // Calculate interest statistics
    let totalInterest = 0
    let totalInterestPaid = 0
    let totalBalance = 0
    let totalDeposits = 0
    let totalWithdrawals = 0
    let totalNotReclaimed = 0

    // Process each loan with calculations
    loans.forEach(loan => {
      try {
        const calculatedLoan = calculateLoanFields(loan as any)

        // Update loan status counts
        const status = getLoanStatus(loan as any, today)
        if (status === LoanStatus.ACTIVE) loanStatusBreakdown.active++
        else if (status === LoanStatus.REPAID) loanStatusBreakdown.repaid++
        else if (status === LoanStatus.TERMINATED) loanStatusBreakdown.terminated++
        else if (status === LoanStatus.NOTDEPOSITED) loanStatusBreakdown.notDeposited++

        // Update interest statistics
        totalInterest += Number(calculatedLoan.interest)
        totalInterestPaid += Number(calculatedLoan.interestPaid)
        totalBalance += Number(calculatedLoan.balance)
        totalDeposits += Number(calculatedLoan.deposits)
        totalWithdrawals += Number(calculatedLoan.withdrawals)
        totalNotReclaimed += Number(calculatedLoan.notReclaimed)
      } catch (error) {
        console.error('Error calculating loan fields:', error)
      }
    })

    // Calculate yearly data for charts
    const currentYear = new Date().getFullYear()
    const yearlyData = []

    // Get the last 5 years of data
    for (let year = currentYear - 4; year <= currentYear; year++) {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31)

      // Filter loans active in this year
      const activeLoansInYear = loans.filter(loan => {
        const loanStart = loan.signDate ? new Date(loan.signDate) : null
        const loanEnd = loan.endDate ? new Date(loan.endDate) : null

        return (loanStart && loanStart <= yearEnd) ||
          (loanEnd && loanEnd >= yearStart) ||
          (!loanStart && !loanEnd)
      })

      // Calculate yearly totals
      let yearTotalAmount = 0
      let yearTotalInterest = 0
      let yearTotalDeposits = 0
      let yearTotalWithdrawals = 0

      activeLoansInYear.forEach(loan => {
        try {
          const calculatedLoan = calculateLoanFields(loan as any)
          yearTotalAmount += Number(calculatedLoan.amount)
          yearTotalInterest += Number(calculatedLoan.interest)
          yearTotalDeposits += Number(calculatedLoan.deposits)
          yearTotalWithdrawals += Number(calculatedLoan.withdrawals)
        } catch (error) {
          console.error('Error calculating loan fields for yearly data:', error)
        }
      })

      yearlyData.push({
        year,
        totalAmount: yearTotalAmount,
        totalInterest: yearTotalInterest,
        totalDeposits: yearTotalDeposits,
        totalWithdrawals: yearTotalWithdrawals
      })
    }

    // Calculate lender statistics
    let totalLenderAmount = 0
    let totalLenderInterest = 0
    let totalLenderBalance = 0

    // Process each lender with calculations
    lenders.forEach(lender => {
      try {
        const calculatedLender = calculateLenderFields(lender as any)
        totalLenderAmount += Number(calculatedLender.amount || 0)
        totalLenderInterest += Number(calculatedLender.interest || 0)
        totalLenderBalance += Number(calculatedLender.balance || 0)
      } catch (error) {
        console.error('Error calculating lender fields:', error)
      }
    })

    // Calculate detailed yearly data for each loan
    const yearlyLoanData = []

    // Get all years from the earliest loan to the current year
    const earliestYear = loans.length > 0
      ? Math.min(...loans.map(loan => new Date(loan.signDate).getFullYear()))
      : currentYear - 4

    for (let year = earliestYear; year <= currentYear; year++) {
      let yearBegin = 0
      let yearEnd = 0
      let yearWithdrawals = 0
      let yearDeposits = 0
      let yearNotReclaimed = 0
      let yearInterestPaid = 0
      let yearInterest = 0

      // Calculate yearly data for each loan
      loans.forEach(loan => {
        try {
          const yearData = calculateLoanPerYear(loan as any, new Date(year, 11, 31))
          const yearEntry = yearData.find(entry => entry.year === year)

          if (yearEntry) {
            yearBegin += Number(yearEntry.begin)
            yearEnd += Number(yearEntry.end)
            yearWithdrawals += Number(yearEntry.withdrawals)
            yearDeposits += Number(yearEntry.deposits)
            yearNotReclaimed += Number(yearEntry.notReclaimed)
            yearInterestPaid += Number(yearEntry.interestPaid)
            yearInterest += Number(yearEntry.interest)
          }
        } catch (error) {
          console.error(`Error calculating loan per year for loan ${loan.id} in year ${year}:`, error)
        }
      })

      yearlyLoanData.push({
        year,
        begin: yearBegin,
        end: yearEnd,
        withdrawals: yearWithdrawals,
        deposits: yearDeposits,
        notReclaimed: yearNotReclaimed,
        interestPaid: yearInterestPaid,
        interest: yearInterest
      })
    }

    return {
      stats: {
        totalLenders,
        personLenders,
        organisationLenders,
        totalLoans,
        pendingLoans,
        completedLoans,
        totalLoanAmount,
        avgInterestRate,
        loanStatusBreakdown,
        totalInterest,
        totalInterestPaid,
        totalBalance,
        totalDeposits,
        totalWithdrawals,
        totalNotReclaimed,
        totalLenderAmount,
        totalLenderInterest,
        totalLenderBalance,
        yearlyData,
        yearlyLoanData
      }
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return { error: 'Failed to get dashboard stats' }
  }
} 