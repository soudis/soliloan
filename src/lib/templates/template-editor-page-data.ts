import type { TemplateDataset, TemplateType } from '@prisma/client';

import { getMergeTagConfigAction, type MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';
import { getProjectLogoAction } from '@/actions/templates/queries/get-project-logo';
import {
  getProjectsForTemplateSampleAction,
  getSampleLendersAction,
  getSampleLenderYearsAction,
  getSampleLoansAction,
} from '@/actions/templates/queries/get-template-data';

export type SampleLenderRow = Awaited<ReturnType<typeof getSampleLendersAction>>[number];
export type SampleLoanRow = Awaited<ReturnType<typeof getSampleLoansAction>>[number];

export type TemplateEditorPageData = {
  mergeTagConfig: MergeTagConfig;
  projectLogo: string | null;
  /** Projects for admin sample picker (global template without project). */
  sampleProjects: Array<{ id: string; name: string }>;
  /** Project used for merge tags, logo, and sample lists (matches first sample project when admin picker applies). */
  effectivePreviewProjectId: string | null;
  sampleLenders: Awaited<ReturnType<typeof getSampleLendersAction>>;
  sampleLoans: Awaited<ReturnType<typeof getSampleLoansAction>>;
  /** For `LENDER_YEARLY`: reporting years per sample lender id. */
  lenderYearsByLenderId: Record<string, number[]>;
};

/**
 * Loads merge tag config, logo, and sample records for the template editor (server components).
 * Mirrors client preview context: `template.projectId ?? routeProjectId`, with admin global + no route project → first available project.
 */
export async function loadTemplateEditorPageData(params: {
  template: {
    dataset: TemplateDataset;
    type: TemplateType;
    projectId: string | null;
    isGlobal: boolean;
  };
  /** Current project from the URL (configuration route). */
  routeProjectId?: string;
  isAdmin: boolean;
}): Promise<TemplateEditorPageData> {
  const { template, routeProjectId, isAdmin } = params;
  const contextProjectId = template.projectId ?? routeProjectId ?? null;
  const needsProjectPickerForSample = isAdmin && template.isGlobal && !contextProjectId;

  let sampleProjects: Array<{ id: string; name: string }> = [];
  let effectivePreviewProjectId = contextProjectId;

  if (needsProjectPickerForSample) {
    sampleProjects = await getProjectsForTemplateSampleAction();
    effectivePreviewProjectId = sampleProjects[0]?.id ?? null;
  }

  const mergeTagConfig = await getMergeTagConfigAction(
    template.dataset,
    effectivePreviewProjectId ?? undefined,
    template.type,
  );

  const projectLogo = effectivePreviewProjectId != null ? await getProjectLogoAction(effectivePreviewProjectId) : null;

  let sampleLenders: Awaited<ReturnType<typeof getSampleLendersAction>> = [];
  let sampleLoans: Awaited<ReturnType<typeof getSampleLoansAction>> = [];
  const lenderYearsByLenderId: Record<string, number[]> = {};

  if (effectivePreviewProjectId) {
    const { dataset } = template;
    if (dataset === 'LENDER' || dataset === 'LENDER_YEARLY') {
      sampleLenders = await getSampleLendersAction(effectivePreviewProjectId);
      if (dataset === 'LENDER_YEARLY' && sampleLenders.length > 0) {
        await Promise.all(
          sampleLenders.map(async (lender) => {
            lenderYearsByLenderId[lender.id] = await getSampleLenderYearsAction(lender.id);
          }),
        );
      }
    } else if (dataset === 'LOAN') {
      sampleLoans = await getSampleLoansAction(effectivePreviewProjectId);
    }
  }

  return {
    mergeTagConfig,
    projectLogo,
    sampleProjects,
    effectivePreviewProjectId,
    sampleLenders,
    sampleLoans,
    lenderYearsByLenderId,
  };
}
