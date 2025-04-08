import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lenderFormSchema } from '@/lib/schemas/lender'
import { Language } from '@prisma/client'
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
    const validatedData = lenderFormSchema.parse(body)

    // Check if the user has access to the project
    const project = await db.project.findFirst({
      where: {
        id: validatedData.projectId,
        managers: {
          some: {
            id: session.user.id
          }
        }
      },
      include: {
        configuration: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Create the lender in the database
    const lender = await db.lender.create({
      data: {
        project: { connect: { id: validatedData.projectId } },
        type: validatedData.type,
        salutation: validatedData.salutation,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        organisationName: validatedData.organisationName,
        titlePrefix: validatedData.titlePrefix,
        titleSuffix: validatedData.titleSuffix,
        telNo: validatedData.telNo,
        street: validatedData.street,
        addon: validatedData.addon,
        zip: validatedData.zip,
        place: validatedData.place,
        country: validatedData.country,
        iban: validatedData.iban,
        bic: validatedData.bic,
        notificationType: validatedData.notificationType,
        membershipStatus: validatedData.membershipStatus,
        tag: validatedData.tag,
        user: validatedData.email ? {
          connectOrCreate: {
            where: { email: validatedData.email },
            create: {
              email: validatedData.email,
              name: validatedData.type === 'PERSON'
                ? `${validatedData.firstName} ${validatedData.lastName}`
                : validatedData.organisationName || '',
              language: project.configuration?.userLanguage || Language.de,
              theme: project.configuration?.userTheme || 'default',
            }
          }
        } : undefined
      }
    })

    return NextResponse.json(lender, { status: 201 })
  } catch (error) {
    console.error('Error creating lender:', error)

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

    // Get all lenders for the project
    const lenders = await db.lender.findMany({
      where: {
        projectId
      },
      orderBy: {
        lenderNumber: 'desc'
      }
    })

    return NextResponse.json(lenders)
  } catch (error) {
    console.error('Error fetching lenders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 