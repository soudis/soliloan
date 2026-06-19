'use client';

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { ChevronDown, Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ProjectLogo } from '@/components/dashboard/project-logo';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { Button } from '@/components/ui/button';
import { InfoItem } from '@/components/ui/info-item';
import { cn, formatCurrency, formatPercentage, getLenderName } from '@/lib/utils';
import { formatAddressPlace } from '@/lib/utils/format';
import { splitIbanIntoGroups } from '@/lib/utils/iban';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LoanBalanceSummary } from '../loans/loan-balance-summary';
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
  const projectEmail = project.configuration.email;

  const addressLine = [lender.street, lender.addon].filter(Boolean).join(', ') || null;
  const placeLine = lender.zip || lender.place ? formatAddressPlace(lender) : null;
  const hasContact = Boolean(lenderName || addressLine || placeLine || lender.telNo || lender.email);

  const bankingLines = [lender.iban || null, lender.bic || null].filter(Boolean);
  const ibanGroups = lender.iban ? splitIbanIntoGroups(lender.iban) : [];

  return (
    <div className="scroll-mt-24 rounded-lg border border-border bg-card text-card-foreground shadow-none">
      <div className="flex w-full items-stretch gap-3 p-4 md:p-5">
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: accordion */}
        <div onClick={handleToggle} className="flex flex-1 flex-col gap-3 cursor-pointer min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <ProjectLogo project={project} className="h-14 w-14 md:h-16 md:w-16 rounded-2xl border border-border shrink-0" />
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
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: toolbar stops accordion toggle only */}
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="flex items-center gap-2"
            >
              {projectEmail && (
                <Button asChild variant="outline" size="sm" className="h-9 px-3 sm:px-3">
                  <a href={`mailto:${projectEmail}`}>
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:ml-2 sm:inline">{tMy('contact')}</span>
                    <span className="sr-only sm:hidden">{tMy('contact')}</span>
                  </a>
                </Button>
              )}
              <TemplateQuickActions
                lenderSelfService
                projectId={lender.projectId}
                mode="loan"
                lenderId={lender.id}
                loanId={loan.id}
                density="default"
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t pt-3">
            <div>
              <div className="text-xs text-muted-foreground">{tMy('balance')}</div>
              <div className="text-xl font-semibold tabular-nums">{formatCurrency(loan.balance)}</div>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden
            />
            <div className="justify-self-end">
              <LoanStatusBadge status={loan.status} />
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <>
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
              </div>
              <div className="space-y-3 lg:pl-2">
                <InfoItem
                  label={tMy('contact')}
                  value={
                    hasContact ? (
                      <div className="leading-tight space-y-0.5">
                        {lenderName && <span className="block text-lg font-medium">{lenderName}</span>}
                        {addressLine && <span className="block text-sm">{addressLine}</span>}
                        {placeLine && <span className="block text-sm">{placeLine}</span>}
                        {lender.telNo && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            {lender.telNo}
                          </span>
                        )}
                        {lender.email && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            {lender.email}
                          </span>
                        )}
                      </div>
                    ) : undefined
                  }
                  emptyMessage={commonT('ui.status.noResults')}
                />
                <InfoItem
                  label={tMy('bankConnection')}
                  value={
                    bankingLines.length > 0 ? (
                      <span className="whitespace-pre-line">
                        {lender.iban && (
                          <span className="flex flex-wrap gap-x-1 font-mono">
                            {ibanGroups.map((group, index) => (
                              <span key={`${ibanGroups.slice(0, index).join('')}-${group}`}>{group}</span>
                            ))}
                          </span>
                        )}
                        {lender.bic && <span className="block text-muted-foreground text-sm">{lender.bic}</span>}
                      </span>
                    ) : undefined
                  }
                  emptyMessage={commonT('ui.status.noResults')}
                />
              </div>
            </div>
          </div>

          <div className="border-t pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
              <div className="space-y-1 px-4 py-4 md:px-5">
                <LoanTransactions
                  loanId={loan.id}
                  transactions={loan.transactions}
                  loan={loan}
                  readOnly
                  showBalanceSummary={false}
                  showAddTransaction={false}
                />
              </div>
              <div className="flex min-h-0 flex-col border-t border-border lg:border-t-0 lg:border-l lg:border-border">
                <div className="flex flex-1 flex-col space-y-3 px-4 pb-4 pt-4 md:px-5 lg:py-4 lg:pl-6 lg:pr-4">
                  <LoanBalanceSummary loan={loan} readOnly />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
