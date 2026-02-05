'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PlusCircle, Unlink } from 'lucide-react';
import type { ProjectWithConfiguration } from '@/types/projects';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormSection } from '@/components/ui/form-section';
import { AddManagerDialog } from './add-manager-dialog';

type Props = {
  project: ProjectWithConfiguration;
};

export function ConfigurationFormManagers({ project }: Props) {
  const t = useTranslations('dashboard.configuration');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const handleManagerAdded = () => {
    setAddDialogOpen(false);
  };

  const managers = project.managers ?? [];

  return (
    <div className="space-y-6">
      <FormSection title={t('form.managersTitle')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{t('form.email')}</TableHead>
              <TableHead className="w-[200px]">{t('form.name')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.length > 0 ? (
              managers.map((manager) => {
                const isPending = manager.emailVerified == null;
                return (
                  <TableRow key={manager.id}>
                    <TableCell>{manager.email ?? '–'}</TableCell>
                    <TableCell>{manager.name || '–'}</TableCell>
                    <TableCell>
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          {t('form.statusPendingInvite')}
                          <button
                            type="button"
                            className="text-primary underline hover:no-underline"
                            onClick={() => {}}
                          >
                            {t('form.sendAgain')}
                          </button>
                        </span>
                      ) : (
                        t('form.statusActive')
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {}}
                        title={t('form.unlinkManager')}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  {t('form.noManagers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAddDialogOpen(true)}
          className="mt-4"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('form.addManager')}
        </Button>
      </FormSection>
      <AddManagerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project.id}
        onManagerAdded={handleManagerAdded}
      />
    </div>
  );
}
