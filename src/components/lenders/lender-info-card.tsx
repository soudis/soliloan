'use client'

import { LoanCalculations } from '@/components/loans/loan-calculations'
import { Card, CardContent } from '@/components/ui/card'
import { InfoItem } from '@/components/ui/info-item'
import { LenderWithCalculations } from '@/types/lenders'
import { useTranslations } from 'next-intl'

interface LenderInfoCardProps {
  lender: LenderWithCalculations;
}

export function LenderInfoCard({ lender }: LenderInfoCardProps) {
  const t = useTranslations('dashboard.lenders')

  const lenderName = lender.type === 'PERSON'
    ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
    : lender.organisationName

  // Check if we have any contact information
  const hasContactInfo = lender.email || lender.telNo

  // Check if we have any address information
  const hasAddressInfo = lender.street || lender.addon || lender.zip || lender.place || lender.country

  // Check if we have any banking information
  const hasBankingInfo = lender.iban || lender.bic

  // Check if we have any loan calculations
  const hasLoanCalculations = lender.balance !== undefined || lender.withdrawals !== undefined ||
    lender.deposits !== undefined || lender.notReclaimed !== undefined ||
    lender.interestPaid !== undefined || lender.interest !== undefined ||
    lender.interestError !== undefined

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Name Information */}
        {lenderName && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label={t('table.name')}
              value={lenderName}
              showCopyButton={true}
            />
          </div>
        )}

        {/* Contact Information */}
        {hasContactInfo && (
          <div className="grid grid-cols-1 gap-4">
            {lender.email && (
              <InfoItem
                label={t('table.email')}
                value={lender.email}
                showCopyButton={true}
              />
            )}
            {lender.telNo && (
              <InfoItem
                label={t('table.telNo')}
                value={lender.telNo}
                showCopyButton={true}
              />
            )}
          </div>
        )}

        {/* Address Information */}
        {hasAddressInfo && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label={t('details.address')}
              value={
                <>
                  {lender.street && <div>{lender.street}</div>}
                  {lender.addon && <div>{lender.addon}</div>}
                  {(lender.zip || lender.place) && (
                    <div>{lender.zip} {lender.place}</div>
                  )}
                  {lender.country && <div>{lender.country}</div>}
                </>
              }
              showCopyButton={true}
            />
          </div>
        )}

        {/* Banking Information */}
        {hasBankingInfo && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label={t('details.banking')}
              value={
                <>
                  {lender.iban && <div>{lender.iban}</div>}
                  {lender.bic && <div className="text-muted-foreground">{lender.bic}</div>}
                </>
              }
              showCopyButton={true}
              showQrButton={!!lender.iban}
              recipientName={lenderName ?? undefined}
              qrValue={lender.iban ?? undefined}
              copyValue={lender.iban ?? undefined}
            />
          </div>
        )}

        {/* Loan Calculations */}
        {hasLoanCalculations && (
          <div className="grid grid-cols-1 gap-4">
            <div className="text-sm text-muted-foreground">{t('details.loanCalculations')}</div>
            <LoanCalculations
              deposits={lender.deposits || 0}
              withdrawals={lender.withdrawals || 0}
              notReclaimed={lender.notReclaimed || 0}
              interest={lender.interest || 0}
              interestPaid={lender.interestPaid || 0}
              interestError={lender.interestError || 0}
              balance={lender.balance || 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 