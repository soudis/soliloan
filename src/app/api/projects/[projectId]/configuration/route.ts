import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { configurationFormSchema } from '@/lib/schemas/configuration'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if the user has access to the project
    const project = await db.project.findFirst({
      where: {
        id: resolvedParams.projectId,
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

    if (!project.configuration) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project.configuration)
  } catch (error) {
    console.error('Error fetching configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user has access to the project
    const project = await db.project.findFirst({
      where: {
        id: params.projectId,
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

    const body = await request.json()

    // Validate the request body
    const validatedData = configurationFormSchema.parse(body)

    // Update the configuration
    const updatedConfiguration = await db.configuration.update({
      where: {
        id: project.configurationId,
      },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        telNo: validatedData.telNo,
        website: validatedData.website,
        street: validatedData.street,
        addon: validatedData.addon,
        zip: validatedData.zip,
        place: validatedData.place,
        country: validatedData.country,
        iban: validatedData.iban,
        bic: validatedData.bic,
        userLanguage: validatedData.userLanguage,
        userTheme: validatedData.userTheme,
        lenderSalutation: validatedData.lenderSalutation,
        lenderCountry: validatedData.lenderCountry,
        lenderNotificationType: validatedData.lenderNotificationType,
        lenderMembershipStatus: validatedData.lenderMembershipStatus,
        lenderTags: validatedData.lenderTags,
        interestMethod: validatedData.interestMethod,
        altInterestMethods: validatedData.altInterestMethods,
        customLoans: validatedData.customLoans,
      },
    })

    return NextResponse.json(updatedConfiguration)
  } catch (error) {
    console.error('Error updating configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
} 