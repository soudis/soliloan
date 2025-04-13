'use client'

import { Card, CardContent } from '@/components/ui/card'
import { InfoItem } from '@/components/ui/info-item'
import { useTranslations } from 'next-intl'

interface LenderInfoCardProps {
  lender: {
    type?: 'PERSON' | 'ORGANISATION'
    firstName?: string
    lastName?: string
    organisationName?: string
    titlePrefix?: string
    titleSuffix?: string
    email?: string
    telNo?: string
    street?: string
    addon?: string
    zip?: string
    place?: string
    country?: string
    iban?: string
    bic?: string
  }
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
            <div className="text-sm text-muted-foreground">{t('details.address')}</div>
            <div className="text-lg font-medium">
              {lender.street && <div>{lender.street}</div>}
              {lender.addon && <div>{lender.addon}</div>}
              {(lender.zip || lender.place) && (
                <div>{lender.zip} {lender.place}</div>
              )}
              {lender.country && <div>{lender.country}</div>}
            </div>
          </div>
        )}

        {/* Banking Information */}
        {hasBankingInfo && (
          <div className="grid grid-cols-1 gap-4">
            <div className="text-sm text-muted-foreground">{t('details.banking')}</div>
            {lender.iban && (
              <InfoItem
                label="IBAN"
                value={lender.iban}
                showCopyButton={true}
                showQrButton={true}
                recipientName={lenderName}
              />
            )}
            {lender.bic && (
              <InfoItem
                label="BIC"
                value={lender.bic}
                showCopyButton={true}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 