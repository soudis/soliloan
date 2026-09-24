'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addFileAction } from '@/actions/files/mutations/add-file';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import type { FileFormData } from '@/lib/schemas/file';
import { fileSchema } from '@/lib/schemas/file';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { FileFormFields } from './file-form-fields';

interface FileDialogProps {
  lenderId: string;
  loanId?: string;
  loans?: LoanDetailsWithCalculations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful upload (not cancel). */
  onCreated?: () => void;
}

export function FileDialog({ lenderId, loanId, open, loans, onOpenChange, onCreated }: FileDialogProps) {
  const t = useTranslations('dashboard.files');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const form = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
    defaultValues: {
      name: '',
      description: '',
      public: false,
      loanId: loanId ?? null,
    },
  });

  const { isSubmitting } = form.formState;
  const submitLock = useRef(false);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      // Get the file from the form
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (!fileInput?.files || fileInput.files.length === 0) {
        toast.error(t('noFileSelected'));
        return;
      }

      const file = fileInput.files[0];

      // Read the file as ArrayBuffer and convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      const result = await addFileAction({
        lenderId,
        loanId: data.loanId ?? undefined,
        data,
        base64Data,
      });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }
      toast.success(t('createSuccess'));
      onCreated?.();
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['lender'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } catch (error) {
      console.error('Error creating file:', error);
      toast.error(error instanceof Error ? error.message : t('createError'));
    } finally {
      submitLock.current = false;
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FileFormFields loans={loans} loanId={loanId} />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? commonT('ui.actions.creating') : commonT('ui.actions.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
