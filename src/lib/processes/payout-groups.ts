import type { TransactionType } from '@prisma/client';

export type PayoutGrouping = 'lender' | 'transaction';

export const OUTBOUND_SEPA_TYPES = ['INTERESTPAYMENT', 'WITHDRAWAL', 'TERMINATION'] as const;

export type OutboundSepaType = (typeof OUTBOUND_SEPA_TYPES)[number];

export function isOutboundSepaType(type: string): type is OutboundSepaType {
  return (OUTBOUND_SEPA_TYPES as readonly string[]).includes(type);
}

export type PayoutRow = {
  id: string;
  loanId: string;
  loanNumber: number;
  lenderId: string;
  lenderName: string;
  iban: string | null;
  bic: string | null;
  type: TransactionType;
  /** Positive amount in EUR. */
  amount: number;
  /** Calendar year used in the purpose text. */
  year: number;
};

export type CreditorGap = 'iban' | 'name';

export type DebtorGap = 'name' | 'iban' | 'bic';

export type PayoutGroup = {
  key: string;
  lenderId: string;
  lenderName: string;
  iban: string | null;
  bic: string | null;
  rows: PayoutRow[];
  amount: number;
  purpose: string;
  missing: CreditorGap[];
};

const TYPE_ORDER: Record<string, number> = {
  INTERESTPAYMENT: 0,
  WITHDRAWAL: 1,
  TERMINATION: 2,
};

export function projectSepaGaps(configuration: {
  name?: string | null;
  iban?: string | null;
  bic?: string | null;
}): DebtorGap[] {
  const gaps: DebtorGap[] = [];
  if (!configuration.name?.trim()) gaps.push('name');
  if (!configuration.iban?.trim()) gaps.push('iban');
  if (!configuration.bic?.trim()) gaps.push('bic');
  return gaps;
}

export function creditorGaps(row: Pick<PayoutRow, 'iban' | 'lenderName'>): CreditorGap[] {
  const missing: CreditorGap[] = [];
  if (!row.lenderName.trim()) missing.push('name');
  if (!row.iban?.trim()) missing.push('iban');
  return missing;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Purpose for one SEPA transfer or GiroCode. A single-loan group always includes the loan number. */
export function payoutPurpose(rows: PayoutRow[]): string {
  const loanNumbers = [...new Set(rows.map((row) => row.loanNumber))];
  const years = new Set(rows.map((row) => row.year));
  const interestOnly = rows.length > 0 && rows.every((row) => row.type === 'INTERESTPAYMENT');
  const year = rows[0]?.year;
  const kind = interestOnly && years.size === 1 && year != null ? `Zinsen ${year}` : 'Auszahlung';
  if (loanNumbers.length === 1 && loanNumbers[0] != null) {
    return `Direktkredit #${loanNumbers[0]} - ${kind}`;
  }
  return kind;
}

export function groupPayoutRows(rows: PayoutRow[], grouping: PayoutGrouping, splitByType: boolean): PayoutGroup[] {
  const buckets = new Map<string, PayoutRow[]>();

  if (grouping === 'transaction') {
    for (const row of rows) {
      buckets.set(row.id, [row]);
    }
  } else {
    for (const row of rows) {
      const key = splitByType ? `${row.lenderId}:${row.type}` : row.lenderId;
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }
  }

  return [...buckets.entries()]
    .map(([key, groupRows]) => {
      const first = groupRows[0];
      if (!first) {
        return null;
      }
      return {
        key,
        lenderId: first.lenderId,
        lenderName: first.lenderName,
        iban: first.iban,
        bic: first.bic,
        rows: groupRows,
        amount: roundMoney(groupRows.reduce((sum, row) => sum + row.amount, 0)),
        purpose: payoutPurpose(groupRows),
        missing: creditorGaps(first),
      };
    })
    .filter((group): group is PayoutGroup => group !== null)
    .sort((a, b) => {
      const byName = a.lenderName.localeCompare(b.lenderName, 'de');
      if (byName !== 0) return byName;
      const aType = TYPE_ORDER[a.rows[0]?.type ?? ''] ?? 9;
      const bType = TYPE_ORDER[b.rows[0]?.type ?? ''] ?? 9;
      return aType - bType;
    });
}
