'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BucketRow = {
  id: string;
  draft: string;
};

function newBucketId(): string {
  return crypto.randomUUID();
}

function parseDraft(draft: string): number | null {
  const parsed = Number.parseFloat(draft.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function rowsFromThresholds(thresholds: number[]): BucketRow[] {
  return thresholds.map((value) => ({ id: newBucketId(), draft: String(value) }));
}

function commitRows(rows: BucketRow[]): { rows: BucketRow[]; values: number[] } {
  const parsed = rows
    .map((row) => ({ row, value: parseDraft(row.draft) }))
    .filter((entry): entry is { row: BucketRow; value: number } => entry.value !== null)
    .sort((a, b) => a.value - b.value);

  const unique: { row: BucketRow; value: number }[] = [];
  for (const entry of parsed) {
    const previous = unique[unique.length - 1];
    if (!previous || previous.value !== entry.value) {
      unique.push(entry);
    }
  }

  return {
    rows: unique.map((entry) => ({ id: entry.row.id, draft: String(entry.value) })),
    values: unique.map((entry) => entry.value),
  };
}

function sameThresholds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function NumericBucketEditor({
  thresholds,
  onChange,
  translationNamespace = 'dashboard.customizer.chartDiscriminator',
  hintKey = 'numericBucketsHint',
  seedThreshold = 1000,
  step = 'any',
}: {
  thresholds: number[];
  onChange: (thresholds: number[]) => void;
  translationNamespace?: string;
  hintKey?: string;
  seedThreshold?: number;
  step?: string;
}) {
  const t = useTranslations(translationNamespace);
  const [rows, setRows] = useState<BucketRow[]>(() => rowsFromThresholds(thresholds));
  const rowsRef = useRef(rows);
  const committedRef = useRef(thresholds);
  rowsRef.current = rows;
  const externalKey = thresholds.join('\u0001');
  const committedKey = committedRef.current.join('\u0001');

  if (externalKey !== committedKey) {
    committedRef.current = thresholds;
    setRows(rowsFromThresholds(thresholds));
  }

  const publish = (nextRows: BucketRow[]) => {
    const committed = commitRows(nextRows);
    committedRef.current = committed.values;
    setRows(committed.rows);
    if (!sameThresholds(committed.values, thresholds)) {
      onChange(committed.values);
    }
  };

  const updateDraft = (id: string, draft: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, draft } : row)));
  };

  const addThreshold = () => {
    const lastValue = [...rows]
      .map((row) => parseDraft(row.draft))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)
      .at(-1);
    const nextValue = lastValue === undefined ? seedThreshold : lastValue * 2 || seedThreshold;
    publish([...rowsRef.current, { id: newBucketId(), draft: String(nextValue) }]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('numericBuckets')}</Label>
      <p className="text-xs text-muted-foreground">{t(hintKey)}</p>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <Input
            type="text"
            inputMode={step === '1' ? 'numeric' : 'decimal'}
            value={row.draft}
            onChange={(e) => updateDraft(row.id, e.target.value)}
            onBlur={() => publish(rowsRef.current)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={t('removeBucket')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => publish(rowsRef.current.filter((entry) => entry.id !== row.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addThreshold}>
        <Plus className="mr-1 h-3 w-3" />
        {t('addBucket')}
      </Button>
    </div>
  );
}
