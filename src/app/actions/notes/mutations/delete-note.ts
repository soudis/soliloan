'use server'

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteNote(loanId: string, noteId: string) {
  try {
    const session = await auth()
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Fetch the loan and note
    const loan = await db.loan.findUnique({
      where: {
        id: loanId
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
        },
        notes: {
          where: {
            id: noteId
          }
        }
      }
    })

    if (!loan) {
      throw new Error('Loan not found')
    }

    const note = loan.notes[0]
    if (!note) {
      throw new Error('Note not found')
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    )

    if (!hasAccess) {
      throw new Error('You do not have access to this loan')
    }

    // Create audit trail entry before deletion
    await createAuditEntry(db, {
      entity: 'note',
      operation: 'DELETE',
      primaryKey: noteId,
      before: removeNullFields(note),
      after: {},
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
      },
      projectId: loan.lender.project.id,
    })

    // Delete the note
    await db.note.delete({
      where: {
        id: noteId
      }
    })

    // Revalidate the loan page
    revalidatePath(`/dashboard/loans/${loanId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting note:', error)
    return { error: error instanceof Error ? error.message : 'Failed to delete note' }
  }
} 