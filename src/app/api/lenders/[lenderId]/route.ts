import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lenderFormSchema } from '@/lib/schemas/lender'
import { Language } from '@prisma/client'
import { omit } from 'lodash'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { lenderId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lender = await db.lender.findUnique({
      where: {
        id: params.lenderId,
      },
    })

    if (!lender) {
      return NextResponse.json({ error: 'Lender not found' }, { status: 404 })
    }

    return NextResponse.json(lender)
  } catch (error) {
    console.error('Error fetching lender:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lender' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { lenderId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate the request body
    const validatedData = lenderFormSchema.parse(body)

    // Update the lender
    const updatedLender = await db.lender.update({
      where: {
        id: params.lenderId,
      },
      data: {
        ...omit(validatedData, 'email', 'projectId'), user: validatedData.email ? {
          connectOrCreate: {
            where: { email: validatedData.email },
            create: {
              email: validatedData.email,
              name: validatedData.type === 'PERSON'
                ? `${validatedData.firstName} ${validatedData.lastName}`
                : validatedData.organisationName || '',
              language: Language.de, // Default language
            }
          }
        } : undefined
      },
    })

    return NextResponse.json(updatedLender)
  } catch (error) {
    console.error('Error updating lender:', error)
    return NextResponse.json(
      { error: 'Failed to update lender' },
      { status: 500 }
    )
  }
} 