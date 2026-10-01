import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TerminationType, TransactionType } from '@prisma/client';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanMonthlyNumbers } from '@/types/dashboard';
import type { HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { computeHistoryTable } from './compute-history-table';

const toDate = new Date(2026, 9, 1, 12, 0, 0);
const depositDate = new Date(2026, 9, 1);
const contractDate = new Date(2026, 9, 8);

const zeroMonth = (deposits: number): LoanMonthlyNumbers => ({
  begin: 0,
  end: deposits,
  withdrawals: 0,
  deposits,
  notReclaimed: 0,
  interestPaid: 0,
  interest: 0,
  interestError: 0,
  interestBaseAmount: deposits,
});

const fieldOptions: EntityFilterFieldOption[] = [
  {
    entity: 'loan',
    field: 'status',
    group: 'loan',
    type: 'select',
    label: 'Status',
  },
];

function depositedBeforeContract(): DashboardLoan {
  return {
    id: 'deposited-early',
    signDate: contractDate,
    firstDepositDate: depositDate,
    terminationType: TerminationType.DURATION,
    terminationDate: null,
    transactions: [
      {
        id: 'tx-1',
        type: TransactionType.DEPOSIT,
        date: depositDate,
        amount: 1000,
      },
    ],
    history: {
      2026: {
        10: zeroMonth(1000),
      },
    },
  } as unknown as DashboardLoan;
}

function signedWithoutDeposit(): DashboardLoan {
  return {
    id: 'signed-only',
    signDate: new Date(2025, 5, 1),
    firstDepositDate: null,
    terminationType: TerminationType.DURATION,
    terminationDate: null,
    transactions: [],
    history: {},
  } as unknown as DashboardLoan;
}

const config: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'yearly',
  periodCount: null,
  columns: [
    {
      id: 'active',
      title: 'Aktive Kredite',
      metric: 'loanCount',
      aggregation: 'cumulative',
      filters: [
        {
          id: 'status-active',
          entity: 'loan',
          field: 'status',
          value: { operator: 'eq', value: 'ACTIVE' },
        },
      ],
    },
    {
      id: 'deposits',
      title: 'Einzahlungen',
      metric: 'deposits',
      aggregation: 'delta',
      filters: [],
    },
  ],
};

describe('computeHistoryTable timeline start', () => {
  it('counts a loan deposited before its contract date as active in the deposit year', () => {
    const result = computeHistoryTable(
      [depositedBeforeContract(), signedWithoutDeposit()],
      config,
      toDate,
      fieldOptions,
      (year, month) => `${year}-${month}`,
      (key) => key,
      'bis jetzt',
    );

    const year = result.cells['2026'];
    assert.ok(year);
    assert.equal(year.active, 1);
    assert.equal(year.deposits, 1000);
  });
});
