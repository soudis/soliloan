import { spawn } from 'node:child_process';
import path from 'node:path';
import React from 'react';

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

export type GenerateTemplatePdfParams = {
  design: Record<string, unknown>;
  sampleData: Record<string, unknown>;
  logoUrl?: string | null;
  /** e.g. `http://localhost:3000` or `new URL(request.url).origin` */
  assetBaseUrl: string;
};

/**
 * Shared PDF generation for POST `/api/templates/pdf` and GET document download.
 */
export async function generateTemplatePdfBuffer(params: GenerateTemplatePdfParams): Promise<Uint8Array> {
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

  const resolvedLogoUrl = await resolvePdfLogoUrl(params.logoUrl as string | undefined, params.assetBaseUrl);

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
      design: params.design,
      sampleData: params.sampleData,
      logoUrl: resolvedLogoUrl,
      assetBaseUrl: params.assetBaseUrl,
    },
    { Document, Page, View, Text: PdfText, Image: PdfImage },
  );

  const paddingTop = parts.header ? Math.ceil(parts.headerHeight) : 0;
  const paddingBottom = parts.footer ? Math.ceil(parts.footerHeight) : 0;

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
  return new Uint8Array(buffer);
}
