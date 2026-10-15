import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Transaction } from '@prisma/client';
import { InterestMethod, InterestPaymentType, LimitationType, PaymentType, TransactionType } from '@prisma/client';

import { type AdditionalFieldConfig, AdditionalFieldType } from '@/lib/schemas/common';
import { createDefaultNotificationsConfig } from '@/types/dashboard-widgets/notifications';

import {
  computeNotifications,
  isCurrentInterestYearVisible,
  missingLenderFields,
  type NotificationLender,
  type NotificationLoan,
  projectHasPflichtfelder,
} from './compute-notifications';
import type { NotificationExtras } from './notification-extras';

const toDate = new Date(2026, 5, 15, 12, 0, 0);
const projectId = 'project-1';

const emptyExtras: NotificationExtras = { importBatchRowCount: 0, investmentTypes: [] };

const project = {
  deInvestmentActCompliance: false,
  lenderRequiredFields: [] as string[],
  lenderAdditionalFields: [] as AdditionalFieldConfig[],
};

function loan(overrides: Partial<NotificationLoan> = {}): NotificationLoan {
  return {
    id: 'loan-1',
    status: 'ACTIVE',
    repayDate: null,
    isSavingsContract: false,
    outstandingDepositsCount: 0,
    interestPaymentType: InterestPaymentType.END,
    interestRate: 4,
    altInterestMethod: InterestMethod.ACT_365_NOCOMPOUND,
    interestMethod: InterestMethod.ACT_365_NOCOMPOUND,
    signDate: new Date(2024, 0, 1),
    amount: 10_000,
    investmentTypeId: null,
    transactions: [],
    ...overrides,
  };
}

function lender(overrides: Partial<NotificationLender> = {}): NotificationLender {
  return {
    id: 'lender-1',
    lenderNumber: 1,
    type: 'PERSON',
    firstName: 'Ada',
    lastName: 'Lovelace',
    organisationName: null,
    titlePrefix: null,
    titleSuffix: null,
    street: 'Street 1',
    zip: '10115',
    place: 'Berlin',
    country: 'DE',
    email: 'ada@example.com',
    telNo: '030',
    additionalFields: {},
    ...overrides,
  };
}

function deposit(date: Date): Transaction {
  return {
    id: 'tx-1',
    loanId: 'loan-interest',
    type: TransactionType.DEPOSIT,
    date,
    amount: 10_000,
    paymentType: PaymentType.BANK,
    lenderNotifiedAt: null,
  };
}

describe('Benachrichtigungen', () => {
  it('shows overdue repayments before today and coming-due ones from today through the window', () => {
    const lines = computeNotifications({
      config: createDefaultNotificationsConfig(),
      toDate,
      projectId,
      project,
      extras: emptyExtras,
      lenders: [],
      loans: [
        loan({ id: 'overdue', repayDate: new Date(2026, 5, 14, 12, 0, 0) }),
        loan({ id: 'today', repayDate: new Date(2026, 5, 15, 12, 0, 0) }),
        loan({ id: 'soon', repayDate: new Date(2026, 6, 10, 12, 0, 0) }),
        loan({ id: 'later', repayDate: new Date(2026, 6, 20, 12, 0, 0) }),
        loan({ id: 'repaid', status: 'REPAID', repayDate: new Date(2026, 5, 1, 12, 0, 0) }),
        loan({ id: 'not-deposited', status: 'NOTDEPOSITED', repayDate: null }),
        loan({
          id: 'savings',
          isSavingsContract: true,
          outstandingDepositsCount: 2,
          status: 'ACTIVE',
        }),
      ],
    });

    const overdue = lines.find((line) => line.kind === 'repayOverdue');
    const soon = lines.find((line) => line.kind === 'repaySoon');
    const notDeposited = lines.find((line) => line.kind === 'notDeposited');
    const savings = lines.find((line) => line.kind === 'savingsRateOpen');

    assert.equal(overdue?.count, 1);
    assert.equal(soon?.count, 2);
    assert.equal(notDeposited?.count, 1);
    assert.equal(savings?.count, 1);
    const overdueFilters =
      overdue && 'href' in overdue
        ? JSON.parse(atob(new URLSearchParams(overdue.href.split('?')[1]).get('filters') ?? ''))
        : [];
    assert.equal(overdueFilters[0]?.value.operator, 'olderThan');
    assert.equal(soon && 'href' in soon ? soon.href.includes('project-1') : false, true);
  });

  it('shows open yearly interest for past years, and for the current year only in December', () => {
    assert.equal(isCurrentInterestYearVisible(new Date(2026, 10, 30)), false);
    assert.equal(isCurrentInterestYearVisible(new Date(2026, 11, 1)), true);

    const interestLoan = loan({
      id: 'loan-interest',
      interestPaymentType: InterestPaymentType.YEARLY,
      transactions: [deposit(new Date(2024, 0, 1))],
    });

    const november = computeNotifications({
      config: createDefaultNotificationsConfig(),
      toDate: new Date(2025, 10, 30, 12, 0, 0),
      projectId,
      project,
      extras: emptyExtras,
      lenders: [],
      loans: [interestLoan],
    }).filter((line) => line.kind === 'openInterest');

    const december = computeNotifications({
      config: createDefaultNotificationsConfig(),
      toDate: new Date(2025, 11, 1, 12, 0, 0),
      projectId,
      project,
      extras: emptyExtras,
      lenders: [],
      loans: [interestLoan],
    }).filter((line) => line.kind === 'openInterest');

    assert.deepEqual(
      november.map((line) => (line.kind === 'openInterest' ? line.year : null)),
      [2024],
    );
    assert.deepEqual(
      december.map((line) => (line.kind === 'openInterest' ? line.year : null)),
      [2024, 2025],
    );
    assert.equal(december[0] && 'href' in december[0] ? december[0].href.includes('year=2024') : false, true);
    assert.equal(december[0] && 'href' in december[0] ? december[0].href.includes('filters=') : false, false);
  });

  it('lists lenders that are missing a required field and skips the kind when none are configured', () => {
    assert.equal(projectHasPflichtfelder(project), false);

    const withEmail = {
      ...project,
      lenderRequiredFields: ['email'],
      lenderAdditionalFields: [
        {
          id: 'note',
          name: 'Notiz',
          type: AdditionalFieldType.TEXT,
          selectOptions: [],
          required: true,
        },
      ],
    };
    assert.equal(projectHasPflichtfelder(withEmail), true);

    const incomplete = lender({ id: 'missing', email: '', additionalFields: { note: '' } });
    assert.deepEqual(
      missingLenderFields(incomplete, withEmail).map((field) => field.kind),
      ['email', 'additional'],
    );

    const lines = computeNotifications({
      config: createDefaultNotificationsConfig(),
      toDate,
      projectId,
      project: withEmail,
      extras: emptyExtras,
      lenders: [incomplete, lender({ id: 'complete', additionalFields: { note: 'ok' } })],
      loans: [],
    });
    const required = lines.find((line) => line.kind === 'requiredFields');
    assert.equal(required?.count, 1);
    assert.equal(
      required?.kind === 'requiredFields' ? required.lenders[0]?.href.includes('/lenders/missing') : false,
      true,
    );
  });

  it('counts an unfinished bank import and an investment type over its limit', () => {
    const lines = computeNotifications({
      config: createDefaultNotificationsConfig(),
      toDate,
      projectId,
      project: { ...project, deInvestmentActCompliance: true },
      lenders: [],
      extras: {
        importBatchRowCount: 4,
        investmentTypes: [{ id: 'type-1', limitationType: LimitationType.NOT_MORE_THAN_N_UNITS, name: null }],
      },
      loans: Array.from({ length: 21 }, (_, index) =>
        loan({
          id: `unit-${index}`,
          investmentTypeId: 'type-1',
          status: 'ACTIVE',
          signDate: new Date(2026, 0, 1),
        }),
      ),
    });

    assert.equal(lines.find((line) => line.kind === 'bankImport')?.count, 4);
    assert.equal(lines.find((line) => line.kind === 'investmentTypeCapacity')?.count, 1);
  });

  it('hides kinds that are turned off', () => {
    const config = createDefaultNotificationsConfig();
    config.enabled.notDeposited = false;
    const lines = computeNotifications({
      config,
      toDate,
      projectId,
      project,
      extras: emptyExtras,
      lenders: [],
      loans: [loan({ status: 'NOTDEPOSITED' })],
    });
    assert.equal(
      lines.find((line) => line.kind === 'notDeposited'),
      undefined,
    );
  });
});
