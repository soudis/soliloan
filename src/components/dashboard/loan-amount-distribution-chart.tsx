'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { LoanStatus, LoanWithCalculations } from '@/types/loans'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Pie } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
)

interface LoanAmountDistributionItem {
  range: string
  count: number
  totalAmount: number
}

interface LoanAmountDistributionChartProps {
  data: LoanAmountDistributionItem[]
  loans: LoanWithCalculations[] // Add loans prop to access loan status
}

// Define consistent colors for each range
const RANGE_COLORS = {
  '0 - 1,000': '#8884d8',
  '1,001 - 5,000': '#82ca9d',
  '5,001 - 10,000': '#ffc658',
  '10,001 - 25,000': '#ff8042',
  '25,001 - 50,000': '#0088fe',
  '50,001 - 100,000': '#00c49f',
  '100,001+': '#ffbb28'
}

export function LoanAmountDistributionChart({ data, loans }: LoanAmountDistributionChartProps) {
  const t = useTranslations('dashboard')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')

  // Define amount ranges
  const ranges = [
    { min: 0, max: 1000, label: '0 - 1,000' },
    { min: 1001, max: 5000, label: '1,001 - 5,000' },
    { min: 5001, max: 10000, label: '5,001 - 10,000' },
    { min: 10001, max: 25000, label: '10,001 - 25,000' },
    { min: 25001, max: 50000, label: '25,001 - 50,000' },
    { min: 50001, max: 100000, label: '50,001 - 100,000' },
    { min: 100001, max: Infinity, label: '100,001+' }
  ]

  // Filter loans by status
  const filteredLoans = selectedStatus === 'all'
    ? loans
    : loans.filter(loan => {
      if (selectedStatus === 'active') {
        return loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.TERMINATED
      } else if (selectedStatus === 'notDeposited') {
        return loan.status === LoanStatus.NOTDEPOSITED
      } else if (selectedStatus === 'repaid') {
        return loan.status === LoanStatus.REPAID
      }
      return false
    })

  // Calculate distribution for filtered loans
  const filteredData = ranges.map(range => {
    const loansInRange = filteredLoans.filter(loan => {
      const amount = Number(loan.amount)
      return amount >= range.min && amount <= range.max
    })

    return {
      range: range.label,
      count: loansInRange.length,
      totalAmount: loansInRange.reduce((sum, loan) => sum + Number(loan.amount), 0)
    }
  }).filter(item => item.count > 0)

  // Calculate total amount for percentage calculation
  const totalAmount = filteredData.reduce((sum, item) => sum + item.totalAmount, 0)

  // Prepare data for the chart
  const chartData = {
    labels: filteredData.map(item => item.range),
    datasets: [
      {
        data: filteredData.map(item => item.totalAmount),
        backgroundColor: filteredData.map(item => RANGE_COLORS[item.range as keyof typeof RANGE_COLORS]),
        borderColor: filteredData.map(item => RANGE_COLORS[item.range as keyof typeof RANGE_COLORS]),
        borderWidth: 1
      }
    ]
  }

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const count = filteredData[context.dataIndex].count;
            const percentage = totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : '0.0';
            return [
              `${label}: ${formatCurrency(value)}`,
              `${t('charts.loanCount')}: ${count}`,
              `${percentage}% of total`
            ];
          }
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('charts.loanAmountDistribution')}</CardTitle>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('loans.table.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('stats.totalLoans')}</SelectItem>
            <SelectItem value="active">{t('stats.activeLoans')}</SelectItem>
            <SelectItem value="notDeposited">{t('stats.notDepositedLoans')}</SelectItem>
            <SelectItem value="repaid">{t('stats.repaidLoans')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {filteredData.length > 0 ? (
            <Pie data={chartData} options={options} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">{t('noData')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 