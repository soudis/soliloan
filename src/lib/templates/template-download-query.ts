import type { TemplateDataset } from '@prisma/client';

import type { TemplateDataOptions } from '@/lib/templates/template-data';

export type TemplateDownloadParseResult =
  | {
      ok: true;
      recordId: string;
      projectId?: string;
      options?: TemplateDataOptions;
    }
  | { ok: false; message: string };

/**
 * Maps `template.dataset` to required query params for GET `/api/templates/[id]/download`.
 */
export function parseTemplateDownloadQuery(
  dataset: TemplateDataset,
  searchParams: URLSearchParams,
): TemplateDownloadParseResult {
  const yearRaw = searchParams.get('year');
  const yearParsed = yearRaw ? Number.parseInt(yearRaw, 10) : Number.NaN;
  const year = Number.isFinite(yearParsed) ? yearParsed : undefined;
  const projectIdOpt = searchParams.get('projectId') ?? undefined;

  switch (dataset) {
    case 'USER': {
      const id = searchParams.get('userId');
      if (!id) return { ok: false, message: 'userId required' };
      return { ok: true, recordId: id };
    }
    case 'LENDER': {
      const id = searchParams.get('lenderId');
      if (!id) return { ok: false, message: 'lenderId required' };
      return { ok: true, recordId: id, projectId: projectIdOpt };
    }
    case 'LENDER_YEARLY': {
      const id = searchParams.get('lenderId');
      if (!id) return { ok: false, message: 'lenderId required' };
      if (year === undefined) return { ok: false, message: 'year required' };
      return { ok: true, recordId: id, projectId: projectIdOpt, options: { year } };
    }
    case 'LOAN': {
      const id = searchParams.get('loanId');
      if (!id) return { ok: false, message: 'loanId required' };
      return { ok: true, recordId: id, projectId: projectIdOpt };
    }
    case 'TRANSACTION': {
      const id = searchParams.get('transactionId');
      if (!id) return { ok: false, message: 'transactionId required' };
      return { ok: true, recordId: id, projectId: projectIdOpt };
    }
    case 'PROJECT':
    case 'PROJECT_YEARLY': {
      const id = searchParams.get('projectId');
      if (!id) return { ok: false, message: 'projectId required' };
      return { ok: true, recordId: id, projectId: id };
    }
    default:
      return { ok: false, message: 'unsupported dataset' };
  }
}

/** Build query params for GET download / send-email matching {@link parseTemplateDownloadQuery}. */
export function buildTemplateUseSearchParams(
  dataset: TemplateDataset,
  input: {
    projectId: string;
    lenderId?: string;
    loanId?: string;
    transactionId?: string;
    year?: number;
  },
): URLSearchParams {
  const sp = new URLSearchParams();
  switch (dataset) {
    case 'LENDER':
      if (input.lenderId) {
        sp.set('lenderId', input.lenderId);
      }
      break;
    case 'LENDER_YEARLY':
      if (input.lenderId) {
        sp.set('lenderId', input.lenderId);
      }
      if (input.year != null) {
        sp.set('year', String(input.year));
      }
      break;
    case 'LOAN':
      if (input.loanId) {
        sp.set('loanId', input.loanId);
      }
      break;
    case 'TRANSACTION':
      if (input.transactionId) {
        sp.set('transactionId', input.transactionId);
      }
      break;
    default:
      break;
  }
  sp.set('projectId', input.projectId);
  return sp;
}
