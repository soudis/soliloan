import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCsv } from './csv';
import { BASE_COLUMNS, guessColumnMapping, restoreColumnMapping } from './system-columns';
import { detectDateOrder, detectDecimalSeparator, matchOption, parseDate, parseNumber, parsePercent } from './values';

const text = (v: string) => ({ t: 's' as const, v });

describe('parseNumber', () => {
  it('reads German and English notation', () => {
    assert.equal(parseNumber(text('1.234,56'), ','), 1234.56);
    assert.equal(parseNumber(text('1,234.56'), '.'), 1234.56);
    assert.equal(parseNumber(text('€ 10.000'), ','), 10000);
    assert.equal(parseNumber(text("12'500.50"), '.'), 12500.5);
    assert.equal(parseNumber(text('-5,5'), ','), -5.5);
    assert.equal(parseNumber({ t: 'n', v: 42.5 }, ','), 42.5);
  });

  it('rejects text that is not a number', () => {
    assert.equal(parseNumber(text('zehn'), ','), null);
    assert.equal(parseNumber(text('1,2,3'), ','), null);
  });
});

describe('parsePercent', () => {
  it('takes plain numbers as percent and converts percent-formatted cells', () => {
    assert.equal(parsePercent(text('1,5'), ','), 1.5);
    assert.equal(parsePercent(text('1,5 %'), ','), 1.5);
    assert.equal(parsePercent({ t: 'n', v: 0.015, percent: true }, ','), 1.5);
    assert.equal(parsePercent({ t: 'n', v: 2 }, ','), 2);
  });
});

describe('parseDate', () => {
  it('reads day-first, ISO and month-first dates', () => {
    assert.equal(parseDate(text('31.12.2024'), 'DMY'), '2024-12-31');
    assert.equal(parseDate(text('1.2.24'), 'DMY'), '2024-02-01');
    assert.equal(parseDate(text('2024-12-31'), 'DMY'), '2024-12-31');
    assert.equal(parseDate(text('12/31/2024'), 'MDY'), '2024-12-31');
    assert.equal(parseDate({ t: 'd', v: '2025-01-15' }, 'DMY'), '2025-01-15');
  });

  it('rejects impossible dates', () => {
    assert.equal(parseDate(text('31.02.2024'), 'DMY'), null);
    assert.equal(parseDate(text('morgen'), 'DMY'), null);
  });
});

describe('format detection', () => {
  it('detects the decimal separator', () => {
    assert.equal(detectDecimalSeparator([text('1.000,50'), text('20,5')]), ',');
    assert.equal(detectDecimalSeparator([text('1,000.50'), text('20.5')]), '.');
    assert.equal(detectDecimalSeparator([text('1000')]), null);
  });

  it('detects the date order', () => {
    assert.equal(detectDateOrder([text('01.02.2024'), text('31.12.2024')]), 'DMY');
    assert.equal(detectDateOrder([text('12/31/2024')]), 'MDY');
    assert.equal(detectDateOrder([text('2024-12-31')]), 'YMD');
  });
});

describe('matchOption', () => {
  it('matches codes and labels ignoring case, umlauts and punctuation', () => {
    const country = BASE_COLUMNS.find((entry) => entry.key === 'lender.country')?.options ?? {};
    assert.equal(matchOption('Österreich', country), 'AT');
    assert.equal(matchOption('oesterreich', country), 'AT');
    assert.equal(matchOption('de', country), 'DE');
    assert.equal(matchOption('Atlantis', country), null);
  });
});

describe('parseCsv', () => {
  it('detects the delimiter, decodes Windows-1252 and keeps quoted fields together', () => {
    const csv = 'Vorname;Nachname;Notiz\r\nJörg;Müller;"Hallo; ""Welt""\nzweite Zeile"\r\n\r\nAda;Lovelace;\r\n';
    const bytes = Uint8Array.from([...csv].map((char) => char.charCodeAt(0)));
    const parsed = parseCsv(bytes);
    assert.equal(parsed.options.delimiter, ';');
    assert.equal(parsed.options.encoding, 'windows-1252');
    assert.deepEqual(parsed.table.headers, ['Vorname', 'Nachname', 'Notiz']);
    assert.equal(parsed.table.rows.length, 2);
    assert.deepEqual(parsed.table.rows[0]?.[2], { t: 's', v: 'Hallo; "Welt"\nzweite Zeile' });
    assert.equal(parsed.table.rows[1]?.[2], null);
  });

  it('reads UTF-8 with a byte order mark', () => {
    const parsed = parseCsv(new TextEncoder().encode('﻿Name,Ort\nA,Graz\n'));
    assert.equal(parsed.options.encoding, 'utf-8');
    assert.equal(parsed.options.delimiter, ',');
    assert.deepEqual(parsed.table.headers, ['Name', 'Ort']);
  });
});

describe('column mapping', () => {
  it('assigns file columns by header name, each column once', () => {
    const mapping = guessColumnMapping(['Vorname', 'Nachname', 'E-Mail', 'Zinssatz', 'Stichtag', 'Foo'], BASE_COLUMNS);
    assert.deepEqual(mapping, {
      'lender.firstName': 0,
      'lender.lastName': 1,
      'lender.email': 2,
      'loan.interestRate': 3,
      'opening.stichtag': 4,
    });
  });

  it('restores a saved mapping onto a file with reordered columns', () => {
    const restored = restoreColumnMapping(
      { 'lender.firstName': 0, 'lender.lastName': 1 },
      ['Vorname', 'Name'],
      ['Name', 'Ort', 'Vorname'],
    );
    assert.deepEqual(restored, { 'lender.firstName': 2, 'lender.lastName': 0 });
  });
});
