import { NextResponse } from 'next/server';
import React from 'react';

import { auth } from '@/lib/auth';

/**
 * Sanitise HTML for react-pdf-html (body content only).
 */
const sanitiseHtml = (html: string): string =>
  html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*\/?>/gi, '')
    .replace(/box-sizing\s*:\s*[^;"]+;?/gi, '')
    .replace(/-webkit-font-smoothing\s*:\s*[^;"]+;?/gi, '')
    .replace(/font-family\s*:\s*[^;"]+/gi, "font-family: 'Inter'");

/**
 * Extract plain text from simple HTML (strip all tags).
 * This is used for header/footer content which we render with native
 * react-pdf Text components (not react-pdf-html) so that the `render`
 * callback for page numbers works correctly.
 */
const htmlToPlainText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

/**
 * POST /api/templates/pdf
 *
 * Body: { html: string, headerHtml?: string, footerHtml?: string }
 *
 * Header/footer are rendered with native react-pdf <View>/<Text> (not Html)
 * so that the Text `render` prop works for {{pageNumber}} / {{totalPages}}.
 *
 * Following the react-pdf docs (https://react-pdf.org/advanced):
 * - Fixed elements: <View fixed> / <Text fixed>
 * - Dynamic content: <Text render={({ pageNumber, totalPages }) => ...} fixed />
 * - Absolute positioning for bottom footer
 * - paddingTop/paddingBottom on Page to reserve space
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const html: string = body.html;
    const headerHtml: string | undefined = body.headerHtml;
    const footerHtml: string | undefined = body.footerHtml;
    const headerPadding: number = body.headerPadding ?? 16;
    const footerPadding: number = body.footerPadding ?? 16;

    if (!html || typeof html !== 'string') {
      return new NextResponse('Missing or invalid "html" field', { status: 400 });
    }

    const { Document, Font, Page, Text: PdfText, View, renderToBuffer } =
      await import('@react-pdf/renderer');
    const { default: Html } = await import('react-pdf-html');

    Font.register({
      family: 'Inter',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
      ],
    });

    const sanitisedBody = sanitiseHtml(html);

    // Extract plain text from header/footer HTML
    const headerText = headerHtml ? htmlToPlainText(headerHtml) : '';
    const footerText = footerHtml ? htmlToPlainText(footerHtml) : '';

    const hasHeader = headerText.length > 0;
    const hasFooter = footerText.length > 0;

    // Calculate the actual height needed for fixed header/footer based on padding
    // We use a base text height + 2x padding for the reserved space
    const TEXT_LINE_HEIGHT = 14; // approx height of a 10pt line
    const actualHeaderHeight = hasHeader ? TEXT_LINE_HEIGHT + headerPadding * 2 : 0;
    const actualFooterHeight = hasFooter ? TEXT_LINE_HEIGHT + footerPadding * 2 : 0;

    // Reserve space so body content doesn't overlap fixed header/footer
    const paddingTop = actualHeaderHeight;
    const paddingBottom = actualFooterHeight;

    const pageChildren: React.ReactNode[] = [];

    // ── Fixed header (top of every page) ─────────────────────────
    // Uses View(fixed, absolute top) + Text for static parts
    // and Text(render, fixed) for dynamic page numbers.
    if (hasHeader) {
      const hasPageNum =
        headerText.includes('{{pageNumber}}') || headerText.includes('{{totalPages}}');

      if (hasPageNum) {
        // Dynamic header: use Text with render prop for page numbers
        pageChildren.push(
          React.createElement(
            PdfText,
            {
              key: 'header',
              fixed: true,
              style: {
                position: 'absolute' as const,
                top: 0,
                left: 0,
                right: 0,
                padding: headerPadding,
                fontSize: 10,
                fontFamily: 'Inter',
                color: '#000000',
              },
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number; subPageNumber: number; subPageTotalPages: number }) =>
                headerText
                  .replace(/\{\{pageNumber\}\}/g, String(pageNumber))
                  .replace(/\{\{totalPages\}\}/g, String(totalPages)),
            },
          ),
        );
      } else {
        // Static header: View + Text
        pageChildren.push(
          React.createElement(
            View,
            {
              key: 'header',
              fixed: true,
              style: {
                position: 'absolute' as const,
                top: 0,
                left: 0,
                right: 0,
                padding: headerPadding,
              },
            },
            React.createElement(PdfText, {
              style: { fontSize: 10, fontFamily: 'Inter', color: '#000000' },
              children: headerText,
            }),
          ),
        );
      }
    }

    // ── Body content ─────────────────────────────────────────────
    pageChildren.push(
      React.createElement(Html, {
        key: 'body',
        children: sanitisedBody,
        style: { fontSize: 12 },
      }),
    );
    console.log('hasFooter', hasFooter, footerText, 'html',footerHtml);

    // ── Fixed footer (bottom of every page) ──────────────────────
    if (hasFooter) {
      console.log('hasFooter', hasFooter);
      console.log('footerText', footerText);
      const hasPageNum =
        footerText.includes('{{pageNumber}}') || footerText.includes('{{totalPages}}');

      if (hasPageNum) {
        // Dynamic footer: use Text with render prop (gives totalPages)
        pageChildren.push(
          React.createElement(
            PdfText,
            {
              key: 'footer',
              fixed: true,
              style: {
                position: 'absolute' as const,
                bottom: 0,
                left: 0,
                right: 0,
                padding: footerPadding,
                fontSize: 10,
                fontFamily: 'Inter',
                color: '#000000',
              },
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number; subPageNumber: number; subPageTotalPages: number }) =>
                footerText
                  .replace(/\{\{pageNumber\}\}/g, String(pageNumber))
                  .replace(/\{\{totalPages\}\}/g, String(totalPages)),
            },
          ),
        );
      } else {
        // Static footer: View + Text
        pageChildren.push(
          React.createElement(
            View,
            {
              key: 'footer',
              fixed: true,
              style: {
                position: 'absolute' as const,
                bottom: 0,
                left: 0,
                right: 0,
                padding: footerPadding,
              },
            },
            React.createElement(PdfText, {
              style: { fontSize: 10, fontFamily: 'Inter', color: '#000000' },
              children: footerText,
            }),
          ),
        );
      }
    }

    // Assemble the PDF Document
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
    console.error('PDF generation error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'PDF generation failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
