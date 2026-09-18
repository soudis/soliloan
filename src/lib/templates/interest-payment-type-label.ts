import { createTranslator } from 'next-intl';

import deCommonMessages from '@/messages/de/common.json';

const tInterestPaymentType = createTranslator({
  locale: 'de',
  messages: deCommonMessages,
  namespace: 'enums.loan.interestPaymentType',
});

export function interestPaymentTypeLabel(paymentType: string | null | undefined) {
  if (paymentType !== 'YEARLY' && paymentType !== 'END') return '';
  return tInterestPaymentType(paymentType);
}
