'use client';

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ProjectLogo } from '@/components/dashboard/project-logo';
import { InfoItem } from '@/components/ui/info-item';
import { cn, formatCurrency, formatPercentage, getLenderName } from '@/lib/utils';
import { formatAddressPlace } from '@/lib/utils/format';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

import { BalanceTable } from '../loans/balance-table';
import { LoanStatusBadge } from '../loans/loan-status-badge';
import { LoanTransactions } from '../loans/loan-transactions';

interface LenderLoanAccordionCardProps {
  loan: LoanDetailsWithCalculations;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LenderLoanAccordionCard({ loan, isOpen, onOpenChange }: LenderLoanAccordionCardProps) {
  const t = useTranslations('dashboard.loans');
  const tMy = useTranslations('dashboard.myLoans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const handleToggle = () => {
    onOpenChange(!isOpen);
  };

  const getTerminationModalities = () => {
    switch (loan.terminationType) {
      case 'ENDDATE':
        return `${commonT('enums.loan.terminationType.ENDDATE')} - ${loan.endDate ? format(new Date(loan.endDate), 'PPP', { locale: dateLocale }) : '-'}`;
      case 'TERMINATION':
        if (!loan.terminationPeriod || !loan.terminationPeriodType)
          return `${commonT('enums.loan.terminationType.TERMINATION')} - -`;
        return `${commonT('enums.loan.terminationType.TERMINATION')} - ${loan.terminationPeriod} ${
          loan.terminationPeriodType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
        }`;
      case 'DURATION':
        if (!loan.duration || !loan.durationType) return `${commonT('enums.loan.terminationType.DURATION')} - -`;
        return `${commonT('enums.loan.terminationType.DURATION')} - ${loan.duration} ${
          loan.durationType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
        }`;
      default:
        return '-';
    }
  };

  const lender = loan.lender;
  const lenderName = getLenderName(lender);
  const project = lender.project as ProjectWithConfiguration;

  const contactLines = [
    lenderName,
    [lender.street, lender.addon].filter(Boolean).join(', ') || null,
    lender.zip || lender.place ? formatAddressPlace(lender) : null,
    lender.telNo || null,
    lender.email || null,
  ].filter(Boolean);

  const bankingLines = [lender.iban || null, lender.bic || null].filter(Boolean);

  return (
    <div className="scroll-mt-24 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex w-full items-stretch gap-3 p-4 md:p-5">
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: accordion */}
        <div onClick={handleToggle} className="flex flex-1 flex-col gap-3 cursor-pointer min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <ProjectLogo project={project} className="h-14 w-14 md:h-16 md:w-16 rounded-2xl shadow-sm shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-semibold text-base md:text-lg leading-tight break-words">
                {project.configuration.name}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {t('table.loanNumberShort')} #{loan.loanNumber}
                </span>
                <span>·</span>
                <span>{formatCurrency(loan.amount)}</span>
                <span>·</span>
                <span>{formatPercentage(loan.interestRate)} %</span>
                <span>·</span>
                <span>{format(new Date(loan.signDate), 'PP', { locale: dateLocale })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div>
              <div className="text-xs text-muted-foreground">{tMy('balance')}</div>
              <div className="text-xl font-semibold tabular-nums">{formatCurrency(loan.balance)}</div>
            </div>
            <LoanStatusBadge status={loan.status} />
          </div>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          className="shrink-0 self-center rounded-md p-2 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          <ChevronDown
            className={cn('h-5 w-5 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </button>
      </div>

      {isOpen && (
        <div className="border-t px-4 pb-4 pt-4 md:px-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <InfoItem
                label={t('table.signDate')}
                value={format(new Date(loan.signDate), 'PPP', { locale: dateLocale })}
              />
              <InfoItem
                label={t('table.amount')}
                value={
                  <span>
                    <span className="whitespace-nowrap">{formatCurrency(loan.amount)}</span>{' '}
                    <span className="text-muted-foreground text-sm">{t('table.for')}</span>{' '}
                    <span className="whitespace-nowrap">{formatPercentage(loan.interestRate)} %</span>
                  </span>
                }
              />
              <InfoItem label={t('table.terminationModalities')} value={getTerminationModalities()} />
              {loan.terminationDate && loan.terminationType === 'TERMINATION' && (
                <InfoItem
                  label={t('table.terminationDate')}
                  value={format(new Date(loan.terminationDate), 'PPP', { locale: dateLocale })}
                />
              )}
              {loan.repayDate &&
                loan.status !== 'REPAID' &&
                loan.status !== 'NOTDEPOSITED' &&
                loan.terminationType !== 'ENDDATE' && (
                  <InfoItem
                    label={t('table.repayDate')}
                    value={format(new Date(loan.repayDate), 'PPP', { locale: dateLocale })}
                  />
                )}
              {loan.status === 'REPAID' && loan.transactions.at(-1)?.date && (
                <InfoItem
                  label={t('table.repaidDate')}
                  value={format(new Date(loan.transactions.at(-1)?.date ?? ''), 'PPP', { locale: dateLocale })}
                />
              )}
              <div className="mt-0">
                <BalanceTable className="w-full max-w-none" totals={loan} />
              </div>
            </div>
            <div className="space-y-3 lg:pl-2">
              <InfoItem
                label={tMy('contact')}
                value={
                  contactLines.length > 0 ? (
                    <span className="text-lg font-medium whitespace-pre-line">{contactLines.join('\n')}</span>
                  ) : undefined
                }
                emptyMessage={commonT('ui.status.noResults')}
              />
              <InfoItem
                label={tMy('bankConnection')}
                value={
                  bankingLines.length > 0 ? (
                    <span className="whitespace-pre-line">
                      {lender.iban && <span className="block">{lender.iban}</span>}
                      {lender.bic && <span className="block text-muted-foreground text-sm">{lender.bic}</span>}
                    </span>
                  ) : undefined
                }
                emptyMessage={commonT('ui.status.noResults')}
              />
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <LoanTransactions loanId={loan.id} transactions={loan.transactions} loan={loan} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}
