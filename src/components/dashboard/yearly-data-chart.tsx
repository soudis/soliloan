'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Title, Tooltip } from 'chart.js'
import { useTranslations } from 'next-intl'
import { Chart } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface YearlyDataItem {
  year: number
  totalAmount: number
  totalInterest: number
  totalDeposits: number
  totalWithdrawals: number
}

interface ProcessedDataItem {
  year: number
  netDeposits: number
  interest: number
  balance: number
}

interface YearlyDataChartProps {
  data: YearlyDataItem[]
}

export function YearlyDataChart({ data }: YearlyDataChartProps) {
  const t = useTranslations('dashboard')

  // First, calculate the yearly changes (net deposits and interest)
  const yearlyChanges = data.map(item => ({
    year: item.year,
    netDeposits: item.totalDeposits - item.totalWithdrawals,
    interest: item.totalInterest
  }))

  // Then calculate the running balance in a separate step
  let runningBalance = 0
  const processedData: ProcessedDataItem[] = yearlyChanges.map(item => {
    // Add this year's changes to the running balance
    runningBalance += item.netDeposits + item.interest

    return {
      year: item.year,
      netDeposits: item.netDeposits,
      interest: item.interest,
      balance: runningBalance
    }
  })

  // Prepare data for the chart
  const chartData = {
    labels: processedData.map(item => item.year.toString()),
    datasets: [
      {
        type: 'line' as const,
        label: t('charts.balance'),
        data: processedData.map(item => item.balance),
        borderColor: '#8884d8',
        backgroundColor: 'rgba(136, 132, 216, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#8884d8',
        yAxisID: 'y',
        order: 1
      },
      {
        type: 'bar' as const,
        label: t('charts.netDeposits'),
        data: processedData.map(item => item.netDeposits),
        backgroundColor: '#82ca9d',
        borderColor: '#82ca9d',
        borderWidth: 1,
        yAxisID: 'y1',
        order: 2
      },
      {
        type: 'bar' as const,
        label: t('charts.interest'),
        data: processedData.map(item => item.interest),
        backgroundColor: '#ffc658',
        borderColor: '#ffc658',
        borderWidth: 1,
        yAxisID: 'y1',
        order: 3
      }
    ]
  }

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: t('charts.balance')
        },
        ticks: {
          callback: function (value: any) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: t('charts.yearlyChanges')
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function (value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.yearlyBalance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
} 