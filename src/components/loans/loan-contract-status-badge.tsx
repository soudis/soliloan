import { useTranslations } from 'next-intl';
import type { LoanWithCalculations } from '@/types/loans';
import { Badge } from '../ui/badge';

export const LoanContractStatusBadge = ({ loan }: { loan: LoanWithCalculations }) => {
  const commonT = useTranslations('common');
  return (
    <Badge variant={loan.contractStatus === 'PENDING' ? 'secondary' : 'default'} className="mt-1">
      {commonT(`enums.loan.contractStatus.${loan.contractStatus}`)}
    </Badge>
  );
};
