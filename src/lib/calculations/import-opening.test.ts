import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { importOpeningZahlungen } from './import-opening';

describe('importOpeningZahlungen', () => {
  it('books the Einlagenstand as Einzahlung and the rest of the Kontostand as Zinsübertrag', () => {
    assert.deepEqual(importOpeningZahlungen(10_500, 10_000), { einzahlung: 10_000, zinsuebertrag: 500 });
  });

  it('works in whole cents', () => {
    // 1234.57 - 1000.1 is 234.47000000000003 in floating point.
    assert.deepEqual(importOpeningZahlungen(1234.57, 1000.1), { einzahlung: 1000.1, zinsuebertrag: 234.47 });
    assert.deepEqual(importOpeningZahlungen(0.3, 0.1), { einzahlung: 0.1, zinsuebertrag: 0.2 });
  });

  it('gives no Zinsübertrag when the Kontostand equals the Einlagenstand', () => {
    assert.deepEqual(importOpeningZahlungen(7777.77, 7777.77), { einzahlung: 7777.77, zinsuebertrag: 0 });
  });
});
