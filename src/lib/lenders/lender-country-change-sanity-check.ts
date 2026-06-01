export const LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID = 'lender-country-change-to-germany';

type LenderCountryChangeSanityCheckInput = {
  deInvestmentActCompliance: boolean;
  isEditMode: boolean;
  initialCountry: string | null | undefined;
  currentCountry: string | null | undefined;
  loanCount: number;
};

export function shouldWarnLenderCountryChangeToGermany({
  deInvestmentActCompliance,
  isEditMode,
  initialCountry,
  currentCountry,
  loanCount,
}: LenderCountryChangeSanityCheckInput): boolean {
  if (!isEditMode || !deInvestmentActCompliance || loanCount < 1) {
    return false;
  }

  const wasNotGermany = initialCountry !== 'DE';
  const isNowGermany = currentCountry === 'DE';

  return wasNotGermany && isNowGermany;
}
