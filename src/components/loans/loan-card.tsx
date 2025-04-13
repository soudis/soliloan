'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfoItem } from '@/components/ui/info-item'
import { formatCurrency } from '@/lib/utils'
import { LoanWithRelations } from '@/types/loans'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { Eye, Pencil, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '../ui/button'
import { LoanFiles } from './loan-files'
import { LoanNotes } from './loan-notes'
import { LoanTransactions } from './loan-transactions'


interface LoanCardProps {
  loan: LoanWithRelations
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  className?: string
}

export function LoanCard({ loan, onView, onEdit, className }: LoanCardProps) {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS

  const getTerminationModalities = () => {
    switch (loan.terminationType) {
      case 'ENDDATE':
        return `${commonT('enums.loan.terminationType.ENDDATE')} - ${loan.endDate ? format(new Date(loan.endDate), 'PPP', { locale: dateLocale }) : '-'}`
      case 'TERMINATION':
        if (!loan.terminationPeriod || !loan.terminationPeriodType) return `${commonT('enums.loan.terminationType.TERMINATION')} - -`
        return `${commonT('enums.loan.terminationType.TERMINATION')} - ${loan.terminationPeriod} ${loan.terminationPeriodType === 'MONTHS' ?
          commonT('enums.loan.durationUnit.MONTHS') :
          commonT('enums.loan.durationUnit.YEARS')}`
      case 'DURATION':
        if (!loan.duration || !loan.durationType) return `${commonT('enums.loan.terminationType.DURATION')} - -`
        return `${commonT('enums.loan.terminationType.DURATION')} - ${loan.duration} ${loan.durationType === 'MONTHS' ?
          commonT('enums.loan.durationUnit.MONTHS') :
          commonT('enums.loan.durationUnit.YEARS')}`
      default:
        return '-'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {t('table.loanNumber')} #{loan.loanNumber}
          </h3>
          <Badge
            variant={loan.contractStatus === 'PENDING' ? 'secondary' : 'default'}
            className="mt-1"
          >
            {commonT(`enums.loan.contractStatus.${loan.contractStatus}`)}
          </Badge>
        </div>
        <div className="flex space-x-1">
          {onView && (
            <Button variant="ghost" size="icon" onClick={() => onView(loan.id)}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.view')}</span>
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(loan.id)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.edit')}</span>
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
            <span className="sr-only">{commonT('ui.actions.create')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem
            label={t('table.amount')}
            value={formatCurrency(loan.amount)}
          />
          <InfoItem
            label={t('table.interestRate')}
            value={`${loan.interestRate}%`}
          />
          <InfoItem
            label={t('table.signDate')}
            value={format(new Date(loan.signDate), 'PPP', { locale: dateLocale })}
          />
          <InfoItem
            label={t('table.terminationModalities')}
            value={getTerminationModalities()}
          />
        </div>

        <LoanTransactions loanId={loan.id} transactions={loan.transactions} />
        <LoanFiles loanId={loan.id} files={loan.files} />
        <LoanNotes loanId={loan.id} notes={loan.notes} />
      </CardContent>
    </Card>
  )
} 