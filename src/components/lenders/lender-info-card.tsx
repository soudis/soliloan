'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('details.contactInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-4">
          <InfoItem
            label={t('table.email')}
            value={lender.email}
            emptyMessage={t('details.noContactInfo')}
            showCopyButton={true}
          />
          <InfoItem
            label={t('table.telNo')}
            value={lender.telNo}
            emptyMessage={t('details.noContactInfo')}
            showCopyButton={true}
          />
        </div>

        {/* Address Information */}
        <div className="grid grid-cols-1 gap-4">
          <div className="text-sm text-muted-foreground">{t('details.address')}</div>
          {lender.street ? (
            <div className="text-lg font-medium">
              <div>{lender.street}</div>
              {lender.addon && <div>{lender.addon}</div>}
              <div>{lender.zip} {lender.place}</div>
              {lender.country && <div>{lender.country}</div>}
            </div>
          ) : (
            <div className="text-muted-foreground italic">
              {t('details.noAddress')}
            </div>
          )}
        </div>

        {/* Banking Information */}
        <div className="grid grid-cols-1 gap-4">
          <div className="text-sm text-muted-foreground">{t('details.banking')}</div>
          <InfoItem
            label="IBAN"
            value={lender.iban}
            emptyMessage="No IBAN provided"
            showCopyButton={true}
            showQrButton={true}
            recipientName={lenderName}
          />
          <InfoItem
            label="BIC"
            value={lender.bic}
            emptyMessage="No BIC provided"
            showCopyButton={true}
          />
          {!lender.iban && !lender.bic && (
            <div className="text-muted-foreground italic">
              {t('details.noBankingInfo')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 