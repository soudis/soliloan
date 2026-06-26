import { parseAsBoolean, parseAsString } from 'nuqs';

import { tableUrlNuqsOptions, tableUrlParsers } from '@/lib/table-url-parsers';
import {
  DEFAULT_TRANSACTION_TIME_RANGE,
  getDefaultTransactionCustomFrom,
  getDefaultTransactionCustomTo,
} from '@/lib/transactions/transaction-time-range';

export const transactionTableUrlParsers = {
  ...tableUrlParsers,
  txRange: parseAsString.withDefault(DEFAULT_TRANSACTION_TIME_RANGE),
  txRangeFrom: parseAsString.withDefault(getDefaultTransactionCustomFrom()),
  txRangeTo: parseAsString.withDefault(getDefaultTransactionCustomTo()),
  includeInterest: parseAsBoolean.withDefault(false),
} as const;

export { tableUrlNuqsOptions as transactionTableUrlNuqsOptions };

export type TransactionTableExtraViewData = {
  txRange: string;
  txRangeFrom: string;
  txRangeTo: string;
  includeInterest: boolean;
};

export function parseTransactionExtraViewData(
  data: Record<string, unknown> | undefined,
): TransactionTableExtraViewData {
  return {
    txRange: typeof data?.txRange === 'string' ? data.txRange : DEFAULT_TRANSACTION_TIME_RANGE,
    txRangeFrom: typeof data?.txRangeFrom === 'string' ? data.txRangeFrom : getDefaultTransactionCustomFrom(),
    txRangeTo: typeof data?.txRangeTo === 'string' ? data.txRangeTo : getDefaultTransactionCustomTo(),
    includeInterest: data?.includeInterest === true,
  };
}
