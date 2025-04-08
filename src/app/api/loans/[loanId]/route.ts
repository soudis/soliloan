import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { loanFormSchema } from '@/lib/schemas/loan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loan = await db.loan.findUnique({
      where: {
        id: params.loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true,
              },
            },
          },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error fetching loan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate the request body
    const validatedData = loanFormSchema.parse(body)

    // Get the loan to check access
    const existingLoan = await db.loan.findUnique({
      where: {
        id: params.loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true,
              },
            },
          },
        },
      },
    })

    if (!existingLoan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Check if the user has access to the project
    const hasAccess = existingLoan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Update the loan
    const updatedLoan = await db.loan.update({
      where: {
        id: params.loanId,
      },
      data: {
        lenderId: validatedData.lenderId,
        signDate: validatedData.signDate,
        interestPaymentType: validatedData.interestPaymentType,
        interestPayoutType: validatedData.interestPayoutType,
        terminationType: validatedData.terminationType,
        endDate: validatedData.endDate,
        terminationDate: validatedData.terminationDate,
        terminationPeriod: validatedData.terminationPeriod,
        terminationPeriodType: validatedData.terminationPeriodType,
        duration: validatedData.duration,
        durationType: validatedData.durationType,
        amount: validatedData.amount,
        interestRate: validatedData.interestRate,
        altInterestMethod: validatedData.altInterestMethod,
        contractStatus: validatedData.contractStatus,
      },
    })

    return NextResponse.json(updatedLoan)
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json(
      { error: 'Failed to update loan' },
      { status: 500 }
    )
  }
} 