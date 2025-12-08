'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addNoteAction } from '@/actions/notes/mutations/add-note';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { noteSchema } from '@/lib/schemas/note';

import { NoteFormFields } from './note-form-fields';

import type { NoteFormData } from '@/lib/schemas/note';

interface NoteDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteDialog({ loanId, open, onOpenChange }: NoteDialogProps) {
  const t = useTranslations('dashboard.notes');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      text: '',
      public: false,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = await addNoteAction({ loanId, data });
    if (result?.serverError || result?.validationErrors) {
      toast.error(t('createError'));
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
            <NoteFormFields />

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
