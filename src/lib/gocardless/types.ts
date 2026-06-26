/**
 * Types for the GoCardless Bank Account Data API.
 * See https://developer.gocardless.com/bank-account-data/endpoints
 */

export type GoCardlessTokenResponse = {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
};

export type GoCardlessInstitution = {
  id: string;
  name: string;
  bic?: string;
  transaction_total_days?: string;
  countries: string[];
  logo?: string;
  max_access_valid_for_days?: string;
};

/** Requisition status codes returned by GoCardless. */
export type GoCardlessRequisitionStatus =
  | 'CR' // Created
  | 'GC' // Giving consent
  | 'UA' // Undergoing authentication
  | 'RJ' // Rejected
  | 'SA' // Selecting accounts
  | 'GA' // Granting access
  | 'LN' // Linked
  | 'EX'; // Expired

export type GoCardlessAgreement = {
  id: string;
  created?: string;
  max_historical_days: number;
  access_valid_for_days: number;
  access_scope: string[];
  /** ISO datetime when the end user accepted the agreement. Empty until accepted. */
  accepted: string;
  institution_id: string;
};

export type GoCardlessRequisition = {
  id: string;
  created?: string;
  redirect: string;
  status: GoCardlessRequisitionStatus;
  institution_id: string;
  agreement?: string;
  reference?: string;
  accounts: string[];
  user_language?: string;
  link: string;
};

export type GoCardlessAccountDetails = {
  account: {
    iban?: string;
    bban?: string;
    currency?: string;
    ownerName?: string;
    name?: string;
    displayName?: string;
    product?: string;
  };
};

export type GoCardlessBankTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount?: {
    amount: string;
    currency: string;
  };
  debtorName?: string;
  debtorAccount?: { iban?: string };
  creditorName?: string;
  creditorAccount?: { iban?: string };
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
};

export type GoCardlessAccountTransactionsResponse = {
  transactions: {
    booked: GoCardlessBankTransaction[];
    pending?: GoCardlessBankTransaction[];
  };
};

/** Normalized bank transaction row used for import matching and persistence. */
export type ParsedBankTransaction = {
  bankTransactionId: string;
  bookingDate: Date;
  valueDate: Date | null;
  amount: number;
  currency: string;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  remittanceInfo: string | null;
  raw: GoCardlessBankTransaction;
};
