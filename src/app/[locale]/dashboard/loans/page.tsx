'use client'

import { getLoansByProjectId } from '@/app/actions/loans'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { useRouter } from '@/i18n/navigation'
import { useProject } from '@/store/project-context'
import { Decimal } from '@prisma/client/runtime/library'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

// Define the custom filter function for compound text fields
const compoundTextFilter = (row: any, columnId: string, filterValue: any) => {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
};

// Define the custom filter function type
type FilterFn = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'compoundText'

interface Loan {
  id: string
  loanNumber: number
  lender: {
    id: string
    lenderNumber: number
    firstName: string | null
    lastName: string | null
    organisationName: string | null
  }
  signDate: Date
  interestPaymentType: 'YEARLY' | 'END'
  interestPayoutType: 'MONEY' | 'COUPON'
  terminationType: 'ENDDATE' | 'TERMINATION' | 'DURATION'
  endDate: Date | null
  terminationDate: Date | null
  terminationPeriod: number | null
  terminationPeriodType: 'MONTHS' | 'YEARS' | null
  duration: number | null
  durationType: 'MONTHS' | 'YEARS' | null
  amount: Decimal
  interestRate: Decimal
  altInterestMethod: string | null
  contractStatus: 'PENDING' | 'COMPLETED'
  transactions: {
    id: string
    type: string
    date: Date
    amount: Decimal
    paymentType: string
  }[] | null
}

export default function LoansPage() {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const router = useRouter()
  const { selectedProject } = useProject()
  const [error, setError] = useState<string | null>(null)

  const { data: loans = [], isLoading: loading } = useQuery({
    queryKey: ['loans', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return []
      const result = await getLoansByProjectId(selectedProject.id)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.loans
    },
    enabled: !!selectedProject
  })

  const columns: ColumnDef<Loan>[] = [
    {
      accessorKey: 'loanNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.loanNumber')} />
      ),
    },
    {
      accessorKey: 'lender.lenderNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.lenderNumber')} />
      ),
    },
    {
      accessorKey: 'lender',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.lender')} />
      ),
      accessorFn: (row) => {
        const lender = row.lender
        if (lender.organisationName) {
          return lender.organisationName
        }
        return `${lender.firstName || ''} ${lender.lastName || ''}`.trim()
      },
      cell: ({ row }) => {
        const lender = row.original.lender
        if (lender.organisationName) {
          return lender.organisationName
        }
        return `${lender.firstName || ''} ${lender.lastName || ''}`.trim()
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: 'signDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.signDate')} />
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue('signDate') as string
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          return isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE')
        } catch (e) {
          return ''
        }
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.amount')} />
      ),
      cell: ({ row }) => {
        const amount = Number(row.getValue('amount')) || 0
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(amount)
      },
    },
    {
      accessorKey: 'interestRate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.interestRate')} />
      ),
      cell: ({ row }) => {
        const rate = Number(row.getValue('interestRate')) || 0
        return `${rate.toFixed(2)}%`
      },
    },
    {
      accessorKey: 'interestPaymentType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.interestPaymentType')} />
      ),
      cell: ({ row }) => {
        const type = row.getValue('interestPaymentType') as string
        return type ? commonT(`enums.loan.interestPaymentType.${type}`) : ''
      },
    },
    {
      accessorKey: 'interestPayoutType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.interestPayoutType')} />
      ),
      cell: ({ row }) => {
        const type = row.getValue('interestPayoutType') as string
        return type ? commonT(`enums.loan.interestPayoutType.${type}`) : ''
      },
    },
    {
      id: 'terminationModalities',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.terminationModalities')} />
      ),
      accessorFn: (row) => {
        const terminationType = row.terminationType

        if (terminationType === 'ENDDATE' && row.endDate) {
          try {
            const date = new Date(row.endDate)
            return isNaN(date.getTime()) ? '' : date.getTime() // Sort by timestamp
          } catch (e) {
            return 0
          }
        } else if (terminationType === 'DURATION' && row.duration) {
          // Convert everything to months for consistent sorting
          const monthMultiplier = row.durationType === 'YEARS' ? 12 : 1
          return row.duration * monthMultiplier
        } else if (terminationType === 'TERMINATION' && row.terminationPeriod) {
          // Convert everything to months for consistent sorting
          const monthMultiplier = row.terminationPeriodType === 'YEARS' ? 12 : 1
          return row.terminationPeriod * monthMultiplier
        }

        return 0
      },
      cell: ({ row }) => {
        const loan = row.original
        const terminationType = loan.terminationType

        if (terminationType === 'ENDDATE' && loan.endDate) {
          try {
            const date = new Date(loan.endDate)
            const formattedDate = isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE')
            return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${formattedDate}`
          } catch (e) {
            return commonT(`enums.loan.terminationType.${terminationType}`)
          }
        } else if (terminationType === 'DURATION' && loan.duration && loan.durationType) {
          const durationType = loan.durationType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.duration} ${durationType}`
        } else if (terminationType === 'TERMINATION' && loan.terminationPeriod && loan.terminationPeriodType) {
          const periodType = loan.terminationPeriodType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.terminationPeriod} ${periodType}`
        }

        return commonT(`enums.loan.terminationType.${terminationType}`)
      },
      filterFn: (row, columnId, filterValue) => {
        const terminationType = row.original.terminationType;
        return terminationType === filterValue;
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as number;
        const b = rowB.getValue(columnId) as number;
        return a - b;
      },
    },
    {
      accessorKey: 'altInterestMethod',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.altInterestMethod')} />
      ),
    },
    {
      accessorKey: 'contractStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.contractStatus')} />
      ),
      cell: ({ row }) => {
        const status = row.getValue('contractStatus') as string
        if (!status) return ''

        const statusText = commonT(`enums.loan.contractStatus.${status}`)

        // Define badge variant based on status
        let variant: "default" | "secondary" | "destructive" | "outline" = "default"

        if (status === 'PENDING') {
          variant = "secondary"
        } else if (status === 'COMPLETED') {
          variant = "default"
        }

        return (
          <Badge variant={variant}>
            {statusText}
          </Badge>
        )
      },
    },
  ]

  // Define column filters based on data types
  const columnFilters = {
    loanNumber: {
      type: 'number' as const,
      label: t('table.loanNumber')
    },
    'lender.lenderNumber': {
      type: 'number' as const,
      label: t('table.lenderNumber')
    },
    amount: {
      type: 'number' as const,
      label: t('table.amount')
    },
    interestRate: {
      type: 'number' as const,
      label: t('table.interestRate')
    },
    signDate: {
      type: 'date' as const,
      label: t('table.signDate')
    },
    interestPaymentType: {
      type: 'select' as const,
      label: t('table.interestPaymentType'),
      options: [
        { label: commonT('enums.loan.interestPaymentType.YEARLY'), value: 'YEARLY' },
        { label: commonT('enums.loan.interestPaymentType.END'), value: 'END' }
      ]
    },
    interestPayoutType: {
      type: 'select' as const,
      label: t('table.interestPayoutType'),
      options: [
        { label: commonT('enums.loan.interestPayoutType.MONEY'), value: 'MONEY' },
        { label: commonT('enums.loan.interestPayoutType.COUPON'), value: 'COUPON' }
      ]
    },
    terminationType: {
      type: 'select' as const,
      label: t('table.terminationType'),
      options: [
        { label: commonT('enums.loan.terminationType.ENDDATE'), value: 'ENDDATE' },
        { label: commonT('enums.loan.terminationType.TERMINATION'), value: 'TERMINATION' },
        { label: commonT('enums.loan.terminationType.DURATION'), value: 'DURATION' }
      ]
    },
    contractStatus: {
      type: 'select' as const,
      label: t('table.contractStatus'),
      options: [
        { label: commonT('enums.loan.contractStatus.PENDING'), value: 'PENDING' },
        { label: commonT('enums.loan.contractStatus.COMPLETED'), value: 'COMPLETED' }
      ]
    },
    lender: {
      type: 'text' as const,
      label: t('table.lender')
    },
    terminationModalities: {
      type: 'select' as const,
      label: t('table.terminationModalities'),
      options: [
        { label: commonT('enums.loan.terminationType.ENDDATE'), value: 'ENDDATE' },
        { label: commonT('enums.loan.terminationType.TERMINATION'), value: 'TERMINATION' },
        { label: commonT('enums.loan.terminationType.DURATION'), value: 'DURATION' }
      ]
    },
  }

  // Define translations for the DataTable component
  const tableTranslations = {
    columns: commonT('ui.table.columns'),
    filters: commonT('ui.table.filters'),
    previous: commonT('ui.table.previous'),
    next: commonT('ui.table.next'),
    noResults: commonT('ui.table.noResults')
  }

  // Define default column visibility
  const defaultColumnVisibility = {
    loanNumber: true,
    'lender.lenderNumber': true,
    lender: true,
    signDate: true,
    amount: true,
    interestRate: true,
    interestPaymentType: true,
    interestPayoutType: true,
    terminationModalities: true,
    altInterestMethod: false,
    contractStatus: true,
  }

  if (!selectedProject) {
    return null
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push('/dashboard/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={loans}
        columnFilters={columnFilters}
        translations={tableTranslations}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType="LOAN"
        showFilter={true}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/loans/${row.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.edit')}</span>
            </Button>
          </div>
        )}
      />
    </div>
  )
} 