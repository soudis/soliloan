import { NextResponse } from 'next/server';
import React from 'react';

import { auth } from '@/lib/auth';

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

    const body = await request.json();
    if (body.design == null || typeof body.design !== 'object') {
      return new NextResponse('Missing or invalid "design" in body', { status: 400 });
    }

    const { Document, Font, Page, View, Image: PdfImage, Text: PdfText, renderToBuffer } =
      await import('@react-pdf/renderer');
    const { renderDesignToPdfParts } = await import('@/lib/templates/design-to-pdf');

    Font.register({
      family: 'Inter',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
      ],
    });

    console.log('body.design', body.design);

    const parts = renderDesignToPdfParts(
      {
        design: body.design as Record<string, unknown>,
        sampleData: (body.sampleData as Record<string, unknown>) ?? {},
        logoUrl: body.logoUrl as string | undefined,
      },
      { Document, Page, View, Text: PdfText, Image: PdfImage },
    );

    // Reserve space so body doesn't overlap fixed header/footer. Use ~one line height
    // so the gap matches the editor (header height ≈ padding*2 + line).
    const LINE_HEIGHT = 16;
    const paddingTop = parts.header
      ? parts.headerPadding * 2 + LINE_HEIGHT
      : 0;
    const paddingBottom = parts.footer
      ? parts.footerPadding * 2 + LINE_HEIGHT
      : 0;

    // Header/footer are already full Container/PageHeader/PageFooter trees (with their own
    // padding and border from the design). Only wrap in a fixed-position View — no extra padding/border.
    const pageChildren: React.ReactNode[] = [];
    if (parts.header) {
      pageChildren.push(
        React.createElement(
          View,
          {
            key: 'header',
            fixed: true,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            },
          },
          parts.header,
        ),
      );
    }
    pageChildren.push(React.createElement(View, { key: 'body' }, parts.body));
    if (parts.footer) {
      pageChildren.push(
        React.createElement(
          View,
          {
            key: 'footer',
            fixed: true,
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
          },
          parts.footer,
        ),
      );
    }

    const PdfDocument = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        {
          size: 'A4',
          style: {
            paddingTop,
            paddingBottom,
            fontFamily: 'Inter',
            fontSize: 12,
          },
        },
        ...pageChildren,
      ),
    );
    const buffer = await renderToBuffer(PdfDocument);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error', error);
    return new NextResponse(
      JSON.stringify({ error: 'PDF generation failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
