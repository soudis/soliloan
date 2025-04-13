'use client'

import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface LoanCalculationsProps {
  deposits: number
  withdrawals: number
  notReclaimed: number
  interest: number
  interestPaid: number
  interestError: number
  balance: number
  className?: string
}

export function LoanCalculations({
  deposits,
  withdrawals,
  notReclaimed,
  interest,
  interestPaid,
  interestError,
  balance,
  className = '',
}: LoanCalculationsProps) {
  const t = useTranslations('dashboard.loans')

  return (
    <div className={`border rounded-md p-4 bg-muted/30 ${className}`}>
      <div className="grid grid-cols-1 gap-2 text-sm">
        {deposits !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.deposits')}</span>
            <span className="font-medium text-green-600">+{formatCurrency(deposits)}</span>
          </div>
        )}
        {withdrawals !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.withdrawals')}</span>
            <span className="font-medium text-red-600">{formatCurrency(withdrawals)}</span>
          </div>
        )}
        {notReclaimed !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.notReclaimed')}</span>
            <span className="font-medium text-red-600">{formatCurrency(notReclaimed)}</span>
          </div>
        )}
        {interest !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interest')}</span>
            <span className="font-medium text-green-600">+{formatCurrency(interest)}</span>
          </div>
        )}
        {interestPaid !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interestPaid')}</span>
            <span className="font-medium text-red-600">{formatCurrency(interestPaid)}</span>
          </div>
        )}
        {interestError !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interestError')}</span>
            <span className="font-medium text-amber-600">{interestError < 0 ? '-' : ''}{formatCurrency(interestError)}</span>
          </div>
        )}
        {(deposits !== 0 || withdrawals > 0 || interest > 0 ||
          interestPaid !== 0 || notReclaimed > 0 || interestError > 0) ? (
          <div className="border-t pt-2 mt-2 flex justify-between font-medium">
            <span>{t('table.balance')}</span>
            <span>{formatCurrency(balance)}</span>
          </div>
        ) : (
          <div className="flex justify-between font-medium">
            <span>{t('table.balance')}</span>
            <span>{formatCurrency(0)}</span>
          </div>
        )}
      </div>
    </div>
  )
} 