'use client';

import { Files as FilesIcon, FileText, Settings2, User, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateConfigurationAction } from '@/actions/projects/mutations/update-project-configuration';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { ConfigurationFormData } from '@/lib/schemas/configuration';
import { convertEmptyToNull } from '@/lib/utils/form';
import type { ProjectWithConfiguration } from '@/types/projects';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ConfigurationFormGeneral } from './configuration-form-general';
import { ConfigurationFormLender } from './configuration-form-lender';
import { ConfigurationFormLoans } from './configuration-form-loans';
import { ProjectTemplatesTab } from './project-templates-tab';

export type ConfigurationTabValue = 'general' | 'lender' | 'loans' | 'templates' | 'files';

type Props = {
  project: ProjectWithConfiguration;
};

export const ConfigurationPage = ({ project }: Props) => {
  const t = useTranslations('dashboard.configuration');
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['general', 'lender', 'loans', 'templates', 'files'] as const).withDefault('general'),
  );
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const { executeAsync: updateConfiguration, isExecuting } = useAction(updateConfigurationAction);

  const handleSubmit = async (data: Partial<ConfigurationFormData>) => {
    setError(null);

    // Update the configuration using the server action
    const result = await updateConfiguration({
      projectId: project.id,
      data: convertEmptyToNull(data),
    });

    if (result.serverError) {
      setError(result.serverError);
    } else if (result.data?.project) {
      // Show success message
      toast.success(t('form.success'));
      router.replace(pathname, { scroll: true });
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfigurationTabValue)}>
      <div className="mb-6 mr-10">
        <h1 className="text-3xl font-bold whitespace-nowrap">{project.configuration.name}</h1>
      </div>
      <TabsList variant="modern">
        <TabsTrigger value="general" variant="modern">
          <Settings2 className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.general')}</span>
        </TabsTrigger>
        <TabsTrigger value="lender" variant="modern">
          <User className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.lender')}</span>
        </TabsTrigger>
        <TabsTrigger value="loans" variant="modern">
          <Wallet className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.loans')}</span>
        </TabsTrigger>
        <TabsTrigger value="templates" variant="modern">
          <FileText className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.templates')}</span>
        </TabsTrigger>
        <TabsTrigger value="files" variant="modern">
          <FilesIcon className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.files')}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <ConfigurationFormGeneral
          onSubmit={handleSubmit}
          initialData={project.configuration}
          isLoading={isExecuting}
          error={error}
        />
      </TabsContent>
      <TabsContent value="lender">
        <ConfigurationFormLender
          onSubmit={handleSubmit}
          initialData={project.configuration}
          isLoading={isExecuting}
          error={error}
        />
      </TabsContent>
      <TabsContent value="loans">
        <ConfigurationFormLoans
          onSubmit={handleSubmit}
          hasHistoricTransactions={project.hasHistoricTransactions}
          initialData={project.configuration}
          isLoading={isExecuting}
          error={error}
        />
      </TabsContent>
      <TabsContent value="templates">
        <ProjectTemplatesTab projectId={project.id} />
      </TabsContent>
      <TabsContent value="files">Files</TabsContent>
    </Tabs>
  );
};
