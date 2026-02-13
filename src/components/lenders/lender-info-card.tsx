'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { BarChart3, Info, Key, Mail, Pencil, Trash2, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteLenderAction } from '@/actions/lenders/mutations/delete-lender';
import { sendInvitationEmailAction } from '@/actions/users';
import { BalanceTable } from '@/components/loans/balance-table';
import { Button } from '@/components/ui/button';
import { InfoItem } from '@/components/ui/info-item';
import { useRouter } from '@/i18n/navigation';
import { useScreenSize } from '@/lib/hooks/use-screensize';
import { hasAdditionalFields } from '@/lib/utils/additional-fields';
import { formatAddressPlace } from '@/lib/utils/format';
import { useProjects } from '@/store/projects-store';
import type { LenderWithCalculations } from '@/types/lenders';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { ConfirmDialog } from '../generic/confirm-dialog';
import { SectionCard } from '../generic/section-card';

interface LenderInfoCardProps {
  lender: LenderWithCalculations;
}

export function LenderInfoCard({ lender }: LenderInfoCardProps) {
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const locale = useLocale();
  const { selectedProject } = useProjects();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateLocale = locale === 'de' ? de : enUS;
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const { isSmall } = useScreenSize();

  const lenderName =
    lender.type === 'PERSON'
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
      : lender.organisationName;

  // Check if we have any contact information
  const hasContactInfo = lender.email || lender.telNo;

  // Check if we have any address information
  const hasAddressInfo = lender.street || lender.addon || lender.zip || lender.place;

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
  // Handle sending invitation email
  const handleSendInvitation = async () => {
    if (!lender.user) return;

    setIsSendingInvitation(true);
    try {
      // We pass object compatible with schema: { lenderId: ... }
      const result = await sendInvitationEmailAction({ lenderId: lender.id });
      if (result?.data?.success) {
        toast.success(t('details.invitationSent'));
        queryClient.invalidateQueries({ queryKey: ['lender'] });
      } else {
        // Safe action error handling
        const errorMessage = result?.serverError || t('details.invitationError');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(t('details.invitationError'));
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleDeleteClick = () => {
    setIsConfirmOpen(true);
  };

  const handleDeleteLender = async () => {
    const toastId = toast.loading(t('delete.loading'));

    try {
      const result = await deleteLenderAction({ lenderId: lender.id });

      if (result?.serverError || result?.validationErrors) {
        toast.error(t('delete.error'), {
          id: toastId,
        });
      } else {
        toast.success(t('delete.success'), {
          id: toastId,
        });
        await queryClient.invalidateQueries({
          queryKey: ['lender', lender.id],
        });
        // Redirect to lenders list? Usage implies staying on page or router push?
        // Usually delete requires redirect if we are on detail page.
        // But invalidation suggests we might stay or list updates.
        // Let's assume list update or parent handles it.
        // Actually router is used in edit button.
        router.push('/lenders');
      }
    } catch (e) {
      toast.error(t('delete.error'), {
        id: toastId,
      });
      console.error('Failed to delete lender:', e);
    }
  };

  const buttons = (
    <div className="flex gap-2 ml-auto">
      <Button variant="outline" size="sm" onClick={() => router.push(`/lenders/${lender.id}/edit`)}>
        <Pencil className="h-4 w-4 mr-2" />
        {commonT('ui.actions.edit')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDeleteClick}
        className="text-destructive hover:text-destructive/90 border-destructive/50 hover:bg-destructive/5"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {commonT('ui.actions.delete')}
      </Button>
    </div>
  );

  const contactInfo = (
    <SectionCard title={t('details.contactInfo')} icon={<User className="h-4 w-4 text-muted-foreground" />}>
      <div className="grid grid-cols-1 gap-4">
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
                  {(lender.place || lender.zip) && <div>{formatAddressPlace(lender)}</div>}
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
                  <div>{lender.iban && <div>{lender.iban}</div>}</div>
                  {lender.bic && <div className="text-sm text-muted-foreground">{lender.bic}</div>}
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
      </div>
    </SectionCard>
  );

  const loanCalculations = (
    <SectionCard title={t('details.loanCalculations')} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
      <BalanceTable totals={lender} />
    </SectionCard>
  );

  const additionalFields = (
    <SectionCard title={t('details.additionalFields')} icon={<Info className="h-4 w-4 text-muted-foreground" />}>
      <div className="grid grid-cols-1 gap-4">
        <AdditionalFieldInfoItems
          additionalFields={lender.additionalFields}
          configuration={selectedProject?.configuration.lenderAdditionalFields}
        />
      </div>
    </SectionCard>
  );

  const userInfo = (
    <SectionCard title={t('details.userInfo')} icon={<Key className="h-4 w-4 text-muted-foreground" />}>
      <div className="grid grid-cols-1 gap-4">
        <InfoItem
          label={t('details.lastLogin')}
          value={
            lender.user?.lastLogin ? (
              format(new Date(lender.user.lastLogin), 'PPP p', {
                locale: dateLocale,
              })
            ) : (
              <div className="text-muted-foreground italic">{t('details.neverLoggedIn')}</div>
            )
          }
        />
        <div className="flex items-center justify-between">
          <InfoItem
            label={t('details.lastInvited')}
            value={
              lender.user?.lastInvited ? (
                format(new Date(lender.user.lastInvited), 'PPP p', {
                  locale: dateLocale,
                })
              ) : (
                <div className="text-muted-foreground italic">{t('details.neverInvited')}</div>
              )
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
    </SectionCard>
  );

  return (
    <div className="flex flex-col gap-4">
      {buttons}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isSmall ? (
          <div className="flex flex-col gap-4">
            {contactInfo}
            {hasLoanCalculations && loanCalculations}
            {hasAdditionalFields(lender.additionalFields, selectedProject?.configuration.lenderAdditionalFields) &&
              additionalFields}
            {lender.user && userInfo}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {contactInfo}
              {hasAdditionalFields(lender.additionalFields, selectedProject?.configuration.lenderAdditionalFields) && (
                <div>{additionalFields}</div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {hasLoanCalculations && <div>{loanCalculations}</div>}
              {lender.user && <div>{userInfo}</div>}
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => handleDeleteLender()}
        title={t('delete.confirmTitle')}
        description={t('delete.confirmDescription')}
        confirmText={commonT('ui.actions.delete')}
      />
    </div>
  );
}
