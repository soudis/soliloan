'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createNoteAction } from '@/actions/notes/mutations/create-note';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { noteSchema } from '@/lib/schemas/note';

import { NoteFormFields } from './note-form-fields';

import type { NoteFormData } from '@/lib/schemas/note';
import type { LoanWithCalculations } from '@/types/loans';
import { useEffect } from 'react';
import z from 'zod';

interface NoteDialogProps {
  lenderId: string;
  loanId?: string;
  loans?: LoanWithCalculations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteDialog({ lenderId, loanId, open, loans, onOpenChange }: NoteDialogProps) {
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
      form.reset();
    }
  }, [open, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    console.log(data);
    const result = await createNoteAction({
      lenderId,
      loanId: data.loanId ?? undefined,
      data,
    });

    if (result?.serverError || result?.validationErrors) {
      toast.error(result.serverError || t('createError'));
      return;
    }
    toast.success(t('createSuccess'));
    onOpenChange(false);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ['lender'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <NoteFormFields loans={loans} loanId={loanId} />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
