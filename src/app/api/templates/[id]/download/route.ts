import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateTemplatePdfBuffer } from '@/lib/templates/generate-template-pdf';
import { parseTemplateDownloadQuery } from '@/lib/templates/template-download-query';
import { getTemplateData } from '@/lib/templates/template-data';
import { resolveTemplateFilename } from '@/lib/templates/template-subject-filename';
import { assertManagerCanUseCommunicationTemplate } from '@/lib/templates/template-use-access';

/**
 * GET /api/templates/[id]/download
 * Query params depend on template.dataset — see `parseTemplateDownloadQuery`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: templateId } = await params;
    const template = await db.communicationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (template.type !== 'DOCUMENT') {
      return new NextResponse('Template is not a document', { status: 400 });
    }

    const userId = session.user.id as string;
    const isAdmin = Boolean(session.user.isAdmin);

    const url = new URL(request.url);
    const parsed = parseTemplateDownloadQuery(template.dataset, url.searchParams);
    if (!parsed.ok) {
      return new NextResponse(parsed.message, { status: 400 });
    }

    const canAccess = await assertManagerCanUseCommunicationTemplate({
      userId,
      isAdmin,
      template: { projectId: template.projectId, isGlobal: template.isGlobal },
      dataset: template.dataset,
      parsed,
    });
    if (!canAccess) {
      return new NextResponse('Not found', { status: 404 });
    }

    const locale = 'de';
    const templateData = await getTemplateData(
      template.dataset,
      parsed.recordId,
      locale,
      parsed.projectId ?? template.projectId ?? undefined,
      parsed.options,
    );

    if (!templateData) {
      return new NextResponse('Could not load data for template', { status: 404 });
    }

    const mergeData = templateData as Record<string, unknown>;
    let logoUrl: string | null = null;
    const configLogo = (mergeData.config as { logo?: unknown } | undefined)?.logo;
    if (typeof configLogo === 'string' && configLogo.length > 0) {
      logoUrl = configLogo;
    } else if (parsed.projectId || template.projectId) {
      const pid = parsed.projectId ?? template.projectId;
      if (pid) {
        const project = await db.project.findUnique({
          where: { id: pid },
          select: { configuration: { select: { logo: true } } },
        });
        logoUrl = project?.configuration?.logo ?? null;
      }
    }

    const assetBaseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : url.origin;

    const design = template.designJson as Record<string, unknown>;
    const pdfBytes = await generateTemplatePdfBuffer({
      design,
      sampleData: mergeData,
      logoUrl,
      assetBaseUrl,
    });

    const filename = resolveTemplateFilename(
      template.subjectOrFilename,
      mergeData,
      template.name.replace(/[/\\?%*:|"<>]/g, '_'),
    );

    const encoded = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (error) {
    console.error('Template download error', error);
    return new NextResponse(JSON.stringify({ error: 'PDF generation failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
