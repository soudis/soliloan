'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { sendInvitationEmail } from '@/app/actions/users';
import { LoanCalculations } from '@/components/loans/loan-calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InfoItem } from '@/components/ui/info-item';
import { useProject } from '@/store/project-context';
import { LenderWithCalculations } from '@/types/lenders';

interface LenderInfoCardProps {
  lender: LenderWithCalculations;
}

export function LenderInfoCard({ lender }: LenderInfoCardProps) {
  const t = useTranslations('dashboard.lenders');
  const locale = useLocale();
  const { selectedProject } = useProject();
  const queryClient = useQueryClient();
  const dateLocale = locale === 'de' ? de : enUS;
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const lenderName =
    lender.type === 'PERSON'
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
      : lender.organisationName;

  // Check if we have any contact information
  const hasContactInfo = lender.email || lender.telNo;

  // Check if we have any address information
  const hasAddressInfo = lender.street || lender.addon || lender.zip || lender.place || lender.country;

  // Check if we have any banking information
  const hasBankingInfo = lender.iban || lender.bic;

  // Check if we have any loan calculations
  const hasLoanCalculations =
    lender.balance !== undefined ||
    lender.withdrawals !== undefined ||
    lender.deposits !== undefined ||
    lender.notReclaimed !== undefined ||
    lender.interestPaid !== undefined ||
    lender.interest !== undefined ||
    lender.interestError !== undefined;

  // Handle sending invitation email
  const handleSendInvitation = async () => {
    if (!lender.user) return;

    setIsSendingInvitation(true);
    try {
      const result = await sendInvitationEmail(lender.user.id, selectedProject?.name ?? '');
      if (result.success) {
        toast.success(t('details.invitationSent'));
        queryClient.invalidateQueries({ queryKey: ['lender'] });
      } else {
        toast.error(result.error || t('details.invitationError'));
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(t('details.invitationError'));
    } finally {
      setIsSendingInvitation(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Name Information */}
        {lenderName && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label={t('table.name')} value={lenderName} showCopyButton={true} />
          </div>
        )}

        {/* Contact Information */}
        {hasContactInfo && (
          <div className="grid grid-cols-1 gap-4">
            {lender.email && <InfoItem label={t('table.email')} value={lender.email} showCopyButton={true} />}
            {lender.telNo && <InfoItem label={t('table.telNo')} value={lender.telNo} showCopyButton={true} />}
          </div>
        )}

        {/* Address Information */}
        {hasAddressInfo && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label={t('details.address')}
              value={
                <>
                  {lender.street && <div>{lender.street}</div>}
                  {lender.addon && <div>{lender.addon}</div>}
                  {(lender.zip || lender.place) && (
                    <div>
                      {lender.zip} {lender.place}
                    </div>
                  )}
                  {lender.country && <div>{lender.country}</div>}
                </>
              }
              showCopyButton={true}
            />
          </div>
        )}

        {/* Banking Information */}
        {hasBankingInfo && (
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label={t('details.banking')}
              value={
                <>
                  {lender.iban && <div>{lender.iban}</div>}
                  {lender.bic && <div className="text-muted-foreground">{lender.bic}</div>}
                </>
              }
              showCopyButton={true}
              showQrButton={!!lender.iban}
              recipientName={lenderName ?? undefined}
              qrValue={lender.iban ?? undefined}
              copyValue={lender.iban ?? undefined}
            />
          </div>
        )}

        {/* Loan Calculations */}
        {hasLoanCalculations && (
          <div className="grid grid-cols-1 gap-4">
            <div className="text-sm text-muted-foreground">{t('details.loanCalculations')}</div>
            <LoanCalculations
              deposits={lender.deposits || 0}
              withdrawals={lender.withdrawals || 0}
              notReclaimed={lender.notReclaimed || 0}
              interest={lender.interest || 0}
              interestPaid={lender.interestPaid || 0}
              interestError={lender.interestError || 0}
              balance={lender.balance || 0}
            />
          </div>
        )}

        {/* User Information */}
        {lender.user && (
          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="text-sm text-muted-foreground">{t('details.userInfo')}</div>
            <div className="grid grid-cols-1 gap-4">
              <InfoItem
                label={t('details.lastLogin')}
                value={
                  lender.user.lastLogin
                    ? format(new Date(lender.user.lastLogin), 'PPP p', {
                        locale: dateLocale,
                      })
                    : t('details.neverLoggedIn')
                }
              />
              <div className="flex items-center justify-between">
                <InfoItem
                  label={t('details.lastInvited')}
                  value={
                    lender.user.lastInvited
                      ? format(new Date(lender.user.lastInvited), 'PPP p', {
                          locale: dateLocale,
                        })
                      : t('details.neverInvited')
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendInvitation}
                  disabled={isSendingInvitation}
                  className="ml-2"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSendingInvitation ? t('details.sendingInvitation') : t('details.sendInvitation')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
