'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Info, Key, Mail, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { sendInvitationEmailAction } from '@/actions/users';
import { InfoItem } from '@/components/ui/info-item';
import { hasAdditionalFields } from '@/lib/utils/additional-fields';
import { formatAddressPlace } from '@/lib/utils/format';
import { useProjects } from '@/store/projects-store';
import type { LenderWithCalculations } from '@/types/lenders';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { SectionCard } from '../generic/section-card';
import { Button } from '../ui/button';

interface LenderContactSectionProps {
  lender: LenderWithCalculations;
}

export function LenderContactSection({ lender }: LenderContactSectionProps) {
  const t = useTranslations('dashboard.lenders');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const { selectedProject } = useProjects();
  const queryClient = useQueryClient();
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const lenderName =
    lender.type === 'PERSON'
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
      : lender.organisationName;

  const hasContactInfo = lender.email || lender.telNo;
  const hasAddressInfo = lender.street || lender.addon || lender.zip || lender.place;
  const hasBankingInfo = lender.iban || lender.bic;
  const showAdditionalFields = hasAdditionalFields(
    lender.additionalFields,
    selectedProject?.configuration.lenderAdditionalFields,
  );

  const handleSendInvitation = async () => {
    if (!lender.user) return;
    setIsSendingInvitation(true);
    try {
      const result = await sendInvitationEmailAction({ lenderId: lender.id });
      if (result?.data?.success) {
        toast.success(t('details.invitationSent'));
        queryClient.invalidateQueries({ queryKey: ['lender'] });
      } else {
        toast.error(result?.serverError || t('details.invitationError'));
      }
    } catch {
      toast.error(t('details.invitationError'));
    } finally {
      setIsSendingInvitation(false);
    }
  };

  return (
    <div id="contact" className="scroll-mt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Info */}
        <SectionCard title={t('details.contactInfo')} icon={<User className="h-4 w-4 text-muted-foreground" />}>
          <div className="grid grid-cols-1 gap-3">
            {lenderName && <InfoItem label={t('table.name')} value={lenderName} showCopyButton />}
            {hasContactInfo && (
              <>
                {lender.email && <InfoItem label={t('table.email')} value={lender.email} showCopyButton />}
                {lender.telNo && <InfoItem label={t('table.telNo')} value={lender.telNo} showCopyButton />}
              </>
            )}
            {hasAddressInfo && (
              <InfoItem
                label={t('details.address')}
                value={
                  <>
                    {lender.street && <div>{lender.street}</div>}
                    {lender.addon && <div>{lender.addon}</div>}
                    {(lender.place || lender.zip) && <div>{formatAddressPlace(lender)}</div>}
                  </>
                }
                showCopyButton
              />
            )}
            {hasBankingInfo && (
              <InfoItem
                label={t('details.banking')}
                value={
                  <>
                    {lender.iban && <div>{lender.iban}</div>}
                    {lender.bic && <div className="text-sm text-muted-foreground">{lender.bic}</div>}
                  </>
                }
                showCopyButton
                showQrButton={!!lender.iban}
                recipientName={lenderName ?? undefined}
                qrValue={lender.iban ?? undefined}
                copyValue={lender.iban ?? undefined}
              />
            )}
          </div>
        </SectionCard>

        {/* Right column: additional fields + user info */}
        <div className="flex flex-col gap-4">
          {showAdditionalFields && (
            <SectionCard
              title={t('details.additionalFields')}
              icon={<Info className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid grid-cols-1 gap-3">
                <AdditionalFieldInfoItems
                  additionalFields={lender.additionalFields}
                  configuration={selectedProject?.configuration.lenderAdditionalFields}
                />
              </div>
            </SectionCard>
          )}

          {lender.user && (
            <SectionCard title={t('details.userInfo')} icon={<Key className="h-4 w-4 text-muted-foreground" />}>
              <div className="grid grid-cols-1 gap-3">
                <InfoItem
                  label={t('details.lastLogin')}
                  value={
                    lender.user.lastLogin ? (
                      format(new Date(lender.user.lastLogin), 'PPP p', { locale: dateLocale })
                    ) : (
                      <span className="text-muted-foreground italic">{t('details.neverLoggedIn')}</span>
                    )
                  }
                />
                <div className="flex items-center justify-between">
                  <InfoItem
                    label={t('details.lastInvited')}
                    value={
                      lender.user.lastInvited ? (
                        format(new Date(lender.user.lastInvited), 'PPP p', { locale: dateLocale })
                      ) : (
                        <span className="text-muted-foreground italic">{t('details.neverInvited')}</span>
                      )
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendInvitation}
                    disabled={isSendingInvitation}
                    className="ml-2 shrink-0"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isSendingInvitation ? t('details.sendingInvitation') : t('details.sendInvitation')}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
