'use client';

import { Country, InterestMethod, Language, Salutation, SoliLoansTheme, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProjectDialog } from '@/components/projects/project-dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { createColumn, createCountryColumn, createEnumBadgeColumn, enumFilter } from '@/lib/table-column-utils';
import { useProjects } from '@/store/projects-store';
import type { ProjectWithConfiguration } from '@/types/projects';

export default function ProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { projects, isLoading, setSelectedProject } = useProjects();
  const t = useTranslations('dashboard.projects');
  const configT = useTranslations('dashboard.configuration.table');
  const commonT = useTranslations('common');
  const errorT = useTranslations('error');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if user is admin
  if (!session) {
    return null;
  }

  if (!session.user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{errorT('accessOnlyForAdministators.title')}</h2>
          <p className="text-muted-foreground">{errorT('accessOnlyForAdministators.message')}</p>
        </div>
      </div>
    );
  }

  const columns: ColumnDef<ProjectWithConfiguration>[] = [
    // Configuration Text Fields
    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.name',
        header: 'name',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'slug',
        header: 'table.slug',
      },
      t,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'managers',
        header: 'table.managers',
        accessorFn: (row: ProjectWithConfiguration) => {
          return row.managers.map((manager) => manager.name).join(', ');
        },
        cell: ({ row }) => {
          const managers = row.original.managers;
          if (!managers || managers.length === 0) return '';
          return managers.map((manager) => manager.name).join(', ');
        },
        filterFn: (row, columnId, filterValue) => {
          const managers = row.original.managers;
          if (!managers || managers.length === 0) return false;
          const managerNames = managers.map((m) => m.name.toLowerCase()).join(' ');
          const searchValue = String(filterValue).toLowerCase();
          return managerNames.includes(searchValue);
        },
        sortingFn: (rowA, rowB, columnId) => {
          const managersA = rowA.original.managers.map((m) => m.name).join(', ');
          const managersB = rowB.original.managers.map((m) => m.name).join(', ');
          return managersA.localeCompare(managersB);
        },
      },
      t,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.email',
        header: 'email',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.telNo',
        header: 'telNo',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.website',
        header: 'website',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.street',
        header: 'street',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.addon',
        header: 'addon',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.zip',
        header: 'zip',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.place',
        header: 'place',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.iban',
        header: 'iban',
      },
      configT,
    ),

    createColumn<ProjectWithConfiguration>(
      {
        accessorKey: 'configuration.bic',
        header: 'bic',
      },
      configT,
    ),

    // Configuration Enum Fields - Country
    createCountryColumn<ProjectWithConfiguration>('configuration.country', 'country', configT, commonT),

    createEnumBadgeColumn<ProjectWithConfiguration>(
      'configuration.userLanguage',
      'userLanguage',
      'enums.language',
      configT,
      commonT,
    ),

    createEnumBadgeColumn<ProjectWithConfiguration>(
      'configuration.userTheme',
      'userTheme',
      'enums.theme',
      configT,
      commonT,
    ),

    createEnumBadgeColumn<ProjectWithConfiguration>(
      'configuration.lenderSalutation',
      'lenderSalutation',
      'enums.lender.salutation',
      configT,
      commonT,
    ),

    // Configuration Enum Fields - Lender Country
    createCountryColumn<ProjectWithConfiguration>('configuration.lenderCountry', 'lenderCountry', configT, commonT),

    createEnumBadgeColumn<ProjectWithConfiguration>(
      'configuration.interestMethod',
      'interestMethod',
      'enums.interestMethod',
      configT,
      commonT,
    ),
  ];

  // Define column filters based on data types
  const columnFilters = {
    // Configuration Text Field Filters
    configuration_name: {
      type: 'text' as const,
      label: configT('name'),
    },
    slug: {
      type: 'text' as const,
      label: t('table.slug'),
    },
    managers: {
      type: 'text' as const,
      label: t('table.managers'),
    },
    configuration_email: {
      type: 'text' as const,
      label: configT('email'),
    },
    configuration_telNo: {
      type: 'text' as const,
      label: configT('telNo'),
    },
    configuration_website: {
      type: 'text' as const,
      label: configT('website'),
    },
    configuration_street: {
      type: 'text' as const,
      label: configT('street'),
    },
    configuration_addon: {
      type: 'text' as const,
      label: configT('addon'),
    },
    configuration_zip: {
      type: 'text' as const,
      label: configT('zip'),
    },
    configuration_place: {
      type: 'text' as const,
      label: configT('place'),
    },
    configuration_iban: {
      type: 'text' as const,
      label: configT('iban'),
    },
    configuration_bic: {
      type: 'text' as const,
      label: configT('bic'),
    },
    // Configuration Enum Field Filters
    configuration_country: {
      type: 'select' as const,
      label: configT('country'),
      options: Object.entries(Country).map(([key, value]) => ({
        label: commonT(`countries.${value.toLowerCase()}`),
        value: value,
      })),
    },
    configuration_userLanguage: {
      type: 'select' as const,
      label: configT('userLanguage'),
      options: Object.entries(Language).map(([key, value]) => ({
        label: commonT(`enums.language.${key}`),
        value: value,
      })),
    },
    configuration_userTheme: {
      type: 'select' as const,
      label: configT('userTheme'),
      options: Object.entries(SoliLoansTheme).map(([key, value]) => ({
        label: commonT(`enums.theme.${key}`),
        value: value,
      })),
    },
    configuration_lenderSalutation: {
      type: 'select' as const,
      label: configT('lenderSalutation'),
      options: Object.entries(Salutation).map(([key, value]) => ({
        label: commonT(`enums.lender.salutation.${key}`),
        value: value,
      })),
    },
    configuration_lenderCountry: {
      type: 'select' as const,
      label: configT('lenderCountry'),
      options: Object.entries(Country).map(([key, value]) => ({
        label: commonT(`countries.${value.toLowerCase()}`),
        value: value,
      })),
    },
    configuration_interestMethod: {
      type: 'select' as const,
      label: configT('interestMethod'),
      options: Object.entries(InterestMethod).map(([key, value]) => ({
        label: commonT(`enums.interestMethod.${key}`),
        value: value,
      })),
    },
  };

  // Define default column visibility
  const defaultColumnVisibility = {
    configuration_name: true,
    slug: false,
    managers: false,
    configuration_email: true,
    configuration_telNo: false,
    configuration_website: true,
    configuration_street: true,
    configuration_addon: false,
    configuration_zip: false,
    configuration_place: true,
    configuration_iban: false,
    configuration_bic: false,
    configuration_country: true,
    configuration_userLanguage: false,
    configuration_userTheme: false,
    configuration_lenderSalutation: false,
    configuration_lenderCountry: false,
    configuration_interestMethod: false,
  };

  if (isLoading) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new.title')}
        </Button>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <DataTable
        columns={columns}
        data={projects}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.PROJECT}
        showFilter={true}
        onRowClick={(row) => {
          setSelectedProject(row);
          router.push('/configuration');
        }}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(row);
                      router.push('/configuration');
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{commonT('ui.actions.edit')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commonT('ui.actions.edit')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      />
    </div>
  );
}
