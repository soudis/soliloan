'use client'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { useRouter } from '@/i18n/navigation'
import { useProject } from '@/store/project-context'
import { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

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
  firstName?: string
  lastName?: string
  organisationName?: string
  titlePrefix?: string
  titleSuffix?: string
  street?: string
  addon?: string
  zip?: string
  place?: string
  country?: string
  email?: string
  telNo?: string
  iban?: string
  bic?: string
  notificationType: 'ONLINE' | 'EMAIL' | 'MAIL'
  membershipStatus?: 'UNKNOWN' | 'MEMBER' | 'EXTERNAL'
  tag?: string
}

export default function LendersPage() {
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')
  const [lenders, setLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const columns: ColumnDef<Lender>[] = [
    {
      accessorKey: 'lenderNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.lenderNumber')} />
      ),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.type')} />
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        return type === 'PERSON' ? t('table.typePerson') : t('table.typeOrganisation')
      },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.name')} />
      ),
      accessorFn: (row) => {
        const type = row.type;
        if (type === 'PERSON') {
          const titlePrefix = row.titlePrefix ? `${row.titlePrefix} ` : '';
          const firstName = row.firstName || '';
          const lastName = row.lastName || '';
          const titleSuffix = row.titleSuffix ? ` ${row.titleSuffix}` : '';
          return `${titlePrefix}${firstName} ${lastName}${titleSuffix}`;
        }
        return row.organisationName || '';
      },
      cell: ({ row }) => {
        const type = row.original.type;
        if (type === 'PERSON') {
          const titlePrefix = row.original.titlePrefix ? `${row.original.titlePrefix} ` : '';
          const firstName = row.original.firstName || '';
          const lastName = row.original.lastName || '';
          const titleSuffix = row.original.titleSuffix ? ` ${row.original.titleSuffix}` : '';
          return `${titlePrefix}${firstName} ${lastName}${titleSuffix}`;
        }
        return row.original.organisationName || '';
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.email')} />
      ),
    },
    {
      accessorKey: 'telNo',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.telNo')} />
      ),
    },
    {
      accessorKey: 'address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.address')} />
      ),
      accessorFn: (row) => {
        const street = row.street || '';
        const addon = row.addon ? `, ${row.addon}` : '';
        const zip = row.zip || '';
        const place = row.place || '';
        const country = row.country || '';

        if (!street && !zip && !place && !country) return '';

        return `${street}${addon} ${zip} ${place} ${country}`.trim();
      },
      cell: ({ row }) => {
        const street = row.original.street || '';
        const addon = row.original.addon ? `, ${row.original.addon}` : '';
        const zip = row.original.zip || '';
        const place = row.original.place || '';
        const country = row.original.country || '';

        if (!street && !zip && !place && !country) return '';

        return (
          <div className="flex flex-col">
            {street && <div className="whitespace-nowrap">{`${street}${addon}`}</div>}
            {(zip || place || country) && (
              <div>{`${zip} ${place}${country ? `, ${country}` : ''}`}</div>
            )}
          </div>
        );
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: 'banking',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.banking')} />
      ),
      accessorFn: (row) => {
        const iban = row.iban || '';
        const bic = row.bic || '';

        if (!iban && !bic) return '';

        return `${iban} ${bic}`.trim();
      },
      cell: ({ row }) => {
        const iban = row.original.iban || '';
        const bic = row.original.bic || '';

        if (!iban && !bic) return '';

        return (
          <div className="flex flex-col">
            {iban && <div className="whitespace-nowrap">{iban}</div>}
            {bic && <div className="text-gray-500">{bic}</div>}
          </div>
        );
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: 'notificationType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.notificationType')} />
      ),
      cell: ({ row }) => {
        const type = row.getValue('notificationType') as string
        return t(`table.notificationType${type}`)
      },
    },
    {
      accessorKey: 'membershipStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.membershipStatus')} />
      ),
      cell: ({ row }) => {
        const status = row.getValue('membershipStatus') as string
        return status ? t(`table.membershipStatus${status}`) : ''
      },
    },
    {
      accessorKey: 'tag',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.tag')} />
      ),
    },
    {
      accessorKey: 'salutation',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.salutation')} />
      ),
      cell: ({ row }) => {
        const salutation = row.getValue('salutation') as string
        return salutation ? t(`table.salutation${salutation}`) : ''
      },
    },
    {
      accessorKey: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.actions')} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/lenders/${row.original.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
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
        { label: t('table.typePerson'), value: 'PERSON' },
        { label: t('table.typeOrganisation'), value: 'ORGANISATION' }
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
        { label: t('table.notificationTypeONLINE'), value: 'ONLINE' },
        { label: t('table.notificationTypeEMAIL'), value: 'EMAIL' },
        { label: t('table.notificationTypeMAIL'), value: 'MAIL' }
      ]
    },
    membershipStatus: {
      type: 'select' as const,
      label: t('table.membershipStatus'),
      options: [
        { label: t('table.membershipStatusUNKNOWN'), value: 'UNKNOWN' },
        { label: t('table.membershipStatusMEMBER'), value: 'MEMBER' },
        { label: t('table.membershipStatusEXTERNAL'), value: 'EXTERNAL' }
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
        { label: t('table.salutationPERSONAL'), value: 'PERSONAL' },
        { label: t('table.salutationFORMAL'), value: 'FORMAL' }
      ]
    }
  }

  // Define translations for the DataTable component
  const tableTranslations = {
    columns: t('table.columns'),
    filters: t('table.filters'),
    previous: t('table.previous'),
    next: t('table.next'),
    noResults: t('table.noResults')
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
    actions: true,
  }

  useEffect(() => {
    const fetchLenders = async () => {
      if (!selectedProject) return

      try {
        setLoading(true)
        const response = await fetch(`/api/lenders?projectId=${selectedProject.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch lenders')
        }
        const data = await response.json()
        setLenders(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchLenders()
  }, [selectedProject])

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
      />
    </div>
  )
} 