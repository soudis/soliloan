'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { LoanStatus } from '@/types/loans';

interface LoanStatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

export function LoanStatusBadge({ status, className }: LoanStatusBadgeProps) {
  const commonT = useTranslations('common');

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
      className={`mt-1 ${className}`}
    >
      {commonT(`enums.loan.status.${status}`)}
    </Badge>
  );
}
