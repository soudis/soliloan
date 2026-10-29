import { type Loan, SavingsRateType } from '@prisma/client';

export type SavingsLoan = Pick<
  Loan,
  | 'amount'
  | 'signDate'
  | 'isSavingsContract'
  | 'savingsRateType'
  | 'savingsMonthlyAmount'
  | 'savingsDepositCount'
  | 'savingsFirstDepositDate'
  | 'savingsLastDepositDate'
>;

/** A fixed rate savings loan whose monthly amount times deposit count equals the loan amount. */
export function makeSavingsLoan(overrides: Partial<SavingsLoan> = {}): SavingsLoan {
  return {
    amount: 10000,
    signDate: new Date('2023-01-01'),
    isSavingsContract: true,
    savingsRateType: SavingsRateType.FIXED,
    savingsMonthlyAmount: 1000,
    savingsDepositCount: 10,
    savingsFirstDepositDate: new Date('2023-01-15'),
    savingsLastDepositDate: null,
    ...overrides,
  };
}
