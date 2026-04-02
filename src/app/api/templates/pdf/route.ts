import { spawn } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';
import React from 'react';

import { auth } from '@/lib/auth';

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
const DEFAULT_APP_LOGO_PATH = '/soliloan-logo.webp';

function convertWebpToPngDataUrl(webpBytes: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const convertProcess = spawn('convert', ['webp:-', 'png:-']);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    convertProcess.stdout.on('data', (chunk: Buffer | string) => {
      stdoutChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    convertProcess.stderr.on('data', (chunk: Buffer | string) => {
      stderrChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    convertProcess.on('error', (error) => {
      reject(error);
    });

    convertProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`WebP to PNG conversion failed: ${Buffer.concat(stderrChunks).toString('utf8')}`));
        return;
      }

      const pngBytes = Buffer.concat(stdoutChunks);
      resolve(`data:image/png;base64,${pngBytes.toString('base64')}`);
    });

    convertProcess.stdin.end(webpBytes);
  });
}

async function resolvePdfLogoUrl(logoUrl: string | undefined, assetBaseUrl: string): Promise<string | undefined> {
  if (logoUrl?.startsWith('data:image/webp;base64,')) {
    const webpBytes = Buffer.from(logoUrl.replace('data:image/webp;base64,', ''), 'base64');
    return convertWebpToPngDataUrl(webpBytes);
  }

  if (logoUrl) {
    return logoUrl;
  }

  const appLogoUrl = `${assetBaseUrl}${DEFAULT_APP_LOGO_PATH}`;
  const response = await fetch(appLogoUrl);
  if (!response.ok) {
    throw new Error(`Failed to load app logo for PDF (${response.status})`);
  }

  const logoBytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/webp';
  if (contentType.includes('image/webp')) {
    return convertWebpToPngDataUrl(logoBytes);
  }

  return `data:${contentType};base64,${logoBytes.toString('base64')}`;
}

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

    const {
      Document,
      Font,
      Page,
      View,
      Image: PdfImage,
      Text: PdfText,
      renderToBuffer,
    } = await import('@react-pdf/renderer');
    const { renderDesignToPdfParts } = await import('@/lib/templates/design-to-pdf');
    const resolvedLogoUrl = await resolvePdfLogoUrl(body.logoUrl as string | undefined, assetBaseUrl);

    // Only register upright weights. Italic registration triggers a DataView out-of-bounds
    // in react-pdf when embedding; italic text is rendered as normal in PDF to avoid the crash.
    Font.register({
      family: 'Inter',
      fonts: [
        { src: path.join(FONTS_DIR, 'inter-v20-latin-regular.ttf'), fontWeight: 400 },
        { src: path.join(FONTS_DIR, 'inter-v20-latin-500.ttf'), fontWeight: 500 },
        { src: path.join(FONTS_DIR, 'inter-v20-latin-600.ttf'), fontWeight: 600 },
        { src: path.join(FONTS_DIR, 'inter-v20-latin-700.ttf'), fontWeight: 700 },
      ],
    });

    const parts = renderDesignToPdfParts(
      {
        design: body.design as Record<string, unknown>,
        sampleData: (body.sampleData as Record<string, unknown>) ?? {},
        logoUrl: resolvedLogoUrl,
        assetBaseUrl,
      },
      { Document, Page, View, Text: PdfText, Image: PdfImage },
    );

    // Reserve space so body doesn't overlap fixed header/footer. Use ~one line height
    // so the gap matches the editor (header height ≈ padding*2 + line).
    const LINE_HEIGHT = 16;
    const paddingTop = parts.header ? parts.headerPadding * 2 + LINE_HEIGHT : 0;
    const paddingBottom = parts.footer ? parts.footerPadding * 2 + LINE_HEIGHT : 0;

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
    return new NextResponse(JSON.stringify({ error: 'PDF generation failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
