'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Language } from '@prisma/client';
import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { updateProfileAction } from '@/actions/account/mutations/update-profile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { UpdateProfileFormData } from '@/lib/schemas/account';
import { updateProfileSchema } from '@/lib/schemas/account';
import { AccountSettingsFormFields } from './account-settings-form-fields';

interface AccountSettingsFormProps {
  email: string;
  name: string;
  language: Language;
  onSuccess?: () => void;
}

export function AccountSettingsForm({ email, name, language, onSuccess }: AccountSettingsFormProps) {
  const t = useTranslations('account.profile');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UpdateProfileFormData | null>(null);

  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: name ?? '',
      language: language ?? 'de',
    },
  });

  const { execute, isPending } = useAction(updateProfileAction, {
    onSuccess: () => {
      toast.success(t('success'));
      onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || t('error'));
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    setPendingData(data as UpdateProfileFormData);
    setShowConfirm(true);
  });

  const handleConfirm = () => {
    if (pendingData) {
      execute(pendingData);
    }
    setShowConfirm(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1">
            <AccountSettingsFormFields email={email} />
          </div>
          <div className="flex justify-end pt-4 mt-auto">
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirmDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('confirmDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
