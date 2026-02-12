import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  isLoading?: boolean;
  onCancel?: () => void;
  children?: ReactNode;
}

export function FormActions({
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  isLoading,
  onCancel,
  children,
}: FormActionsProps) {
  return (
    <div className="flex justify-end space-x-4 py-8">
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
        {isLoading ? submittingButtonText : submitButtonText}
      </Button>
    </div>
  );
}
