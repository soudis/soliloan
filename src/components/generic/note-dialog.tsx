'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createNoteAction } from '@/actions/notes/mutations/create-note';
import { updateNoteAction } from '@/actions/notes/mutations/update-note';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { noteSchema } from '@/lib/schemas/note';

import { NoteFormFields } from './note-form-fields';

import type { NoteFormData } from '@/lib/schemas/note';
import type { LoanWithCalculations } from '@/types/loans';
import type { Note } from '@prisma/client';
import { useEffect } from 'react';
import z from 'zod';

interface NoteDialogProps {
  lenderId: string;
  loanId?: string;
  loans?: LoanWithCalculations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note;
}

export function NoteDialog({ lenderId, loanId, open, loans, onOpenChange, note }: NoteDialogProps) {
  const t = useTranslations('dashboard.notes');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const form = useForm<NoteFormData & { loanId?: string | null }>({
    resolver: zodResolver(noteSchema.extend({ loanId: z.string().nullish() })),
    defaultValues: {
      text: '',
      public: false,
      loanId: loanId ?? null,
    },
  });

  useEffect(() => {
    if (open) {
      if (note) {
        form.reset({
          text: note.text,
          public: note.public,
          loanId: note.loanId,
        });
      } else {
        form.reset({
          text: '',
          public: false,
          loanId: loanId ?? null,
        });
      }
    }
  }, [open, note, loanId, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = note
      ? await updateNoteAction({
          noteId: note.id,
          lenderId,
          loanId: data.loanId ?? undefined,
          data,
        })
      : await createNoteAction({
          lenderId,
          loanId: data.loanId ?? undefined,
          data,
        });

    if (result?.serverError || result?.validationErrors) {
      toast.error(result.serverError || (note ? t('updateError') : t('createError')));
      return;
    }
    toast.success(note ? t('updateSuccess') : t('createSuccess'));
    onOpenChange(false);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ['lender'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <NoteFormFields loans={loans} loanId={loanId} />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{note ? commonT('ui.actions.save') : commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
