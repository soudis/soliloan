import type { ReactNode } from 'react';

interface FormLayoutProps {
  title?: string;
  children: ReactNode;
  error?: string | null;
  className?: string;
}

export function FormLayout({ title, children, error, className = '' }: FormLayoutProps) {
  return (
    <div className="space-y-8 ">
      {title && (
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
      )}

      <div className={className}>{children}</div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
