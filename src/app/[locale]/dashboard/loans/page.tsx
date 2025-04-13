'use client'

import { getLoansByProjectId } from '@/app/actions/loans'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useRouter } from '@/i18n/navigation'
import {
  createColumn,
  createCurrencyColumn,
  createDateColumn,
  createEnumBadgeColumn,
  createLenderColumn,
  createPercentageColumn,
  createTerminationModalitiesColumn
} from '@/lib/table-column-utils'
import { useProject } from '@/store/project-context'
import { Lender, Loan, Transaction } from '@prisma/client'
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

// Define the type for the loan with included relations
type LoanWithRelations = Loan & {
  lender: Pick<Lender, 'id' | 'lenderNumber' | 'firstName' | 'lastName' | 'organisationName'>
  transactions: Transaction[] | null
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
    createColumn<Loan>({
      accessorKey: 'loanNumber',
      header: 'table.loanNumber',
    }, t),

    createLenderColumn<Loan>(t),

    createDateColumn<Loan>('signDate', 'table.signDate', t),

    createCurrencyColumn<Loan>('amount', 'table.amount', t),

    createCurrencyColumn<Loan>('balance', 'table.balance', t),

    createPercentageColumn<Loan>('interestRate', 'table.interestRate', t),

    createCurrencyColumn<Loan>('interest', 'table.interest', t),

    createCurrencyColumn<Loan>('interestPaid', 'table.interestPaid', t),

    createEnumBadgeColumn<Loan>(
      'interestPaymentType',
      'table.interestPaymentType',
      'enums.loan.interestPaymentType',
      t,
      commonT
    ),

    createEnumBadgeColumn<Loan>(
      'interestPayoutType',
      'table.interestPayoutType',
      'enums.loan.interestPayoutType',
      t,
      commonT
    ),

    createTerminationModalitiesColumn<Loan>(t, commonT),

    createDateColumn<Loan>('repayDate', 'table.repayDate', t),

    createEnumBadgeColumn<Loan>(
      'status',
      'table.status',
      'enums.loan.status',
      t,
      commonT,
      (value) => {
        switch (value) {
          case 'ACTIVE':
            return 'default'
          case 'TERMINATED':
            return 'destructive'
          case 'PENDING':
            return 'secondary'
          default:
            return 'outline'
        }
      }
    ),

    createEnumBadgeColumn<Loan>(
      'altInterestMethod',
      'table.altInterestMethod',
      'enums.loan.altInterestMethod',
      t,
      commonT
    ),

    createEnumBadgeColumn<Loan>(
      'contractStatus',
      'table.contractStatus',
      'enums.loan.contractStatus',
      t,
      commonT,
      (value) => {
        switch (value) {
          case 'SIGNED':
            return 'default'
          case 'DRAFT':
            return 'secondary'
          case 'EXPIRED':
            return 'destructive'
          default:
            return 'outline'
        }
      }
    ),
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
    balance: {
      type: 'number' as const,
      label: t('table.balance')
    },
    interestRate: {
      type: 'number' as const,
      label: t('table.interestRate')
    },
    interest: {
      type: 'number' as const,
      label: t('table.interest')
    },
    interestPaid: {
      type: 'number' as const,
      label: t('table.interestPaid')
    },
    signDate: {
      type: 'date' as const,
      label: t('table.signDate')
    },
    repayDate: {
      type: 'date' as const,
      label: t('table.repayDate')
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
    status: {
      type: 'select' as const,
      label: t('table.status'),
      options: [
        { label: commonT('enums.loan.status.NOTDEPOSITED'), value: 'NOTDEPOSITED' },
        { label: commonT('enums.loan.status.ACTIVE'), value: 'ACTIVE' },
        { label: commonT('enums.loan.status.REPAID'), value: 'REPAID' },
        { label: commonT('enums.loan.status.TERMINATED'), value: 'TERMINATED' }
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
    balance: true,
    interestRate: true,
    interest: true,
    interestPaid: true,
    interestPaymentType: true,
    interestPayoutType: true,
    terminationModalities: true,
    repayDate: true,
    status: true,
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