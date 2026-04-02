import { db } from '@/lib/db';
import { generateEmailHtml, getNodesMapFromDesign } from '@/lib/templates/email-generator';
import { processTemplate } from '@/lib/templates/template-processor';

/**
 * Resolve a system email template by systemKey, preferring a project-specific
 * override over the global row. Returns null if no template is found or the
 * design is empty.
 */
export async function resolveSystemTemplate(systemKey: string, projectId?: string | null) {
  const rows = await db.communicationTemplate.findMany({
    where: {
      systemKey,
      isSystem: true,
      type: 'EMAIL',
      ...(projectId
        ? { OR: [{ projectId }, { projectId: null }] }
        : { projectId: null }),
    },
    select: {
      id: true,
      designJson: true,
      dataset: true,
      projectId: true,
    },
    orderBy: { projectId: 'asc' },
  });

  // Project row sorts before null (asc), so prefer the first non-null projectId match
  const projectRow = rows.find((r) => r.projectId !== null);
  return projectRow ?? rows[0] ?? null;
}

/**
 * Render a system email template to final HTML with all merge tags replaced.
 * Returns null if the template has no usable design or produces empty output.
 */
export function renderSystemEmailTemplate(
  designJson: unknown,
  data: Record<string, unknown>,
  options?: {
    logoUrl?: string | null;
  },
): string | null {
  const nodes = getNodesMapFromDesign(designJson as Record<string, unknown>);
  if (!nodes || Object.keys(nodes).length === 0) return null;

  const rawHtml = generateEmailHtml(nodes, options);
  if (!rawHtml || rawHtml.trim().length === 0) return null;

  // biome-ignore lint/suspicious/noExplicitAny: processTemplate uses Record<string, any>
  return processTemplate(rawHtml, data as Record<string, any>);
}
