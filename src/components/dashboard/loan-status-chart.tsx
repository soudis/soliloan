'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { useTranslations } from 'next-intl'
import { Pie } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend)

// Define colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface LoanStatusBreakdown {
  active: number
  repaid: number
  terminated: number
  notDeposited: number
}

interface LoanStatusChartProps {
  data: LoanStatusBreakdown
}

export function LoanStatusChart({ data }: LoanStatusChartProps) {
  const t = useTranslations('dashboard')

  // Prepare data for loan status pie chart
  const chartData = {
    labels: [
      t('stats.activeLoans'),
      t('stats.repaidLoans'),
      t('stats.terminatedLoans'),
      t('stats.notDepositedLoans')
    ],
    datasets: [
      {
        data: [
          data.active,
          data.repaid,
          data.terminated,
          data.notDeposited
        ],
        backgroundColor: COLORS,
        borderColor: COLORS.map(color => color.replace('0.8', '1')),
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
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.loanStatus')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Pie data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
} 