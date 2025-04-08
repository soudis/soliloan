import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactionSchema } from '@/lib/schemas/transaction'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    // Get the loan to check access
    const loan = await db.loan.findUnique({
      where: {
        id: params.loanId,
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
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this loan' },
        { status: 403 }
      )
    }

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        ...validatedData,
        loanId: params.loanId,
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = new URL(request.url).searchParams
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Get the loan to check access
    const loan = await db.loan.findUnique({
      where: {
        id: params.loanId,
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
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Check if the user has access to the project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this loan' },
        { status: 403 }
      )
    }

    // Delete the transaction
    await db.transaction.delete({
      where: {
        id: transactionId,
        loanId: params.loanId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
} 