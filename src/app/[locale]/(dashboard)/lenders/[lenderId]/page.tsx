'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getLenderById } from '@/app/actions/lenders';
import { deleteLoan } from '@/app/actions/loans';
import { LenderInfoCard } from '@/components/lenders/lender-info-card';
import { LoanSelector } from '@/components/lenders/loan-selector';
import { LoanCard } from '@/components/loans/loan-card';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useLenderLoanSelectionStore } from '@/lib/stores/lender-loan-selection-store';
import { useProject } from '@/store/project-context';

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
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedProject } = useProject();
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();
  const loanT = useTranslations('dashboard.loans');
  const { getSelectedLoanId, setSelectedLoanId } = useLenderLoanSelectionStore();

  // State for responsive max tabs
  const [maxTabs, setMaxTabs] = useState(4); // Default for SSR/initial

  // Get the loan ID to highlight from the URL query parameter or store
  const highlightLoanId = searchParams.get('highlightLoan');

  // Use React Query to fetch lender data
  const {
    data: lender,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lender', resolvedParams.lenderId],
    queryFn: () => fetchLender(resolvedParams.lenderId),
    enabled: !!resolvedParams.lenderId,
  });

  useEffect(() => {
    if (highlightLoanId && lender) {
      setSelectedLoanId(lender.id, highlightLoanId);
      router.replace(`/lenders/${lender.id}`);
    }
  }, [lender, highlightLoanId, setSelectedLoanId, router]);

  // Effect to update maxTabs based on screen size
  useEffect(() => {
    const checkSize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setMaxTabs(4); // lg and up
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setMaxTabs(3); // md and up
      } else {
        setMaxTabs(2); // sm and down
      }
    };

    checkSize(); // Initial check on mount
    window.addEventListener('resize', checkSize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', checkSize);
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const selectedLoanId = getSelectedLoanId(lender?.id ?? '') ?? lender?.loans[0]?.id;

  // Handler for selecting a loan (from tabs or dropdown)
  const handleSelectLoan = (loanId: string) => {
    if (!lender) return;
    setSelectedLoanId(lender.id, loanId);
  };

  // Handler for deleting a loan
  const handleDeleteLoan = async (loanId: string) => {
    const toastId = toast.loading(loanT('delete.loading'));

    try {
      const result = await deleteLoan(loanId);

      if (result.error) {
        toast.error(loanT(`errors.${result.error}`), {
          id: toastId,
        });
      } else {
        toast.success(loanT('delete.success'), {
          id: toastId,
        });
        await queryClient.invalidateQueries({
          queryKey: ['lender', resolvedParams.lenderId],
        });
        // Adjust selection after deletion
        const remainingLoans = lender?.loans.filter((l) => l.id !== loanId) || [];
        const newSelectedLoanId = remainingLoans.length > 0 ? remainingLoans[0].id : '';
        setSelectedLoanId(lender?.id ?? '', newSelectedLoanId);
      }
    } catch (e) {
      toast.error(loanT('delete.error'), {
        id: toastId,
      });
      console.error('Failed to delete loan:', e);
    }
  };

  // Find the currently selected loan object for display
  const selectedLoan = lender?.loans.find((loan) => loan.id === selectedLoanId);

  if (!session || !selectedProject || isLoading || error || !lender) {
    return null;
  }

  const lenderName =
    lender.type === 'PERSON'
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
      : lender.organisationName;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lenderName}</h1>
          <p className="text-muted-foreground">
            #{lender.lenderNumber} · {commonT(`enums.lender.type.${lender.type}`)} · {lender.loans.length}{' '}
            {t('details.loans')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('details.newLoan')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Loan Cards Section - Left side on desktop, bottom on mobile */}
        <div className="w-full lg:w-2/3 space-y-0">
          {lender.loans.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{t('noLoans')}</div>
          ) : (
            <>
              {/* Loan Selection UI: Use the new LoanSelector component */}
              <LoanSelector
                loans={lender.loans}
                selectedLoanId={selectedLoanId}
                onSelectLoan={handleSelectLoan}
                maxTabs={maxTabs}
                commonT={commonT}
                loanT={loanT}
              />

              {/* Loan Card Display - Render only the selected one */}
              <AnimatePresence mode="wait">
                {selectedLoan ? (
                  <motion.div key={selectedLoan.id}>
                    <LoanCard
                      loan={selectedLoan}
                      onEdit={(id) => router.push(`/loans/${id}/edit`)}
                      onDelete={handleDeleteLoan}
                    />
                  </motion.div>
                ) : (
                  // Optional: Show placeholder if no loan is selected and loans exist
                  lender.loans.length > 0 && (
                    <div className="text-center text-muted-foreground py-8">{t('dropdown.selectPrompt')}</div>
                  )
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Lender Information Section - Right side on desktop, top on mobile */}
        <div className="w-full lg:w-1/3 mt-12.5">
          <div className="flex justify-between">
            <h2 className="text-2xl font-semibold mb-4">{t('details.lenderInfo')}</h2>
            <Button variant="outline" size="sm" onClick={() => router.push(`/lenders/${lender.id}/edit`)}>
              <Pencil className="align-self-end" />
              {t('details.edit')}
            </Button>
          </div>
          <LenderInfoCard lender={lender} />
        </div>
      </div>
    </div>
  );
}
