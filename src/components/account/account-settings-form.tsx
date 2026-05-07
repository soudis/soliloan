'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Language } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateProfileAction } from '@/actions/account/mutations/update-profile';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { UpdateProfileFormData } from '@/lib/schemas/account';
import { updateProfileSchema } from '@/lib/schemas/account';
import { AccountSettingsFormFields } from './account-settings-form-fields';

interface AccountSettingsFormProps {
  email: string;
  name: string;
  language: Language;
}

export function AccountSettingsForm({ email, name, language }: AccountSettingsFormProps) {
  const t = useTranslations('account.profile');
  const { update } = useSession();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: name ?? '',
      language: language ?? 'de',
    },
  });

  const { execute, isPending } = useAction(updateProfileAction, {
    onSuccess: async ({ input }) => {
      await update({
        user: {
          name: input.name,
          language: input.language,
        },
      });
      router.refresh();
      toast.success(t('success'));
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
  );
}
