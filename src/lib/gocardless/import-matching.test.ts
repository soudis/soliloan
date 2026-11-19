import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LoanStatus, type LoanWithCalculations } from '@/types/loans';
import { isDepositEligible } from './import-matching';

const loan = (overrides: Partial<LoanWithCalculations>) =>
  ({
    status: LoanStatus.ACTIVE,
    amount: 1000,
    deposits: 0,
    withdrawals: 0,
    notReclaimed: 0,
    ...overrides,
  }) as LoanWithCalculations;

describe('isDepositEligible', () => {
  it('accepts a deposit up to the free amount under the Kreditbetrag', () => {
    assert.equal(isDepositEligible(loan({ deposits: 400 }), 600), true);
    assert.equal(isDepositEligible(loan({ deposits: 400 }), 601), false);
  });

  it('counts the freed amount after a withdrawal (#207)', () => {
    // 1.000 € deposited, 300 € paid back: 300 € can be paid in again
    assert.equal(isDepositEligible(loan({ deposits: 1000, withdrawals: -300 }), 300), true);
    assert.equal(isDepositEligible(loan({ deposits: 1000, withdrawals: -300 }), 301), false);
  });

  it('counts a waived amount like a withdrawal', () => {
    assert.equal(isDepositEligible(loan({ deposits: 1000, notReclaimed: -100 }), 100), true);
  });

  it('rejects a fully paid in Kredit and repaid or terminated ones', () => {
    assert.equal(isDepositEligible(loan({ deposits: 1000 }), 1), false);
    assert.equal(isDepositEligible(loan({ status: LoanStatus.REPAID }), 100), false);
    assert.equal(isDepositEligible(loan({ status: LoanStatus.TERMINATED }), 100), false);
  });
});
