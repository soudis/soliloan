'use client';

import { Badge } from '@/components/ui/badge';
import { LoanStatus } from '@/types/loans';
import type { useTranslations } from 'next-intl';

interface LoanStatusBadgeProps {
  status: LoanStatus;
  commonT: ReturnType<typeof useTranslations<string>>;
  className?: string;
}

export function LoanStatusBadge({ status, commonT, className }: LoanStatusBadgeProps) {
  return (
    <Badge
      variant={
        status === LoanStatus.ACTIVE
          ? 'default'
          : status === LoanStatus.TERMINATED
            ? 'destructive'
            : status === LoanStatus.NOTDEPOSITED
              ? 'secondary'
              : 'outline'
      }
      className={`text-xs px-1.5 py-0.5 ${className}`}
    >
      {commonT(`enums.loan.status.${status}`)}
    </Badge>
  );
}
