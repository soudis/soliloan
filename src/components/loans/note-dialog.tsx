'use client'

import { addNote } from '@/app/actions/notes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { noteSchema, type NoteFormData } from '@/lib/schemas/note'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { NoteFormFields } from './note-form-fields'

interface NoteDialogProps {
  loanId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteDialog({
  loanId,
  open,
  onOpenChange,
}: NoteDialogProps) {
  const t = useTranslations('dashboard.notes')
  const commonT = useTranslations('common')
  const queryClient = useQueryClient()

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      text: '',
      public: false,
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await addNote(loanId, {
        text: data.text,
        public: data.public ?? false,
        loan: {
          connect: {
            id: loanId
          }
        }
      })
      if (result.error) {
        throw new Error(result.error)
      }
      toast.success(t('createSuccess'))
      onOpenChange(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['lender'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    } catch (error) {
      console.error('Error creating note:', error)
      toast.error(t('createError'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <NoteFormFields />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">
                {commonT('ui.actions.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 