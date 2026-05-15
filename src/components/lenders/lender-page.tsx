'use client';

import { BarChart3, Files as FilesIcon, User, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { LenderDetailsWithCalculations } from '@/types/lenders';
import { LenderContactSection } from './lender-contact-section';
import { LenderFinancialsSection } from './lender-financials-section';
import { LenderLoansSection } from './lender-loans-section';
import { LenderNotesFilesSection } from './lender-notes-files-section';
import { LenderPageHeader } from './lender-page-header';
import { SectionNavBar, type SectionNavItem, SectionNavSidebar } from './section-nav';

type Props = {
  lender: LenderDetailsWithCalculations;
};

export const LenderPage = ({ lender }: Props) => {
  const t = useTranslations('dashboard.lenders.lenderPage');

  const totalNotes =
    lender.notes.length +
    lender.loans.reduce(
      (acc, loan) => acc + loan.notes.filter((n) => !lender.notes.some((ln) => ln.id === n.id)).length,
      0,
    );
  const totalFiles =
    lender.files.length +
    lender.loans.reduce(
      (acc, loan) => acc + loan.files.filter((f) => !lender.files.some((lf) => lf.id === f.id)).length,
      0,
    );

  const navItems: SectionNavItem[] = useMemo(
    () => [
      {
        id: 'contact',
        label: t('sections.contact'),
        icon: <User className="h-4 w-4" />,
      },
      {
        id: 'financials',
        label: t('sections.financials'),
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: 'loans',
        label: t('sections.loans'),
        icon: <Wallet className="h-4 w-4" />,
        count: lender.loans.length,
      },
      {
        id: 'notes-files',
        label: t('sections.notesFiles'),
        icon: <FilesIcon className="h-4 w-4" />,
        count: totalNotes + totalFiles,
      },
    ],
    [t, lender.loans.length, totalNotes, totalFiles],
  );

  return (
    <div className="flex flex-col gap-6 mb-256">
      <LenderPageHeader lender={lender} />

      {/* Mobile/Tablet: horizontal nav bar */}
      <SectionNavBar items={navItems} />

      <div className="flex gap-8">
        {/* Desktop: sticky sidebar nav */}
        <SectionNavSidebar items={navItems} />

        <div className="flex-1 min-w-0 flex flex-col gap-8">
          <LenderContactSection lender={lender} />
          <LenderFinancialsSection lender={lender} />
          <LenderLoansSection lender={lender} />
          <LenderNotesFilesSection lender={lender} />
        </div>
      </div>
    </div>
  );
};
