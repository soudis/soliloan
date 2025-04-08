import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Column } from '@tanstack/react-table'
import { Filter } from 'lucide-react'
import { useState } from 'react'

interface DataTableColumnFiltersProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  type?: 'text' | 'select' | 'number' | 'date'
  options?: { label: string; value: string }[]
}

export function DataTableColumnFilters<TData, TValue>({
  column,
  title,
  type = 'text',
  options = [],
}: DataTableColumnFiltersProps<TData, TValue>) {
  const [isOpen, setIsOpen] = useState(false)

  const renderFilter = () => {
    switch (type) {
      case 'select':
        return (
          <Select
            value={(column.getFilterValue() as string) ?? ''}
            onValueChange={(value) => column.setFilterValue(value)}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder={`Filter ${title}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={(column.getFilterValue() as [number, number])?.[0] ?? ''}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : undefined
                const current = column.getFilterValue() as [number, number] | undefined
                column.setFilterValue([value, current?.[1]])
              }}
              className="h-8 w-[70px]"
            />
            <span>to</span>
            <Input
              type="number"
              placeholder="Max"
              value={(column.getFilterValue() as [number, number])?.[1] ?? ''}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : undefined
                const current = column.getFilterValue() as [number, number] | undefined
                column.setFilterValue([current?.[0], value])
              }}
              className="h-8 w-[70px]"
            />
          </div>
        )
      case 'date':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={(column.getFilterValue() as [string, string])?.[0] ?? ''}
              onChange={(e) => {
                const value = e.target.value || undefined
                const current = column.getFilterValue() as [string, string] | undefined
                column.setFilterValue([value, current?.[1]])
              }}
              className="h-8 w-[130px]"
            />
            <span>to</span>
            <Input
              type="date"
              value={(column.getFilterValue() as [string, string])?.[1] ?? ''}
              onChange={(e) => {
                const value = e.target.value || undefined
                const current = column.getFilterValue() as [string, string] | undefined
                column.setFilterValue([current?.[0], value])
              }}
              className="h-8 w-[130px]"
            />
          </div>
        )
      default:
        return (
          <Input
            placeholder={`Filter ${title}...`}
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className="h-8 w-[150px]"
          />
        )
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter className="h-4 w-4" />
      </Button>
      {isOpen && renderFilter()}
    </div>
  )
} 