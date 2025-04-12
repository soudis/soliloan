'use client'

import { getLenderById } from '@/app/actions/lenders'
import { LenderInfoCard } from '@/components/lenders/lender-info-card'
import { LoanCard } from '@/components/loans/loan-card'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { useProject } from '@/store/project-context'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { use } from 'react'
import { toast } from 'sonner'

interface Transaction {
  id: string
  type: 'INTEREST' | 'DEPOSIT' | 'WITHDRAWAL' | 'TERMINATION' | 'INTERESTPAYMENT' | 'NOTRECLAIMEDPARTIAL' | 'NOTRECLAIMED'
  date: string
  amount: number
  paymentType: 'BANK' | 'CASH' | 'OTHER'
  note?: string
}

interface Loan {
  id: string
  loanNumber: number
  amount: number
  interestRate: number
  signDate: string
  endDate?: string
  contractStatus: 'PENDING' | 'COMPLETED'
  interestPaymentType: 'YEARLY' | 'END'
  interestPayoutType: 'MONEY' | 'COUPON'
  terminationType: 'ENDDATE' | 'TERMINATION' | 'DURATION'
  terminationDate?: string
  terminationPeriod?: number
  terminationPeriodType?: 'MONTHS' | 'YEARS'
  duration?: number
  durationType?: 'MONTHS' | 'YEARS'
  altInterestMethod?: string
  lender: {
    id: string
    lenderNumber: number
    firstName?: string
    lastName?: string
    organisationName?: string
  }
  transactions: Transaction[]
}

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
  loans: Loan[]
}

// Function to fetch lender data using the server action
const fetchLender = async (lenderId: string): Promise<Lender> => {
  const result = await getLenderById(lenderId)

  if ('error' in result) {
    throw new Error(result.error)
  }

  // Convert null values to undefined for optional fields
  const lender = result.lender
  return {
    ...lender,
    firstName: lender.firstName || undefined,
    lastName: lender.lastName || undefined,
    organisationName: lender.organisationName || undefined,
    titlePrefix: lender.titlePrefix || undefined,
    titleSuffix: lender.titleSuffix || undefined,
    street: lender.street || undefined,
    addon: lender.addon || undefined,
    zip: lender.zip || undefined,
    place: lender.place || undefined,
    country: lender.country || undefined,
    email: lender.email || undefined,
    telNo: lender.telNo || undefined,
    iban: lender.iban || undefined,
    bic: lender.bic || undefined,
    membershipStatus: lender.membershipStatus || undefined,
    tag: lender.tag || undefined,
    loans: lender.loans.map(loan => ({
      id: loan.id,
      loanNumber: loan.loanNumber,
      amount: Number(loan.amount),
      interestRate: Number(loan.interestRate),
      signDate: loan.signDate.toISOString(),
      endDate: loan.endDate ? loan.endDate.toISOString() : undefined,
      contractStatus: loan.contractStatus,
      interestPaymentType: loan.interestPaymentType,
      interestPayoutType: loan.interestPayoutType,
      terminationType: loan.terminationType,
      terminationDate: loan.terminationDate ? loan.terminationDate.toISOString() : undefined,
      terminationPeriod: loan.terminationPeriod || undefined,
      terminationPeriodType: loan.terminationPeriodType || undefined,
      duration: loan.duration || undefined,
      durationType: loan.durationType || undefined,
      altInterestMethod: loan.altInterestMethod || undefined,
      lender: {
        id: lender.id,
        lenderNumber: lender.lenderNumber,
        firstName: lender.firstName || undefined,
        lastName: lender.lastName || undefined,
        organisationName: lender.organisationName || undefined
      },
      transactions: loan.transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        date: transaction.date.toISOString(),
        amount: Number(transaction.amount),
        paymentType: transaction.paymentType,
        note: (transaction as any).note || undefined
      }))
    }))
  }
}

export default function LenderDetailsPage({ params }: { params: Promise<{ lenderId: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')
  const commonT = useTranslations('common')

  // Use React Query to fetch lender data
  const { data: lender, isLoading, error } = useQuery({
    queryKey: ['lender', resolvedParams.lenderId],
    queryFn: () => fetchLender(resolvedParams.lenderId),
    enabled: !!resolvedParams.lenderId,
  })

  if (!session) {
    return null
  }

  if (!selectedProject) {
    return null
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    toast.error(t('details.error'))
    return <div>Error loading lender data</div>
  }

  if (!lender) {
    return <div>Lender not found</div>
  }

  const lenderName = lender.type === 'PERSON'
    ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
    : lender.organisationName

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lenderName}</h1>
          <p className="text-muted-foreground">#{lender.lenderNumber} · {commonT(`enums.lender.type.${lender.type}`)}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/lenders/${lender.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('details.edit')}
          </Button>
          <Button onClick={() => router.push(`/dashboard/loans/new?lenderId=${lender.id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('details.newLoan')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Loan Cards Section - Left side on desktop, bottom on mobile */}
        <div className="w-full lg:w-2/3 space-y-4">
          <h2 className="text-2xl font-semibold">{t('details.loans')}</h2>
          <div className="space-y-6">
            {lender.loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onView={(id) => router.push(`/dashboard/loans/${id}`)}
                onEdit={(id) => router.push(`/dashboard/loans/${id}/edit`)}
              />
            ))}
            {lender.loans.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {commonT('ui.table.noResults')}
              </div>
            )}
          </div>
        </div>

        {/* Lender Information Section - Right side on desktop, top on mobile */}
        <div className="w-full lg:w-1/3">
          <LenderInfoCard lender={lender} />
        </div>
      </div>
    </div>
  )
} 