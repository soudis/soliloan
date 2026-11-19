import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { transactionFormSchema } from './transaction';

const zahlung = (type: string) => ({ type, date: '2025-03-01', amount: 100, paymentType: 'BANK' });

describe('transactionFormSchema', () => {
  it('accepts a manual Einzahlung', () => {
    assert.equal(transactionFormSchema.safeParse(zahlung('DEPOSIT')).success, true);
  });

  it('rejects a Zinsübertrag, which only an Import books', () => {
    const result = transactionFormSchema.safeParse(zahlung('INTERESTCARRYOVER'));
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.message, 'validation.transaction.importOnly');
  });
});
