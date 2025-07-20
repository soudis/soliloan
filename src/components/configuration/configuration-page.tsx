'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import type { ConfigurationFormData } from '@/lib/schemas/configuration';
import { type ConfigurationTabValue, useConfigurationTabsStore } from '@/store/configuration-tabs-store';
import type { ProjectWithConfiguration } from '@/types/projects';
import { useAction } from 'next-safe-action/hooks';
import { ConfigurationFormGeneral } from './configuration-form-general';

import { updateConfigurationAction } from '@/actions/projects/mutations/update-project-configuration';
import { convertEmptyToNull } from '@/lib/utils/form';
import { useProjects } from '@/store/projects-store';
import { toast } from 'sonner';
import { ConfigurationFormLender } from './configuration-form-lender';
import { ConfigurationFormLoans } from './configuration-form-loans';

type Props = {
  project: ProjectWithConfiguration;
};

export const ConfigurationPage = ({ project }: Props) => {
  const t = useTranslations('dashboard.configuration');
  const commonT = useTranslations('common');
  const { getActiveTab, setActiveTab } = useConfigurationTabsStore();
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { setSelectedProject } = useProjects();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState(false);
  const activeTab = getActiveTab(project.id);
  const router = useRouter();

  const { executeAsync: updateConfiguration, isExecuting } = useAction(updateConfigurationAction);

  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab && project && !initialized && router) {
      setActiveTab(project.id, tab as ConfigurationTabValue);
      setInitialized(true);
      router.replace('/configuration');
    }
  }, [project, tab, setActiveTab, initialized, router]);

  const handleSubmit = async (data: Partial<ConfigurationFormData>) => {
    setError(null);

    console.log('data 2', data);

    // Update the configuration using the server action
    const result = await updateConfiguration({
      projectId: project.id,
      data: convertEmptyToNull(data),
    });

    if (result.serverError) {
      setError(result.serverError);
    } else if (result.data?.project) {
      // Update the project store with the new configuration
      setSelectedProject(result.data.project);

      // Show success message
      toast.success(t('form.success'));
      router.replace(pathname, { scroll: true });
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(project.id, value as ConfigurationTabValue)}>
      <TabsList className="mt-2">
        <div className="mb-4 mr-10">
          <h1 className="text-3xl font-bold whitespace-nowrap">{project.name}</h1>
        </div>
        <div className="flex flex-row gap-4 overflow-x-auto">
          <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
          <TabsTrigger value="lender">{t('tabs.lender')}</TabsTrigger>
          <TabsTrigger value="loans">{t('tabs.loans')}</TabsTrigger>
          <TabsTrigger value="templates">{t('tabs.templates')}</TabsTrigger>
          <TabsTrigger value="files">{t('tabs.files')}</TabsTrigger>
        </div>
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
      <TabsContent value="templates">Templates</TabsContent>
      <TabsContent value="files">Files</TabsContent>
    </Tabs>
  );
};
