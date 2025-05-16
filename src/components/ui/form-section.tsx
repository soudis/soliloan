import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`rounded-lg border bg-card/50 p-6 space-y-6 ${className}`}>
      <h2 className="text-lg font-medium text-muted-foreground border-b pb-2">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
