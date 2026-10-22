import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentType, TerminationType, TransactionType, type Transaction } from '@prisma/client';

import { getLoanTimelineStart, loanStartedOnOrBefore } from './loan-duration-metrics';

const periodEnd = new Date(2026, 9, 1);

function deposit(date: Date): Transaction {
  return {
    id: 'tx-1',
    loanId: 'loan-1',
    type: TransactionType.DEPOSIT,
    date,
    amount: 1000,
    paymentType: PaymentType.BANK,
    lenderNotifiedAt: null,
  };
}

function timelineLoan(overrides: {
  transactions?: Transaction[];
  firstDepositDate?: Date | null;
  signDate?: Date | null;
}) {
  return {
    transactions: [],
    terminationType: TerminationType.DURATION,
    terminationDate: null,
    ...overrides,
  };
}

describe('getLoanTimelineStart', () => {
  it('uses the first deposit when the contract date is later', () => {
    const start = getLoanTimelineStart(
      timelineLoan({
        firstDepositDate: new Date(2026, 9, 1),
        signDate: new Date(2026, 9, 8),
      }),
    );

    assert.equal(
      loanStartedOnOrBefore(
        timelineLoan({
          transactions: [deposit(new Date(2026, 9, 1))],
          signDate: new Date(2026, 9, 8),
        }),
        periodEnd,
      ),
      true,
    );
    assert.equal(start?.getDate(), 1);
  });

  it('falls back to the contract date when there is no deposit', () => {
    const loan = timelineLoan({
      firstDepositDate: null,
      signDate: new Date(2025, 5, 1),
    });

    assert.equal(loanStartedOnOrBefore(loan, periodEnd), true);
    assert.equal(loanStartedOnOrBefore(loan, new Date(2025, 0, 1)), false);
  });

  it('does not fall back to the contract date when the deposit is still in the future', () => {
    const loan = timelineLoan({
      firstDepositDate: new Date(2026, 10, 1),
      signDate: new Date(2026, 0, 1),
    });

    assert.equal(loanStartedOnOrBefore(loan, periodEnd), false);
  });
});
