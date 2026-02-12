import { NextResponse } from 'next/server';
import React from 'react';

import { auth } from '@/lib/auth';

/**
 * POST /api/templates/pdf
 *
 * Accepts { html: string } in the request body and returns an A4 PDF file
 * generated via @react-pdf/renderer + react-pdf-html.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const html: string = body.html;

    if (!html || typeof html !== 'string') {
      return new NextResponse('Missing or invalid "html" field', { status: 400 });
    }

    // Dynamic imports to avoid bundling issues with Next.js App Router
    const { Document, Font, Page, renderToBuffer } = await import('@react-pdf/renderer');
    const { default: Html } = await import('react-pdf-html');

    // Register Inter font from Google Fonts so react-pdf can render it
    Font.register({
      family: 'Inter',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
      ],
    });

    // Sanitise the HTML for react-pdf-html:
    // 1. Remove <link> / <meta> tags (no renderer)
    // 2. Remove unsupported CSS properties
    // 3. Collapse font-family declarations to just 'Inter' (react-pdf doesn't support fallback chains)
    const sanitised = html
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<meta[^>]*\/?>/gi, '')
      .replace(/box-sizing\s*:\s*[^;"]+;?/gi, '')
      .replace(/-webkit-font-smoothing\s*:\s*[^;"]+;?/gi, '')
      .replace(/font-family\s*:\s*[^;"]+/gi, "font-family: 'Inter'");

    // Build the react-pdf Document
    const PdfDocument = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        {
          size: 'A4',
          style: {
            padding: 0,
            fontFamily: 'Inter',
            fontSize: 12,
          },
        },
        React.createElement(Html, {
          children: sanitised,
          style: { fontSize: 12 },
        }),
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
    console.error('PDF generation error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'PDF generation failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
