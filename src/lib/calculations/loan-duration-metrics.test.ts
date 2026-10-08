import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DurationType, PaymentType, TerminationType, TransactionType, type Transaction } from '@prisma/client';

import {
  formatTotalRuntime,
  getLoanTimelineStart,
  getTotalRuntimeDays,
  loanStartedOnOrBefore,
} from './loan-duration-metrics';

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

const durationT = (key: string, values?: Record<string, number>) => {
  const count = values?.count ?? 0;
  if (key === 'zeroDays') return '0 Tage';
  if (key === 'years') return count === 1 ? `${count} Jahr` : `${count} Jahre`;
  if (key === 'months') return count === 1 ? `${count} Monat` : `${count} Monate`;
  if (key === 'days') return count === 1 ? `${count} Tag` : `${count} Tage`;
  return key;
};

describe('getTotalRuntimeDays', () => {
  it('is empty for notice-period loans', () => {
    assert.equal(
      getTotalRuntimeDays({
        terminationType: TerminationType.TERMINATION,
        signDate: new Date('2020-01-15'),
        endDate: new Date('2025-01-15'),
        duration: 5,
        durationType: DurationType.YEARS,
      }),
      null,
    );
    assert.equal(
      formatTotalRuntime(
        {
          terminationType: TerminationType.TERMINATION,
          signDate: new Date('2020-01-15'),
        },
        durationT,
      ),
      '–',
    );
  });

  it('measures from the sign date to a fixed end date', () => {
    const loan = {
      terminationType: TerminationType.ENDDATE,
      signDate: new Date('2020-01-15T12:00:00'),
      endDate: new Date('2025-01-15T12:00:00'),
    };

    assert.equal(formatTotalRuntime(loan, durationT), '5 Jahre');
    assert.ok((getTotalRuntimeDays(loan) ?? 0) > 0);
  });

  it('measures a duration from the sign date', () => {
    const loan = {
      terminationType: TerminationType.DURATION,
      signDate: new Date('2020-01-15T12:00:00'),
      duration: 18,
      durationType: DurationType.MONTHS,
    };

    assert.equal(formatTotalRuntime(loan, durationT), '1 Jahr 6 Monate');
    assert.equal(
      getTotalRuntimeDays({
        terminationType: TerminationType.DURATION,
        signDate: new Date('2020-01-15T12:00:00'),
        duration: null,
        durationType: DurationType.MONTHS,
      }),
      null,
    );
  });
});
