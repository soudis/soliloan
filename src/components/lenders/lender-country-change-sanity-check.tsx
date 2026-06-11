'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormSanityChecks } from '@/components/form/form-sanity-checks-provider';
import type { LenderFormData } from '@/lib/schemas/lender';
import { useProject } from '../providers/project-provider';

const LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID = 'lender-country-change-to-germany';

interface LenderCountryChangeSanityCheckProps {
  initialCountry: string | null | undefined;
  loanCount: number;
}

export function LenderCountryChangeSanityCheck({ initialCountry, loanCount }: LenderCountryChangeSanityCheckProps) {
  const t = useTranslations('dashboard.lenders.sanityChecks');
  const { project } = useProject();
  const { setWarning } = useFormSanityChecks();
  const form = useFormContext<LenderFormData>();
  const country = form.watch('country');

  useEffect(() => {
    const shouldWarn =
      project.configuration.deInvestmentActCompliance && loanCount > 0 && initialCountry !== 'DE' && country === 'DE';

    if (!shouldWarn) {
      setWarning(LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID, null);
      return;
    }

    setWarning(LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID, {
      id: LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID,
      message: t('countryChangeToGermany'),
    });

    return () => setWarning(LENDER_COUNTRY_CHANGE_TO_GERMANY_WARNING_ID, null);
  }, [country, initialCountry, loanCount, project.configuration.deInvestmentActCompliance, setWarning, t]);

  return null;
}
