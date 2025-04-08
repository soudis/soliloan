'use client'

import { FormDatePicker } from '@/components/form/form-date-picker'
import { FormNumberInput } from '@/components/form/form-number-input'
import { FormSelect } from '@/components/form/form-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { TransactionFormData, transactionSchema } from '@/lib/schemas/transaction'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface TransactionDialogProps {
  loanId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Function to create a transaction
const createTransaction = async (loanId: string, data: TransactionFormData) => {
  const response = await fetch(`/api/loans/${loanId}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create transaction')
  }

  return response.json()
}

export function TransactionDialog({
  loanId,
  open,
  onOpenChange,
  onSuccess
}: TransactionDialogProps) {
  const t = useTranslations('dashboard.loans')
  const queryClient = useQueryClient()

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'DEPOSIT',
      date: new Date(),
      amount: undefined,
      paymentType: 'BANK',
    }
  })

  // Use React Query mutation for creating a transaction
  const { mutate, isPending } = useMutation({
    mutationFn: (data: TransactionFormData) => createTransaction(loanId, data),
    onSuccess: () => {
      toast.success(t('transactions.success'))
      form.reset()
      onOpenChange(false)

      // Invalidate the lender query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['lender'] })

      // Call the onSuccess callback if provided
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Error creating transaction:', error)
      toast.error(t('transactions.error'))
    }
  })

  const onSubmit = (data: TransactionFormData) => {
    mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('transactions.new.title')}</DialogTitle>
          <DialogDescription>
            {t('transactions.new.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormSelect
              form={form}
              name="type"
              label={t('transactions.new.type')}
              placeholder={t('transactions.new.typePlaceholder')}
              options={[
                { value: 'DEPOSIT', label: t('transactions.type.DEPOSIT') },
                { value: 'WITHDRAWAL', label: t('transactions.type.WITHDRAWAL') },
                { value: 'INTEREST', label: t('transactions.type.INTEREST') },
                { value: 'INTERESTPAYMENT', label: t('transactions.type.INTERESTPAYMENT') },
                { value: 'TERMINATION', label: t('transactions.type.TERMINATION') },
                { value: 'NOTRECLAIMEDPARTIAL', label: t('transactions.type.NOTRECLAIMEDPARTIAL') },
                { value: 'NOTRECLAIMED', label: t('transactions.type.NOTRECLAIMED') },
              ]}
            />

            <FormDatePicker
              form={form}
              name="date"
              label={t('transactions.new.date')}
              placeholder={t('transactions.new.datePlaceholder')}
            />

            <FormNumberInput
              form={form}
              name="amount"
              label={t('transactions.new.amount')}
              placeholder={t('transactions.new.amountPlaceholder')}
              min={0.01}
              step={0.01}
            />

            <FormSelect
              form={form}
              name="paymentType"
              label={t('transactions.new.paymentType')}
              placeholder={t('transactions.new.paymentTypePlaceholder')}
              options={[
                { value: 'BANK', label: t('transactions.paymentType.BANK') },
                { value: 'CASH', label: t('transactions.paymentType.CASH') },
                { value: 'OTHER', label: t('transactions.paymentType.OTHER') },
              ]}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('transactions.new.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('transactions.new.submitting') : t('transactions.new.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 