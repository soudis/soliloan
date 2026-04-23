import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionCard } from '../generic/section-card';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  /** Kurzer erklärender Text unter dem Abschnittstitel */
  description?: string | ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Erweitert den Standard-Container (`space-y-4`), z. B. für volle Kartenhöhe im Grid */
  innerClassName?: string;
}

export function FormSection({
  title,
  description,
  children,
  icon,
  className,
  contentClassName,
  innerClassName,
}: FormSectionProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      icon={icon ?? <Info className="h-4 w-4 text-muted-foreground" />}
      className={className}
      contentClassName={contentClassName}
    >
      <div className={cn('space-y-4', innerClassName)}>{children}</div>
    </SectionCard>
  );
}
