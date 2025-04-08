import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Table } from '@tanstack/react-table'
import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DataTableColumnFiltersProps<TData> {
  table: Table<TData>
  columnFilters: {
    [key: string]: {
      type: 'text' | 'select' | 'number' | 'date'
      options?: { label: string; value: string }[]
      label?: string
    }
  }
}

export function DataTableColumnFilters<TData>({
  table,
  columnFilters,
}: DataTableColumnFiltersProps<TData>) {
  const t = useTranslations('dataTable')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Object.entries(columnFilters).map(([columnId, filterConfig]) => {
        const column = table.getColumn(columnId)
        if (!column) return null

        // Only show filter if the column is visible
        if (!column.getIsVisible()) return null

        return (
          <div key={columnId} className="flex flex-col space-y-2">
            <span className="text-sm font-medium">{filterConfig.label || columnId}:</span>
            <div className="flex items-center space-x-2">
              {filterConfig.type === 'select' ? (
                <select
                  className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={(column.getFilterValue() as string) ?? ''}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                >
                  <option value="">All</option>
                  {filterConfig.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : filterConfig.type === 'number' ? (
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={(column.getFilterValue() as [number, number])?.[0] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : undefined
                      const current = column.getFilterValue() as [number, number] | undefined
                      column.setFilterValue([value, current?.[1]])
                    }}
                    className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm whitespace-nowrap">{t('to')}</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={(column.getFilterValue() as [number, number])?.[1] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : undefined
                      const current = column.getFilterValue() as [number, number] | undefined
                      column.setFilterValue([current?.[0], value])
                    }}
                    className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ) : filterConfig.type === 'date' ? (
                <div className="flex w-full flex-col space-y-2">
                  <div className="flex w-full items-center space-x-2">
                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !(column.getFilterValue() as [string, string])?.[0] && 'text-muted-foreground'
                            )}
                          >
                            {(column.getFilterValue() as [string, string])?.[0] ? (
                              <div className="flex items-center justify-between w-full">
                                <span>{format(new Date((column.getFilterValue() as [string, string])[0]), 'PPP', { locale: dateLocale })}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = column.getFilterValue() as [string, string] | undefined;
                                    if (!current?.[1]) {
                                      column.setFilterValue(undefined);
                                    } else {
                                      column.setFilterValue([undefined, current[1]]);
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span>{t('startDate') || 'Start date'}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={(column.getFilterValue() as [string, string])?.[0] ? new Date((column.getFilterValue() as [string, string])[0]) : undefined}
                            onSelect={(date) => {
                              const value = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined
                              const current = column.getFilterValue() as [string, string] | undefined
                              column.setFilterValue([value, current?.[1]])
                            }}
                            initialFocus
                            locale={dateLocale}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="text-sm whitespace-nowrap">{t('to')}</span>
                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !(column.getFilterValue() as [string, string])?.[1] && 'text-muted-foreground'
                            )}
                          >
                            {(column.getFilterValue() as [string, string])?.[1] ? (
                              <div className="flex items-center justify-between w-full">
                                <span>{format(new Date((column.getFilterValue() as [string, string])[1]), 'PPP', { locale: dateLocale })}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = column.getFilterValue() as [string, string] | undefined;
                                    if (!current?.[0]) {
                                      column.setFilterValue(undefined);
                                    } else {
                                      column.setFilterValue([current[0], undefined]);
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span>{t('endDate') || 'End date'}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={(column.getFilterValue() as [string, string])?.[1] ? new Date((column.getFilterValue() as [string, string])[1]) : undefined}
                            onSelect={(date) => {
                              const value = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined
                              const current = column.getFilterValue() as [string, string] | undefined
                              column.setFilterValue([current?.[0], value])
                            }}
                            initialFocus
                            locale={dateLocale}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              ) : (
                <Input
                  placeholder={`Filter ${filterConfig.label || columnId}...`}
                  value={(column.getFilterValue() as string) ?? ''}
                  onChange={(event) => column.setFilterValue(event.target.value)}
                  className="h-8 w-full"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
} 