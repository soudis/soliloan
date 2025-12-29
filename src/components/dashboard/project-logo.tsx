import { Building2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';

interface ProjectLogoProps {
  project?: ProjectWithConfiguration | null;
  className?: string;
  showPlaceholder?: boolean;
}

export function ProjectLogo({ project, className, showPlaceholder = true }: ProjectLogoProps) {
  const logo = project?.configuration?.logo;
  const name = project?.name || '';

  if (logo) {
    // optimize: check if logo is base64 or url. If url, we might need next/image, but img is safer for dynamic sources without config.
    // Assuming base64 or direct ref.
    return <img src={logo} alt={`${name} logo`} className={cn('object-contain', className)} />;
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn('flex items-center justify-center bg-primary/10 text-primary rounded-md', className)}>
      <Building2 className="h-[60%] w-[60%]" />
    </div>
  );
}
