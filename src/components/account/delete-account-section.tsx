'use client';

import { useAction } from 'next-safe-action/hooks';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { resetAccountAction } from '@/actions/account/mutations/reset-account';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function DeleteAccountSection() {
  const t = useTranslations('account.deleteAccount');

  const { execute, isPending } = useAction(resetAccountAction, {
    onSuccess: () => {
      toast.success(t('success'));
      signOut({ callbackUrl: '/auth/login' });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || t('error'));
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending}>
            {t('button')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => execute()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
