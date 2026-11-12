import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { resolvePdfLogoUrl } from './generate-template-pdf';
import { resolvePdfImageSrc } from './pdf-image-src';
import { readRasterSizeFromDataUrl } from './raster-image-size';

const hasConvert = spawnSync('convert', ['-version']).status === 0;

describe('resolvePdfLogoUrl', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = () => {
      throw new Error('PDF logo must not be fetched over HTTP');
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads the app logo from disk when the project has no logo', {
    skip: !hasConvert && 'needs ImageMagick',
  }, async () => {
    const logo = await resolvePdfLogoUrl(null);

    assert.ok(logo.startsWith('data:image/png;base64,'));
    assert.ok(readRasterSizeFromDataUrl(logo));
  });

  it('passes a non-WebP project logo through unchanged', async () => {
    const pngLogo = 'data:image/png;base64,iVBORw0KGgo=';

    assert.equal(await resolvePdfLogoUrl(pngLogo), pngLogo);
  });
});

describe('resolvePdfImageSrc', () => {
  const publicDir = path.join(path.sep, 'app', 'public');

  it('keeps data URLs', () => {
    assert.equal(resolvePdfImageSrc('data:image/png;base64,AAAA', publicDir), 'data:image/png;base64,AAAA');
  });

  it('resolves same-app paths to files under public/', () => {
    assert.equal(resolvePdfImageSrc('/images/logo.png?v=2', publicDir), path.join(publicDir, 'images', 'logo.png'));
  });

  it('drops paths that leave public/', () => {
    assert.equal(resolvePdfImageSrc('/../.env', publicDir), '');
    assert.equal(resolvePdfImageSrc('/', publicDir), '');
  });

  it('drops external URLs', () => {
    assert.equal(resolvePdfImageSrc('https://example.com/logo.png', publicDir), '');
    assert.equal(
      resolvePdfImageSrc('//example.com/logo.png', publicDir),
      path.join(publicDir, 'example.com', 'logo.png'),
    );
  });
});
