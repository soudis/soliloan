'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { setPassword } from '@/actions/auth';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { userNameSchema } from '@/lib/schemas/account';
import { passwordSchema } from '@/lib/schemas/common';

type SetPasswordFormValues = {
  email: string | null;
  name: string | null;
  password: string;
  confirmPassword: string;
};

interface SetPasswordFormProps {
  token: string;
  requireName: boolean;
  email?: string | null;
}

export function SetPasswordForm({ token, requireName, email = null }: SetPasswordFormProps) {
  const t = useTranslations('auth');
  const tRoot = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().nullable(),
          name: requireName ? userNameSchema : z.string().nullable(),
          password: passwordSchema,
          confirmPassword: passwordSchema,
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: 'validation.account.passwordMismatch',
          path: ['confirmPassword'],
        }),
    [requireName],
  );

  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email,
      name: requireName ? '' : null,
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const result = await setPassword(token, data.password, requireName ? (data.name ?? undefined) : undefined);
      if (result.success) {
        if (requireName && email) {
          const signInResult = await signIn('credentials', {
            email,
            password: data.password,
            redirect: false,
          });
          if (!signInResult?.error) {
            toast.success(t('login.success'));
            router.push('/');
            return;
          }
        }
        toast.success(t('setPassword.success'));
        router.push('/auth/login');
      } else {
        toast.error(
          result.error?.startsWith('validation.') || result.error?.startsWith('error.')
            ? tRoot(result.error)
            : result.error || t('setPassword.error'),
        );
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error(t('setPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {requireName && email ? (
          <FormField name="email" label={t('setPassword.email')} type="email" autoComplete="email" disabled />
        ) : null}
        {requireName ? (
          <FormField
            name="name"
            label={t('setPassword.name')}
            placeholder={t('setPassword.namePlaceholder')}
            autoComplete="name"
            required
          />
        ) : null}
        <FormField
          name="password"
          label={t('setPassword.password')}
          placeholder="********"
          type="password"
          autoComplete="new-password"
        />
        <FormField
          name="confirmPassword"
          label={t('setPassword.confirmPassword')}
          placeholder="********"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('setPassword.submitting') : t('setPassword.submit')}
        </Button>
      </form>
    </Form>
  );
}
