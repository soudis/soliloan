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

// Function to fetch lender data using the server action
const fetchLender = async (lenderId: string) => {
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

  // Map the lender data to match the expected type for LenderInfoCard
  const mappedLender = {
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
  }

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
            {lender.loans.map((loan) => {
              // Map the loan data to match the expected type for LoanCard
              const mappedLoan = {
                ...loan,
                lender
              }

              return (
                <LoanCard
                  key={loan.id}
                  loan={mappedLoan}
                  onView={(id) => router.push(`/dashboard/loans/${id}`)}
                  onEdit={(id) => router.push(`/dashboard/loans/${id}/edit`)}
                />
              )
            })}
            {lender.loans.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {commonT('ui.table.noResults')}
              </div>
            )}
          </div>
        </div>

        {/* Lender Information Section - Right side on desktop, top on mobile */}
        <div className="w-full lg:w-1/3">
          <LenderInfoCard lender={mappedLender} />
        </div>
      </div>
    </div>
  )
} 