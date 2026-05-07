'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { changePasswordAction } from '@/actions/account/mutations/change-password';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { ChangePasswordFormData } from '@/lib/schemas/account';
import { changePasswordSchema } from '@/lib/schemas/account';

export function ChangePasswordForm() {
  const t = useTranslations('account.password');

  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { execute, isPending } = useAction(changePasswordAction, {
    onSuccess: () => {
      toast.success(t('success'));
      form.reset();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || t('error'));
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    execute(data as ChangePasswordFormData);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField
            name="currentPassword"
            label={t('currentPassword')}
            placeholder={t('currentPasswordPlaceholder')}
            type="password"
          />
          <FormField
            name="newPassword"
            label={t('newPassword')}
            placeholder={t('newPasswordPlaceholder')}
            type="password"
          />
          <FormField
            name="confirmPassword"
            label={t('confirmPassword')}
            placeholder={t('confirmPasswordPlaceholder')}
            type="password"
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
