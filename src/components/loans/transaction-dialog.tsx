'use client'

import { addTransaction } from '@/app/actions/loans'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { transactionSchema, type TransactionFormData } from '@/lib/schemas/transaction'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TransactionFormFields } from './transaction-form-fields'

interface TransactionDialogProps {
  loanId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionDialog({
  loanId,
  open,
  onOpenChange,
}: TransactionDialogProps) {
  const t = useTranslations('dashboard.loans')

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'INTEREST',
      date: new Date(),
      amount: 0,
      paymentType: 'BANK',
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await addTransaction(loanId, data)
      if (result.error) {
        throw new Error(result.error)
      }
      toast.success(t('transactions.createSuccess'))
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast.error(t('transactions.createError'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('transactions.createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TransactionFormFields form={form} />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('transactions.cancel')}
              </Button>
              <Button type="submit">
                {t('transactions.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 