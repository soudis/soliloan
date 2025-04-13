'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface YearlyData {
  year: number
  begin: number
  deposits: number
  interest: number
  withdrawals: number
  notReclaimed: number
  interestPaid: number
  end: number
}

interface YearlyTableProps {
  data: YearlyData[]
}

export function YearlyTable({ data }: YearlyTableProps) {
  const t = useTranslations('dashboard')

  // Filter out rows with 0 end value
  const filteredData = data.filter(item => item.end !== 0)

  if (filteredData.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('yearlyTable.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left font-medium">{t('yearlyTable.year')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.begin')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.deposits')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.interest')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.withdrawals')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.notReclaimed')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.interestPaid')}</th>
                  <th className="py-2 px-4 text-right font-medium">{t('yearlyTable.end')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((yearData) => (
                  <tr key={yearData.year} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4 font-medium">{yearData.year}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(yearData.begin)}</td>
                    <td className="py-2 px-4 text-right text-green-600">{formatCurrency(yearData.deposits)}</td>
                    <td className="py-2 px-4 text-right text-green-600">{formatCurrency(yearData.interest)}</td>
                    <td className="py-2 px-4 text-right text-red-600">{formatCurrency(yearData.withdrawals)}</td>
                    <td className="py-2 px-4 text-right text-red-600">{formatCurrency(yearData.notReclaimed)}</td>
                    <td className="py-2 px-4 text-right text-red-600">{formatCurrency(yearData.interestPaid)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(yearData.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 