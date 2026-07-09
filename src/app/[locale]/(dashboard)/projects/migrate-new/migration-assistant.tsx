'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { migrateProjectAction } from '@/actions/projects/mutations/migrate-project';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { MigrationReport } from '@/lib/migration/types';
import { type MigrationFormData, migrationFormSchema } from '@/lib/schemas/migration';

import { MigrationReportView } from './migration-report';

interface MigrationAssistantProps {
  defaultAnonymize: boolean;
}

export function MigrationAssistant({ defaultAnonymize }: MigrationAssistantProps) {
  const t = useTranslations('dashboard.migration');
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<MigrationFormData>({
    resolver: zodResolver(migrationFormSchema),
    defaultValues: {
      baseUrl: '',
      accessToken: '',
      anonymize: defaultAnonymize,
    },
  });

  const { execute, isPending } = useAction(migrateProjectAction, {
    onSuccess: ({ data }) => {
      if (data) {
        if (data.success) {
          setError(null);
          setReport(data);
        } else {
          setError(data.error ?? t('error.unknown'));
        }
      }
    },
    onError: ({ error }) => {
      setError(error.serverError ?? t('error.unknown'));
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    setError(null);
    setReport(null);
    execute(data);
  });

  if (report) {
    return (
      <div>
        <MigrationReportView report={report} />
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setReport(null);
            form.reset({
              baseUrl: '',
              accessToken: '',
              anonymize: defaultAnonymize,
            });
          }}
        >
          {t('newMigration')}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('report.failed')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="baseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.baseUrl')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="url"
                  placeholder="https://direktkreditverwaltung.de/project"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accessToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.accessToken')}</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormCheckbox
          name="anonymize"
          label={t('form.anonymize')}
          hint={t('form.anonymizeHint')}
          disabled={isPending}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('form.migrating')}
            </>
          ) : (
            t('form.submit')
          )}
        </Button>
      </form>
    </Form>
  );
}
