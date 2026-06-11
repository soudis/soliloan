'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { useFormSanityChecksOptional } from '@/components/form/form-sanity-checks-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { FormWarning } from '@/types/form-warnings';

interface FormActionsProps {
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  isLoading?: boolean;
  onCancel?: () => void;
  children?: ReactNode;
  warnings?: FormWarning[];
}

export function FormActions({
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  isLoading,
  onCancel,
  children,
  warnings = [],
}: FormActionsProps) {
  const hasWarnings = warnings.length > 0;

  return (
    <div className="flex flex-col items-end gap-4 pt-8 pb-0">
      {hasWarnings && (
        <div className="flex w-full flex-col items-end gap-2">
          {warnings.map((warning) => (
            <Alert
              key={warning.id}
              className="!ml-auto !inline-grid !w-auto max-w-lg border-amber-500/50 text-amber-950 dark:text-amber-50"
            >
              <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="min-w-0 text-amber-950 dark:text-amber-50">
                {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      <div className="flex space-x-4">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onCancel || (() => window.history.back())}
          disabled={isLoading}
        >
          {cancelButtonText}
        </Button>
        {children}
        <Button type="submit" disabled={isLoading} size="lg">
          {hasWarnings && !isLoading && <AlertTriangle className="text-white" />}
          {isLoading ? submittingButtonText : submitButtonText}
        </Button>
      </div>
    </div>
  );
}

export function FormActionsWithSanityWarnings(props: Omit<FormActionsProps, 'warnings'>) {
  const sanityChecksContext = useFormSanityChecksOptional();

  return <FormActions {...props} warnings={sanityChecksContext?.warnings ?? []} />;
}
