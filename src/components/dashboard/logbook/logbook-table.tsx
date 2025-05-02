'use client'

import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createColumn } from '@/lib/table-column-utils'
import { Change, ViewType } from '@prisma/client'
import { ColumnDef, Row } from '@tanstack/react-table'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

interface LogbookTableProps {
  changes: Change[]
}

export function LogbookTable({ changes }: LogbookTableProps) {
  const t = useTranslations('logbook')
  const [selectedChange, setSelectedChange] = useState<Change | null>(null)

  const getChangeDescription = (change: Change) => {
    const context = change.context as Record<string, any>
    const before = change.before as Record<string, any>
    const after = change.after as Record<string, any>

    switch (change.entity) {
      case 'file':
        if (change.operation === 'CREATE') {
          return t('file.created', {
            filename: after.name,
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        } else if (change.operation === 'DELETE') {
          return t('file.deleted', {
            filename: before.name,
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        }
        break
      case 'loan':
        if (change.operation === 'CREATE') {
          return t('loan.created', {
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        } else if (change.operation === 'UPDATE') {
          return t('loan.updated', {
            loanNumber: after.loanNumber,
            lenderName: context.lender?.name,
          })
        }
        break
      case 'transaction':
        if (change.operation === 'CREATE') {
          return t('transaction.created', {
            amount: after.amount,
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        } else if (change.operation === 'DELETE') {
          return t('transaction.deleted', {
            amount: before.amount,
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        }
        break
      case 'note':
        if (change.operation === 'CREATE') {
          return t('note.created', {
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        } else if (change.operation === 'DELETE') {
          return t('note.deleted', {
            loanNumber: context.loan?.loanNumber,
            lenderName: context.lender?.name,
          })
        }
        break
      case 'lender':
        if (change.operation === 'CREATE') {
          return t('lender.created', {
            lenderName: context.lender?.name,
            lenderId: context.lender?.id,
          })
        } else if (change.operation === 'UPDATE') {
          return t('lender.updated', {
            lenderName: context.lender?.name,
            lenderId: context.lender?.id,
          })
        } else if (change.operation === 'DELETE') {
          return t('lender.deleted', {
            lenderName: context.lender?.name,
            lenderId: context.lender?.id,
          })
        }
        break
    }
    return t('unknownChange')
  }

  const columns: ColumnDef<Change>[] = [
    createColumn<Change>({
      accessorKey: 'userName',
      header: 'who',
      accessorFn: (row: Change) => {
        const context = row.context as Record<string, any>
        return context.user?.name || t('unknownUser')
      },
      cell: ({ row }: { row: Row<Change> }) => {
        const context = row.original.context as Record<string, any>
        return context.user?.name || t('unknownUser')
      }
    }, t),

    createColumn<Change>({
      accessorKey: 'committedAt',
      header: 'when',
      cell: ({ row }: { row: Row<Change> }) => {
        return format(new Date(row.original.committedAt), 'PPPp', { locale: de })
      }
    }, t),

    createColumn<Change>({
      accessorKey: 'description',
      header: 'what',
      accessorFn: (row: Change) => {
        return getChangeDescription(row)
      },
      cell: ({ row }: { row: Row<Change> }) => {
        const context = row.original.context as Record<string, any>
        const description = getChangeDescription(row.original)

        if (context.loan?.loanNumber) {
          return (
            <div>
              {description.split(`#${context.loan.loanNumber}`).map((part, index, array) => (
                <span key={index}>
                  {part}
                  {index < array.length - 1 && (
                    <Link
                      href={`/dashboard/lenders/${context.lender?.id}?highlightLoan=${context.loan.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('loanText')} #{context.loan.loanNumber}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          )
        }

        if (row.original.entity === 'lender') {
          const lenderName = context.lender?.name || ''
          return (
            <div>
              {description.split(lenderName).map((part, index, array) => (
                <span key={index}>
                  {part}
                  {index < array.length - 1 && context.lender && (
                    <Link
                      href={`/dashboard/lenders/${context.lender.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lenderName}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          )
        }

        return description
      }
    }, t),
  ]

  const columnFilters = {
    user: {
      type: 'text' as const,
      label: t('who')
    },
    committedAt: {
      type: 'date' as const,
      label: t('when')
    },
    description: {
      type: 'text' as const,
      label: t('what')
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={changes}
        onRowClick={(row) => setSelectedChange(row)}
        showColumnVisibility={false}
        showFilter={true}
        viewType={ViewType.LOGBOOK}
        columnFilters={columnFilters}
      />

      <Dialog open={!!selectedChange} onOpenChange={() => setSelectedChange(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('changeDetails')}</DialogTitle>
          </DialogHeader>
          {selectedChange && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">{t('before')}</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
                  {JSON.stringify(selectedChange.before, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('after')}</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
                  {JSON.stringify(selectedChange.after, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 