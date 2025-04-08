'use client'

import { getLenderById } from '@/app/actions/lenders'
import { LoanCard } from '@/components/loans/loan-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return result.lender
}

export default function LenderDetailsPage({ params }: { params: Promise<{ lenderId: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { selectedProject } = useProject()
  const t = useTranslations('dashboard.lenders')

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
          <p className="text-muted-foreground">#{lender.lenderNumber} · {t(`table.type${lender.type}`)}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('details.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {lender.email ? (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('table.email')}</div>
                    <div>{lender.email}</div>
                  </div>
                ) : null}
                {lender.telNo ? (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('table.telNo')}</div>
                    <div>{lender.telNo}</div>
                  </div>
                ) : null}
                {!lender.email && !lender.telNo && (
                  <div className="text-muted-foreground italic">
                    {t('details.noContactInfo')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {lender.street ? (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('details.address')}</div>
                    <div>{lender.street}</div>
                    {lender.addon && <div>{lender.addon}</div>}
                    <div>{lender.zip} {lender.place}</div>
                    {lender.country && <div>{lender.country}</div>}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">
                    {t('details.noAddress')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('details.banking')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lender.iban ? (
              <div>
                <div className="text-sm text-muted-foreground">IBAN</div>
                <div>{lender.iban}</div>
              </div>
            ) : null}
            {lender.bic ? (
              <div>
                <div className="text-sm text-muted-foreground">BIC</div>
                <div>{lender.bic}</div>
              </div>
            ) : null}
            {!lender.iban && !lender.bic && (
              <div className="text-muted-foreground italic">
                {t('details.noBankingInfo')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">{t('details.loans')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lender.loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onView={(id) => router.push(`/dashboard/loans/${id}`)}
              onEdit={(id) => router.push(`/dashboard/loans/${id}/edit`)}
            />
          ))}
          {lender.loans.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {t('loans.table.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 