'use client';

import type { User } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { ClockAlert, Mail, PlusCircle, Repeat2, Unlink } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { removeProjectManagerAction } from '@/actions/projects';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import { AddManagerDialog } from './add-manager-dialog';

type Props = {
  project: ProjectWithConfiguration;
  inviteValidDays: number;
};

export function ConfigurationFormManagers({ project, inviteValidDays }: Props) {
  const t = useTranslations('dashboard.configuration');
  const { data: session } = useSession();

  if (!session?.user) throw new Error(t('managers.userNotFound'));
  const user = session?.user;

  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [unlinkDialogState, setUnlinkDialogState] = useState<{ open: boolean; manager: User | null }>({
    open: false,
    manager: null,
  });

  const { executeAsync: removeManager, isExecuting: isRemoving } = useAction(removeProjectManagerAction);

  const handleManagerAdded = () => {
    setAddDialogOpen(false);
  };

  const managers = project.managers ?? [];

  const handleUnlinkClick = (manager: User) => {
    setUnlinkDialogState({ open: true, manager });
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkDialogState.manager) return;

    const result = await removeManager({
      projectId: project.id,
      managerId: unlinkDialogState.manager.id,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.validationErrors) {
      return;
    }

    if (result?.data?.project) {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('managers.removeManagerSuccess'));
    }

    setUnlinkDialogState({ open: false, manager: null });
  };

  const isSelf = unlinkDialogState.manager && user.id === unlinkDialogState.manager.id;
  const isAdmin = user.isAdmin;

  const confirmTitle = isSelf ? t('managers.unlinkSelfConfirmTitle') : t('managers.unlinkConfirmTitle');

  const confirmDescription = isSelf
    ? isAdmin
      ? t('managers.unlinkAdminSelfConfirmDescription')
      : t('managers.unlinkSelfConfirmDescription')
    : t('managers.unlinkConfirmDescription');

  return (
    <div className="space-y-6">
      <FormSection title={t('managers.managersTitle')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{t('managers.email')}</TableHead>
              <TableHead className="w-[200px]">{t('managers.name')}</TableHead>
              <TableHead>{t('managers.status')}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.length > 0 ? (
              managers.map((manager) => {
                const isLastManager = managers.length <= 1;
                const unlinkManagerTooltip = isLastManager
                  ? t('managers.cannotUnlinkLastManagerTooltip')
                  : t('managers.unlinkManager');
                return (
                  <TableRow key={manager.id}>
                    <TableCell>{manager.email ?? '–'}</TableCell>
                    <TableCell>{manager.name || '–'}</TableCell>
                    <PendingMessage manager={manager} inviteValidDays={inviteValidDays} />
                    <TableCell>
                      <ActionButton
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        icon={<Unlink className="h-4 w-4" />}
                        tooltip={unlinkManagerTooltip}
                        onClick={() => handleUnlinkClick(manager)}
                        disabled={isLastManager}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                  {t('managers.noManagers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Button type="button" variant="outline" onClick={() => setAddDialogOpen(true)} className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('managers.addManager')}
        </Button>
      </FormSection>
      <AddManagerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project.id}
        onManagerAdded={handleManagerAdded}
      />
      <ConfirmDialog
        open={unlinkDialogState.open}
        onOpenChange={(open) => setUnlinkDialogState((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmUnlink}
        title={confirmTitle}
        description={confirmDescription}
        confirmText={isRemoving ? t('form.submitting') : undefined}
      />
    </div>
  );
}

function SendAgainButton({ onClick }: { onClick?: () => void }) {
  const t = useTranslations('dashboard.configuration');
  return (
    <Button type="button" variant="secondary" size="sm" className="h-7" onClick={onClick}>
      <Repeat2 className="h-4 w-4" />
      {t('managers.sendAgain')}
    </Button>
  );
}

type PendingMessageProps = {
  manager: User;
  inviteValidDays: number;
};

function PendingMessage({ manager, inviteValidDays }: PendingMessageProps) {
  const t = useTranslations('dashboard.configuration');
  const locale = useLocale();
  const isActive = manager.inviteToken == null;
  const lastInvitedDate = manager.lastInvited ? new Date(manager.lastInvited) : null;
  const expiresAt = lastInvitedDate
    ? new Date(lastInvitedDate.getTime() + inviteValidDays * 24 * 60 * 60 * 1000)
    : null;
  const isExpired = !!(lastInvitedDate && expiresAt && expiresAt < new Date());
  const expiresAtFormatted = expiresAt ? formatDate(expiresAt, locale) : '';
  const isPending = !isActive && !isExpired;

  return (
    <TableCell>
      {isPending && (
        <span className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {t('managers.statusPendingInvite')}
          <SendAgainButton onClick={() => {}} />
        </span>
      )}
      {isExpired && (
        <span className="flex items-center gap-2">
          <ClockAlert className="h-4 w-4" />
          {t('managers.statusExpiredInvite', { expiresAt: expiresAtFormatted })}
          <SendAgainButton onClick={() => {}} />
        </span>
      )}
      {isActive && t('managers.statusActive')}
    </TableCell>
  );
}
