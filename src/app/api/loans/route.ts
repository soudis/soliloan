import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { loanFormSchema } from '@/lib/schemas/loan'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    // Get the current session using Next-Auth 5
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the request body
    const body = await req.json()

    // Validate the request body against the schema
    const validatedData = loanFormSchema.parse(body)

    // Check if the user has access to the project
    const lender = await db.lender.findUnique({
      where: {
        id: validatedData.lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
          },
        },
      },
    })

    if (!lender) {
      return NextResponse.json(
        { error: 'Lender not found' },
        { status: 404 }
      )
    }

    // Check if the user has access to the project
    const hasAccess = lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Create the loan in the database
    const loan = await db.loan.create({
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
      }
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    console.error('Error creating loan:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get the current session using Next-Auth 5
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the project ID from the query parameters
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Check if the user has access to the project
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        managers: {
          some: {
            id: session.user.id
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Get all loans for the project
    const loans = await db.loan.findMany({
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
            email: true
          }
        }
      },
      orderBy: {
        loanNumber: 'desc'
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 