'use client'

import { deleteTransaction } from '@/app/actions/loans'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfoItem } from '@/components/ui/info-item'
import { formatCurrency } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { ArrowDownIcon, ArrowUpIcon, Eye, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { TransactionDialog } from './transaction-dialog'

interface Transaction {
  id: string
  type: 'INTEREST' | 'DEPOSIT' | 'WITHDRAWAL' | 'TERMINATION' | 'INTERESTPAYMENT' | 'NOTRECLAIMEDPARTIAL' | 'NOTRECLAIMED'
  date: string
  amount: number
  paymentType: 'BANK' | 'CASH' | 'OTHER'
  note?: string
}

interface LoanCardProps {
  loan: {
    id: string
    loanNumber: number
    lender: {
      id: string
      lenderNumber: number
      firstName?: string
      lastName?: string
      organisationName?: string
    }
    signDate: string
    interestPaymentType: 'YEARLY' | 'END'
    interestPayoutType: 'MONEY' | 'COUPON'
    terminationType: 'ENDDATE' | 'TERMINATION' | 'DURATION'
    endDate?: string
    terminationDate?: string
    terminationPeriod?: number
    terminationPeriodType?: 'MONTHS' | 'YEARS'
    duration?: number
    durationType?: 'MONTHS' | 'YEARS'
    amount: number
    interestRate: number
    altInterestMethod?: string
    contractStatus: 'PENDING' | 'COMPLETED'
    transactions: Transaction[]
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
}

export function LoanCard({ loan, onView, onEdit }: LoanCardProps) {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const result = await deleteTransaction(loan.id, transactionId)
      if (result.error) {
        throw new Error(result.error)
      }
      toast.success(t('transactions.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['lender'] })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error(t('transactions.deleteError'))
    }
  }

  const getTerminationModalities = () => {
    switch (loan.terminationType) {
      case 'ENDDATE':
        return `${commonT('enums.loan.terminationType.ENDDATE')} - ${loan.endDate ? format(new Date(loan.endDate), 'PPP', { locale: dateLocale }) : '-'}`
      case 'TERMINATION':
        if (!loan.terminationPeriod || !loan.terminationPeriodType) return `${commonT('enums.loan.terminationType.TERMINATION')} - -`
        return `${commonT('enums.loan.terminationType.TERMINATION')} - ${loan.terminationPeriod} ${loan.terminationPeriodType === 'MONTHS' ?
          commonT('enums.loan.periodType.MONTHS') :
          commonT('enums.loan.periodType.YEARS')}`
      case 'DURATION':
        if (!loan.duration || !loan.durationType) return `${commonT('enums.loan.terminationType.DURATION')} - -`
        return `${commonT('enums.loan.terminationType.DURATION')} - ${loan.duration} ${loan.durationType === 'MONTHS' ?
          commonT('enums.loan.periodType.MONTHS') :
          commonT('enums.loan.periodType.YEARS')}`
      default:
        return '-'
    }
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
      case 'INTEREST':
        return <ArrowDownIcon className="h-4 w-4 text-green-500" />
      case 'WITHDRAWAL':
      case 'INTERESTPAYMENT':
      case 'TERMINATION':
        return <ArrowUpIcon className="h-4 w-4 text-blue-500" />
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionIconBackground = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
      case 'INTEREST':
        return 'bg-green-500/20'
      case 'WITHDRAWAL':
      case 'INTERESTPAYMENT':
      case 'TERMINATION':
        return 'bg-blue-500/20'
      default:
        return 'bg-gray-500/20'
    }
  }

  return (
    <>
      <Card>
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
            <Button variant="ghost" size="icon" onClick={() => setIsTransactionDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.add')}</span>
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

          <div className="mt-6">
            <div className="text-sm font-medium">{t('transactions.title')}</div>
            <div className="mt-2 space-y-2">
              {loan.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center space-x-3">
                    <div className={`rounded-full ${getTransactionIconBackground(transaction.type)} p-1`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {commonT(`enums.transaction.type.${transaction.type}`)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), 'PPP', { locale: dateLocale })}
                        {transaction.note && ` · ${transaction.note}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">{commonT('ui.actions.delete')}</span>
                    </Button>
                  </div>
                </div>
              ))}
              {loan.transactions.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t('transactions.noTransactions')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <TransactionDialog
        loanId={loan.id}
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
      />
    </>
  )
} 