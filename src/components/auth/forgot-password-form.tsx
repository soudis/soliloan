'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { requestPasswordReset } from '@/actions/auth';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

// Define the form schema
const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const result = await requestPasswordReset(data.email);
      if (result.success) {
        toast.success(t('forgotPassword.success'));
      } else {
        toast.error(result.error || t('forgotPassword.error'));
      }
    } catch (error) {
      console.error('Error requesting password reset:', error);
      toast.error(t('forgotPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="email" label={t('login.email')} placeholder={t('login.email')} type="email" />
        <div className="flex items-center justify-between">
          <Link href="/auth/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </Button>
      </form>
    </Form>
  );
}
