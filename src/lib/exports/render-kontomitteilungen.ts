import 'server-only';

import { generateTemplatePdfBuffer, resolvePdfLogoUrl } from '@/lib/templates/generate-template-pdf';
import { resolveSystemTemplate } from '@/lib/templates/resolve-system-template';
import { getLendersYearlyTemplateData } from '@/lib/templates/template-data';
import { resolveTemplateFilename } from '@/lib/templates/template-subject-filename';
import type { JahreslisteLender } from './jahresliste';
import type { RenderedKontomitteilung } from './kontomitteilungen-zip';

export const KONTOMITTEILUNG_TEMPLATE_KEY = 'yearly-account-notification';

/**
 * Prepares a renderer for the Kontomitteilungen of one year from the project's "Jährliche Kontomitteilung"
 * template (its own version if it has one). Caller must enforce project access.
 */
export async function kontomitteilungRendererUnsafe(options: {
  projectId: string;
  year: number;
  lenders: JahreslisteLender[];
  logo: string | null;
}): Promise<(lender: JahreslisteLender) => Promise<RenderedKontomitteilung>> {
  const { projectId, year, lenders } = options;
  const template = await resolveSystemTemplate(KONTOMITTEILUNG_TEMPLATE_KEY, projectId, 'DOCUMENT');
  if (!template) {
    throw new Error('error.exports.templateNotFound');
  }

  const mergeDataByLender = await getLendersYearlyTemplateData(
    projectId,
    lenders.map((lender) => lender.id),
    year,
  );
  const logoUrl = await resolvePdfLogoUrl(options.logo);
  const design = template.designJson as Record<string, unknown>;
  const fallbackName = template.name.replace(/[/\\?%*:|"<>]/g, '_');

  return async (lender) => {
    const mergeData = mergeDataByLender.get(lender.id);
    if (!mergeData) {
      throw new Error(`Kontomitteilung data missing for Kreditgeber*in ${lender.lenderNumber}`);
    }
    const pdf = await generateTemplatePdfBuffer({ design, sampleData: mergeData, logoUrl });
    return { fileName: resolveTemplateFilename(template.subjectOrFilename, mergeData, fallbackName), pdf };
  };
}
