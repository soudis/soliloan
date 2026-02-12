import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionCard } from '../generic/section-card';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function FormSection({ title, children, icon }: FormSectionProps) {
  return (
    <SectionCard title={title} icon={icon ?? <Info className="h-4 w-4 text-muted-foreground" />}>
      <div className="space-y-4">{children}</div>
    </SectionCard>
  );
}
