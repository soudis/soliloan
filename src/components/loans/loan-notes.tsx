'use client'

import { deleteNote } from '@/app/actions/notes'
import { Note } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { FileText, Lock, Plus, Trash2, Unlock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { NoteDialog } from './note-dialog'

interface LoanNotesProps {
  loanId: string
  notes: Note[]
}

export function LoanNotes({ loanId, notes }: LoanNotesProps) {
  const t = useTranslations('dashboard.notes')
  const commonT = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await deleteNote(loanId, noteId)
      if (result.error) {
        throw new Error(result.error)
      }
      toast.success(t('deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['lender'] })
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error(t('deleteError'))
    }
  }

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t('title')}</div>
          <Button variant="ghost" size="icon" onClick={() => setIsNoteDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">{commonT('ui.actions.create')}</span>
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between rounded-lg bg-muted/50 p-2">
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-amber-500/20 p-1 mt-1">
                  <FileText className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm">{note.text}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), 'PPP', { locale: dateLocale })}
                    </div>
                    {note.public ? (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Unlock className="h-3 w-3 mr-1" />
                        {t('public')}
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />
                        {t('private')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteNote(note.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">{commonT('ui.actions.delete')}</span>
              </Button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t('noNotes')}
            </div>
          )}
        </div>
      </div>

      <NoteDialog
        loanId={loanId}
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
      />
    </>
  )
} 