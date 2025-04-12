"use server"
import { db } from '@/lib/db'

export async function getLendersByProjectId(projectId: string) {
  try {
    const lenders = await db.lender.findMany({
      where: {
        projectId
      },
      orderBy: {
        lenderNumber: 'asc'
      }
    })

    return { lenders, error: null }
  } catch (error) {
    console.error('Error fetching lenders by project ID:', error)
    return { lenders: [], error: 'Failed to fetch lenders' }
  }
} 