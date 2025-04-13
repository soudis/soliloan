'use client'

import { getLendersByProjectId } from '@/app/actions/lenders'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useRouter } from '@/i18n/navigation'
import {
  createColumn,
  createLenderAddressColumn,
  createLenderBankingColumn,
  createLenderEnumBadgeColumn,
  createLenderNameColumn
} from '@/lib/table-column-utils'
import { useProject } from '@/store/project-context'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Plus } from 'lucide-react'
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

interface Lender {
  id: string
  lenderNumber: number
  type: 'PERSON' | 'ORGANISATION'
  salutation: 'PERSONAL' | 'FORMAL'
  firstName: string | null
  lastName: string | null
  organisationName: string | null
  titlePrefix: string | null
  titleSuffix: string | null
  street: string | null
  addon: string | null
  zip: string | null
  place: string | null
  country: string | null
  email: string | null
  telNo: string | null
  iban: string | null
  bic: string | null
  notificationType: 'ONLINE' | 'EMAIL' | 'MAIL'
  membershipStatus: 'UNKNOWN' | 'MEMBER' | 'EXTERNAL' | null
  tag: string | null
}

export default function LendersPage() {
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')
  const commonT = useTranslations('common')
  const [error, setError] = useState<string | null>(null)

  const { data: lenders = [], isLoading: loading } = useQuery({
    queryKey: ['lenders', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return []
      const result = await getLendersByProjectId(selectedProject.id)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.lenders
    },
    enabled: !!selectedProject
  })

  const columns: ColumnDef<Lender>[] = [
    createColumn<Lender>({
      accessorKey: 'lenderNumber',
      header: 'table.lenderNumber',
    }, t),

    createLenderNameColumn<Lender>(t, commonT),

    createLenderEnumBadgeColumn<Lender>(
      'type',
      'table.type',
      'enums.lender.type',
      t,
      commonT
    ),

    createColumn<Lender>({
      accessorKey: 'email',
      header: 'table.email',
    }, t),

    createColumn<Lender>({
      accessorKey: 'telNo',
      header: 'table.telNo',
    }, t),

    createLenderAddressColumn<Lender>(t),

    createLenderBankingColumn<Lender>(t),

    createLenderEnumBadgeColumn<Lender>(
      'notificationType',
      'table.notificationType',
      'enums.lender.notificationType',
      t,
      commonT
    ),

    createLenderEnumBadgeColumn<Lender>(
      'membershipStatus',
      'table.membershipStatus',
      'enums.lender.membershipStatus',
      t,
      commonT
    ),

    createColumn<Lender>({
      accessorKey: 'tag',
      header: 'table.tag',
    }, t),

    createLenderEnumBadgeColumn<Lender>(
      'salutation',
      'table.salutation',
      'enums.lender.salutation',
      t,
      commonT
    ),
  ]

  // Define column filters based on data types
  const columnFilters = {
    lenderNumber: {
      type: 'number' as const,
      label: t('table.lenderNumber')
    },
    type: {
      type: 'select' as const,
      label: t('table.type'),
      options: [
        { label: commonT('enums.lender.type.PERSON'), value: 'PERSON' },
        { label: commonT('enums.lender.type.ORGANISATION'), value: 'ORGANISATION' }
      ]
    },
    name: {
      type: 'text' as const,
      label: t('table.name')
    },
    email: {
      type: 'text' as const,
      label: t('table.email')
    },
    telNo: {
      type: 'text' as const,
      label: t('table.telNo')
    },
    address: {
      type: 'text' as const,
      label: t('table.address')
    },
    banking: {
      type: 'text' as const,
      label: t('table.banking')
    },
    notificationType: {
      type: 'select' as const,
      label: t('table.notificationType'),
      options: [
        { label: commonT('enums.lender.notificationType.ONLINE'), value: 'ONLINE' },
        { label: commonT('enums.lender.notificationType.EMAIL'), value: 'EMAIL' },
        { label: commonT('enums.lender.notificationType.MAIL'), value: 'MAIL' }
      ]
    },
    membershipStatus: {
      type: 'select' as const,
      label: t('table.membershipStatus'),
      options: [
        { label: commonT('enums.lender.membershipStatus.UNKNOWN'), value: 'UNKNOWN' },
        { label: commonT('enums.lender.membershipStatus.MEMBER'), value: 'MEMBER' },
        { label: commonT('enums.lender.membershipStatus.EXTERNAL'), value: 'EXTERNAL' }
      ]
    },
    tag: {
      type: 'text' as const,
      label: t('table.tag')
    },
    salutation: {
      type: 'select' as const,
      label: t('table.salutation'),
      options: [
        { label: commonT('enums.lender.salutation.PERSONAL'), value: 'PERSONAL' },
        { label: commonT('enums.lender.salutation.FORMAL'), value: 'FORMAL' }
      ]
    }
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
    lenderNumber: true,
    type: true,
    name: true,
    email: true,
    telNo: true,
    address: false,
    banking: false,
    notificationType: true,
    membershipStatus: true,
    tag: true,
    salutation: false,
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
        <Button onClick={() => router.push('/dashboard/lenders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={lenders}
        columnFilters={columnFilters}
        translations={tableTranslations}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType="LENDER"
        showFilter={true}
        onRowClick={(row) => router.push(`/dashboard/lenders/${row.id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/lenders/${row.id}`)}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.view')}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/lenders/${row.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">{commonT('ui.actions.edit')}</span>
            </Button>
          </div>
        )}
      />
    </div>
  )
} 