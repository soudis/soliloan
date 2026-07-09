'use client';

import type { BankConnection as BankConnectionModel, Country } from '@prisma/client';
import { ArrowDownToLine, Landmark, Link2, Loader2, Unlink } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteBankConnectionAction } from '@/actions/gocardless/mutations/delete-bank-connection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { LinkBankAccountDialog } from './link-bank-account-dialog';

type Props = {
  projectId: string;
  connections: BankConnectionModel[];
  defaultCountry?: Country | null;
};

export function BankConnection({ projectId, connections, defaultCountry }: Props) {
  const t = useTranslations('dashboard.configuration.gocardless');
  const tImport = useTranslations('dashboard.transactions.import');
  const format = useFormatter();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { execute: unlink, isExecuting: isUnlinking } = useAction(deleteBankConnectionAction, {
    onSuccess: () => {
      toast.success(t('unlinkSuccess'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('errorGeneric'));
    },
  });

  // Only a single connection is allowed for now.
  const connection = connections[0] ?? null;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'LN':
        return t('statusLinked');
      case 'EX':
        return t('statusExpired');
      case 'RJ':
        return t('statusRejected');
      default:
        return t('statusPending');
    }
  };

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'LN':
        return 'default';
      case 'EX':
      case 'RJ':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{t('sectionTitle')}</div>

      {connection ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-3 min-w-0">
            {connection.institutionLogo ? (
              // biome-ignore lint/performance/noImgElement: needed
              <img
                src={connection.institutionLogo}
                alt={connection.institutionName ?? connection.institutionId}
                className="h-8 w-8 rounded object-contain"
              />
            ) : (
              <Landmark className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{connection.institutionName ?? connection.institutionId}</div>
              <div className="text-xs text-muted-foreground">
                {t('accountsCount', { count: connection.accountIds.length })}
              </div>
              {connection.accessExpiresAt ? (
                <div className="text-xs text-muted-foreground">
                  {new Date(connection.accessExpiresAt).getTime() <= Date.now()
                    ? t('accessExpiredOn', {
                        date: format.dateTime(connection.accessExpiresAt, { dateStyle: 'medium' }),
                      })
                    : t('accessExpiresOn', {
                        date: format.dateTime(connection.accessExpiresAt, { dateStyle: 'medium' }),
                      })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant(connection.status)}>{statusLabel(connection.status)}</Badge>
            <div className="flex flex-col items-center gap-2 border-l border-border pl-2">
              {connection.status === 'LN' ? (
                <Button
                  type="button"
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/transactions/import')}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  {tImport('button')}
                </Button>
              ) : null}
              <Button
                className="w-full"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => unlink({ projectId, connectionId: connection.id })}
                disabled={isUnlinking}
              >
                {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                {t('unlink')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>
            <Link2 className="h-4 w-4" />
            {t('linkButton')}
          </Button>
          <LinkBankAccountDialog
            projectId={projectId}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            defaultCountry={defaultCountry}
          />
        </>
      )}
    </div>
  );
}
