import { getLenderName } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';

export function getLenderAddress(lender: LenderWithCalculations): string {
  return [lender.street, lender.addon, lender.zip, lender.place].filter(Boolean).join(' ');
}

export function getLenderBanking(lender: LenderWithCalculations): string {
  return [lender.iban, lender.bic].filter(Boolean).join(' ');
}

export function getLenderFilterValue(lender: LenderWithCalculations, field: string): unknown {
  if (field.startsWith('additionalFields.')) {
    const key = field.replace('additionalFields.', '');
    return lender.additionalFields?.[key];
  }

  switch (field) {
    case 'lenderNumber':
      return lender.lenderNumber;
    case 'type':
      return lender.type;
    case 'name':
      return getLenderName(lender);
    case 'email':
      return lender.email;
    case 'telNo':
      return lender.telNo;
    case 'address':
      return getLenderAddress(lender);
    case 'banking':
      return getLenderBanking(lender);
    case 'salutation':
      return lender.salutation;
    case 'notificationType':
      return lender.notificationType;
    case 'amount':
    case 'balance':
    case 'deposits':
    case 'withdrawals':
    case 'notReclaimed':
    case 'interest':
    case 'interestPaid':
      return lender[field];
    default:
      return undefined;
  }
}
