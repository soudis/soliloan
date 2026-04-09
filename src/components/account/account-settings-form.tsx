'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Language } from '@prisma/client';
import { useAction } from 'next-safe-action/hooks';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { updateProfileAction } from '@/actions/account/mutations/update-profile';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { UpdateProfileFormData } from '@/lib/schemas/account';
import { updateProfileSchema } from '@/lib/schemas/account';
import { AccountSettingsFormFields } from './account-settings-form-fields';

interface AccountSettingsFormProps {
  name: string;
  language: Language;
  onSuccess?: () => void;
}

export function AccountSettingsForm({ name, language, onSuccess }: AccountSettingsFormProps) {
  const t = useTranslations('account.profile');

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
    execute(data as UpdateProfileFormData);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <AccountSettingsFormFields />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
