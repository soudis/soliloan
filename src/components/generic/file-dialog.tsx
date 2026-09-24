'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { File } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addFileAction } from '@/actions/files/mutations/add-file';
import { updateFileAction } from '@/actions/files/mutations/update-file';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import type { FileFormData } from '@/lib/schemas/file';
import { fileSchema } from '@/lib/schemas/file';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { FileFormFields } from './file-form-fields';

type EditableFile = Pick<File, 'id' | 'name' | 'description' | 'public' | 'loanId'>;

interface FileDialogProps {
  lenderId: string;
  loanId?: string;
  loans?: LoanDetailsWithCalculations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: EditableFile;
  /** Called after a successful upload (not update or cancel). */
  onCreated?: () => void;
}

export function FileDialog({ lenderId, loanId, open, loans, onOpenChange, file, onCreated }: FileDialogProps) {
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

  useEffect(() => {
    if (!open) return;
    if (file) {
      form.reset({
        name: file.name,
        description: file.description ?? '',
        public: file.public,
        loanId: file.loanId,
      });
      return;
    }
    form.reset({
      name: '',
      description: '',
      public: false,
      loanId: loanId ?? null,
    });
  }, [open, file, loanId, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (file) {
        const result = await updateFileAction({
          fileId: file.id,
          data,
        });

        if (result?.serverError || result?.validationErrors) {
          throw new Error(result.serverError || t('updateError'));
        }
        toast.success(t('updateSuccess'));
      } else {
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (!fileInput?.files || fileInput.files.length === 0) {
          toast.error(t('noFileSelected'));
          return;
        }

        const uploaded = fileInput.files[0];
        const arrayBuffer = await uploaded.arrayBuffer();
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
      }

      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['lender'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } catch (error) {
      console.error(file ? 'Error updating file:' : 'Error creating file:', error);
      toast.error(error instanceof Error ? error.message : file ? t('updateError') : t('createError'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{file ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FileFormFields loans={loans} loanId={loanId} editing={Boolean(file)} />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{file ? commonT('ui.actions.save') : commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
