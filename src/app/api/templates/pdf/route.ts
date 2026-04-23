import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { generateTemplatePdfBuffer } from '@/lib/templates/generate-template-pdf';

/**
 * POST /api/templates/pdf
 *
 * Body: { design, sampleData?, logoUrl? }
 *   - design: editor JSON (query.serialize() or stored design) — required
 *   - sampleData: merge data for {{tags}} and {{#loop}}
 *   - logoUrl: optional logo URL for images with useLogoSource
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const assetBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : new URL(request.url).origin;

    const body = await request.json();
    if (body.design == null || typeof body.design !== 'object') {
      return new NextResponse('Missing or invalid "design" in body', { status: 400 });
    }

    const buffer = await generateTemplatePdfBuffer({
      design: body.design as Record<string, unknown>,
      sampleData: (body.sampleData as Record<string, unknown>) ?? {},
      logoUrl: body.logoUrl as string | undefined,
      assetBaseUrl,
    });

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error', error);
    return new NextResponse(JSON.stringify({ error: 'PDF generation failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
