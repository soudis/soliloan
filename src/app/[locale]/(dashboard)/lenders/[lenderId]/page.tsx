'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';

import { getLenderById } from '@/actions/lenders';
import { LenderPage } from '@/components/lenders/lender-page';

// Function to fetch lender data using the server action
const fetchLender = async (lenderId: string) => {
  const result = await getLenderById(lenderId);

  if ('error' in result) {
    throw new Error(result.error);
  }

  return result.lender;
};

export default function LenderDetailsPage({
  params,
}: {
  params: Promise<{ lenderId: string }>;
}) {
  const resolvedParams = use(params);

  const {
    data: lender,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lender', resolvedParams.lenderId],
    queryFn: () => fetchLender(resolvedParams.lenderId),
    enabled: !!resolvedParams.lenderId,
  });

  if (isLoading || error || !lender) {
    return null;
  }

  return <LenderPage lender={lender} />;
}
