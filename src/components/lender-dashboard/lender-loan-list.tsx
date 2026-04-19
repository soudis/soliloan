'use client';

import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { LoanStatus } from '@/types/loans';

import { LenderLoanAccordionCard } from './lender-loan-accordion-card';

const PAGE_SIZE = 5;

const STATUS_FILTERS: Array<'all' | LoanStatus> = [
  'all',
  LoanStatus.ACTIVE,
  LoanStatus.REPAID,
  LoanStatus.TERMINATED,
  LoanStatus.NOTDEPOSITED,
];

interface LenderLoanListProps {
  loans: LoanDetailsWithCalculations[];
  /** Scroll target when accordion closes (section top: title + filters + list) */
  scrollAnchorRef?: RefObject<HTMLElement | null>;
}

export function LenderLoanList({ loans, scrollAnchorRef }: LenderLoanListProps) {
  const t = useTranslations('dashboard.myLoans');
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [openLoanId, setOpenLoanId] = useState<string | null>(null);
  const [loanIdParam] = useQueryState('loanId', parseAsString);
  const listItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const prevOpenLoanIdRef = useRef<string | null>(null);

  const setListItemRef = useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) {
      listItemRefs.current.set(id, el);
    } else {
      listItemRefs.current.delete(id);
    }
  }, []);

  const sorted = useMemo(
    () => [...loans].sort((a, b) => new Date(b.signDate).getTime() - new Date(a.signDate).getTime()),
    [loans],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((loan) => {
      if (statusFilter !== 'all' && loan.status !== statusFilter) return false;
      if (!q) return true;
      const lender = loan.lender;
      const projectName = lender.project.configuration.name?.toLowerCase() ?? '';
      const hay = [
        String(loan.loanNumber),
        projectName,
        lender.firstName ?? '',
        lender.lastName ?? '',
        lender.organisationName ?? '',
        String(loan.amount),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageLoans = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Deep link ?loanId= — jump to page and open matching loan
  useEffect(() => {
    if (!loanIdParam) return;
    const idx = filtered.findIndex((l) => l.id === loanIdParam);
    if (idx === -1) {
      setOpenLoanId(null);
      return;
    }
    setPage(Math.floor(idx / PAGE_SIZE));
    setOpenLoanId(loanIdParam);
  }, [loanIdParam, filtered]);

  // Close accordion if current loan drops out of filtered list (no URL lock)
  useEffect(() => {
    if (loanIdParam) return;
    if (!openLoanId) return;
    if (!filtered.some((l) => l.id === openLoanId)) {
      setOpenLoanId(null);
    }
  }, [filtered, openLoanId, loanIdParam]);

  // Close when paginating away from the open loan (unless URL pins this loan)
  useEffect(() => {
    if (!openLoanId) return;
    if (loanIdParam === openLoanId) return;
    if (!pageLoans.some((l) => l.id === openLoanId)) {
      setOpenLoanId(null);
    }
  }, [pageLoans, openLoanId, loanIdParam]);

  // Open: scroll card into view. Close: scroll loan section top into view (avoid jump to page top)
  useEffect(() => {
    const prev = prevOpenLoanIdRef.current;
    prevOpenLoanIdRef.current = openLoanId;

    if (prev !== null && openLoanId === null) {
      const id = requestAnimationFrame(() => {
        scrollAnchorRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => cancelAnimationFrame(id);
    }

    if (openLoanId) {
      const id = requestAnimationFrame(() => {
        listItemRefs.current.get(openLoanId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [openLoanId, scrollAnchorRef]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={statusFilter === key ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => {
                setStatusFilter(key);
                setPage(0);
              }}
            >
              {key === 'all' ? t('filter.all') : t(`filter.status.${key}`)}
            </Button>
          ))}
        </div>
        <Input
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="md:max-w-xs"
        />
      </div>

      {pageLoans.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">{t('empty')}</div>
      ) : (
        <ul className="space-y-4">
          {pageLoans.map((loan) => (
            <li key={loan.id} ref={(el) => setListItemRef(loan.id, el)}>
              <LenderLoanAccordionCard
                loan={loan}
                isOpen={openLoanId === loan.id}
                onOpenChange={(open) => {
                  setOpenLoanId(open ? loan.id : null);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
            {t('pagination.prev')}
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('pagination.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
