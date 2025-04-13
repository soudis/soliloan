'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfoItem } from '@/components/ui/info-item'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLoanTabsStore } from '@/lib/stores/loan-tabs-store'
import { formatCurrency } from '@/lib/utils'
import { LoanWithRelations } from '@/types/loans'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '../ui/button'
import { LoanFiles } from './loan-files'
import { LoanNotes } from './loan-notes'
import { LoanTransactions } from './loan-transactions'

// Define a type for the loan with calculated fields
type LoanWithCalculations = LoanWithRelations & {
  balance: number
  withdrawals: number
  deposits: number
  notReclaimed: number
  interestPaid: number
  interest: number
  interestError: number
  repaidDate: Date | undefined
  isTerminated: boolean
  repayDate: Date | undefined
  status: string
}

interface LoanCardProps {
  loan: LoanWithCalculations
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  className?: string
}

export function LoanCard({ loan, onView, onEdit, className }: LoanCardProps) {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS
  const { activeTab, setActiveTab } = useLoanTabsStore()

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
          <div className="flex space-x-2">
            <Badge
              variant={loan.contractStatus === 'PENDING' ? 'secondary' : 'default'}
              className="mt-1"
            >
              {commonT(`enums.loan.contractStatus.${loan.contractStatus}`)}
            </Badge>
            <Badge
              variant={
                loan.status === 'ACTIVE' ? 'default' :
                  loan.status === 'TERMINATED' ? 'destructive' :
                    loan.status === 'PENDING' ? 'secondary' :
                      'outline'
              }
              className="mt-1"
            >
              {commonT(`enums.loan.status.${loan.status}`)}
            </Badge>
          </div>
        </div>
        <div className="flex space-x-1">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(loan.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              {commonT('ui.actions.edit')}
            </Button>
          )}
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

        <div className="mt-6 border rounded-md p-4 bg-muted/30">
          <div className="grid grid-cols-1 gap-2 text-sm">
            {loan.deposits !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.deposits')}</span>
                <span className="font-medium text-green-600">+{formatCurrency(loan.deposits)}</span>
              </div>
            )}
            {loan.withdrawals !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.withdrawals')}</span>
                <span className="font-medium text-red-600">{formatCurrency(loan.withdrawals)}</span>
              </div>
            )}
            {loan.notReclaimed !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.notReclaimed')}</span>
                <span className="font-medium text-red-600">{formatCurrency(loan.notReclaimed)}</span>
              </div>
            )}
            {loan.interest !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.interest')}</span>
                <span className="font-medium text-green-600">+{formatCurrency(loan.interest)}</span>
              </div>
            )}
            {loan.interestPaid !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.interestPaid')}</span>
                <span className="font-medium text-red-600">{formatCurrency(loan.interestPaid)}</span>
              </div>
            )}
            {loan.interestError !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('table.interestError')}</span>
                <span className="font-medium text-amber-600">{loan.interestError < 0 ? '-' : ''}{formatCurrency(loan.interestError)}</span>
              </div>
            )}
            {(loan.deposits !== 0 || loan.withdrawals > 0 || loan.interest > 0 ||
              loan.interestPaid !== 0 || loan.notReclaimed > 0 || loan.interestError > 0) ? (
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>{t('table.balance')}</span>
                <span>{formatCurrency(loan.balance)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-medium">
                <span>{t('table.balance')}</span>
                <span>{formatCurrency(0)}</span>
              </div>
            )}
          </div>
        </div>

        {loan.repaidDate && (
          <div className="mt-4">
            <InfoItem
              label={t('table.repaidDate')}
              value={format(new Date(loan.repaidDate), 'PPP', { locale: dateLocale })}
            />
          </div>
        )}
        {loan.repayDate && (
          <div className="mt-4">
            <InfoItem
              label={t('table.repayDate')}
              value={format(new Date(loan.repayDate), 'PPP', { locale: dateLocale })}
            />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'transactions' | 'files' | 'notes')} className="mt-6">
          <TabsList className="w-full border-b border-border bg-transparent p-0 mt-4 flex justify-start gap-0">
            <TabsTrigger
              value="transactions"
              className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2 text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
            >
              {t('table.transactions')}
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2   text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
            >
              {t('table.files')}
              {loan.files && loan.files.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {loan.files.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2  text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
            >
              {t('table.notes')}
              {loan.notes && loan.notes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {loan.notes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <LoanTransactions
              loanId={loan.id}
              transactions={loan.transactions.filter(t => t.type !== 'INTEREST')}
            />
          </TabsContent>
          <TabsContent value="files">
            <LoanFiles loanId={loan.id} files={loan.files} />
          </TabsContent>
          <TabsContent value="notes">
            <LoanNotes loanId={loan.id} notes={loan.notes} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 