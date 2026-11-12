'use client';

import { ArrowLeft, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { commitImportAction } from '@/actions/imports/mutations/commit-import';
import { readImportFileAction } from '@/actions/imports/queries/read-import-file';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { Link } from '@/i18n/navigation';
import type { StoredImportSettings } from '@/lib/import/commit-import';
import { getImportColumns, guessColumnMapping, restoreColumnMapping } from '@/lib/import/system-columns';
import type {
  ImportContext,
  ImportFileOptions,
  ImportSettings,
  ImportSummary,
  ParsedImportFile,
} from '@/lib/import/types';
import { getInitialDefaults, validateImport } from '@/lib/import/validate';
import { DEFAULT_IMPORT_FORMAT, detectDateOrder, detectDecimalSeparator } from '@/lib/import/values';
import { withProjectId } from '@/lib/project-href';
import { cn } from '@/lib/utils';

import { ImportMappingStep } from './import-mapping-step';
import { ImportPreviewStep } from './import-preview-step';

type Props = {
  projectId: string;
  context: ImportContext;
  lastSettings: StoredImportSettings | null;
};

type Step = 'upload' | 'mapping' | 'preview' | 'done';

export type ImportFileState = { name: string; base64: string; parsed: ParsedImportFile };

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Picks the number and date format from the cells of the mapped number and date columns. */
function detectFormat(parsed: ParsedImportFile, columns: Record<string, number>, context: ImportContext) {
  const kinds = new Map(getImportColumns(context).map((column) => [column.key, column.kind]));
  const numberCells = [];
  const dateCells = [];
  for (const [key, index] of Object.entries(columns)) {
    const kind = kinds.get(key);
    const cells = parsed.table.rows.map((row) => row[index] ?? null);
    if (kind === 'date') dateCells.push(...cells);
    else if (kind === 'money' || kind === 'percent' || kind === 'number' || kind === 'int') numberCells.push(...cells);
  }
  return {
    decimalSeparator: detectDecimalSeparator(numberCells),
    dateOrder: detectDateOrder(dateCells),
  };
}

function initialSettings(parsed: ParsedImportFile, context: ImportContext, last: StoredImportSettings | null) {
  const columns = getImportColumns(context);
  const keys = new Set(columns.map((column) => column.key));
  const guessed = guessColumnMapping(parsed.table.headers, columns);
  const restored = last ? restoreColumnMapping(last.columns, last.headers, parsed.table.headers) : {};
  const restoredIndexes = new Set(Object.values(restored));
  const mapping = Object.fromEntries(
    [...Object.entries(guessed).filter(([, index]) => !restoredIndexes.has(index)), ...Object.entries(restored)].filter(
      ([key]) => keys.has(key),
    ),
  );
  const loanTemplateId = last?.loanTemplateId ?? context.defaultLoanTemplateId;
  const detected = detectFormat(parsed, mapping, context);
  const settings: ImportSettings = {
    file: parsed.options,
    format: {
      decimalSeparator:
        detected.decimalSeparator ?? last?.format.decimalSeparator ?? DEFAULT_IMPORT_FORMAT.decimalSeparator,
      dateOrder: detected.dateOrder ?? last?.format.dateOrder ?? DEFAULT_IMPORT_FORMAT.dateOrder,
    },
    columns: mapping,
    defaults: {
      ...getInitialDefaults(context, loanTemplateId),
      ...Object.fromEntries(Object.entries(last?.defaults ?? {}).filter(([key]) => keys.has(key))),
    },
    valueAssignments: last?.valueAssignments ?? {},
    loanTemplateId,
  };
  return settings;
}

export function ImportWizard({ projectId, context, lastSettings }: Props) {
  const t = useTranslations('dashboard.configuration.import.wizard');
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<ImportFileState | null>(null);
  const [settings, setSettings] = useState<ImportSettings | null>(null);
  const [restoredFromLast, setRestoredFromLast] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { executeAsync: readFile, isExecuting: isReading } = useAction(readImportFileAction);
  const { executeAsync: commitImport, isExecuting: isImporting } = useAction(commitImportAction);

  const deferredSettings = useDeferredValue(settings);
  const validation = useMemo(
    () => (file && deferredSettings ? validateImport(file.parsed.table, deferredSettings, context) : null),
    [file, deferredSettings, context],
  );

  const read = async (name: string, base64: string, options: ImportFileOptions) => {
    const response = await readFile({ projectId, fileName: name, base64Data: base64, options });
    if (response?.serverError) {
      toast.error(response.serverError);
      return null;
    }
    return response?.data ?? null;
  };

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    const base64 = await readAsBase64(selected);
    const parsed = await read(selected.name, base64, {});
    if (!parsed) return;
    setFile({ name: selected.name, base64, parsed });
    setSettings(initialSettings(parsed, context, lastSettings));
    setRestoredFromLast(Boolean(lastSettings));
    setStep('mapping');
  };

  /** Reads the file again with another sheet, delimiter or encoding, keeping the mapping by header name. */
  const handleFileOptions = async (options: ImportFileOptions) => {
    if (!file || !settings) return;
    const parsed = await read(file.name, file.base64, { ...settings.file, ...options });
    if (!parsed) return;
    const columns = restoreColumnMapping(settings.columns, file.parsed.table.headers, parsed.table.headers);
    setFile({ ...file, parsed });
    setSettings({
      ...settings,
      file: parsed.options,
      columns:
        Object.keys(columns).length > 0 ? columns : guessColumnMapping(parsed.table.headers, getImportColumns(context)),
    });
  };

  const handleImport = async (acknowledgeWarnings: boolean) => {
    if (!file || !settings) return;
    const response = await commitImport({
      projectId,
      fileName: file.name,
      base64Data: file.base64,
      settings,
      acknowledgeWarnings,
    });
    if (response?.serverError) {
      toast.error(response.serverError);
      return;
    }
    const data = response?.data;
    if (!data) return;
    if (!data.ok) {
      toast.error(t('rejected'));
      setStep('mapping');
      return;
    }
    setResult(data.summary);
    setStep('done');
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: t('steps.upload') },
    { key: 'mapping', label: t('steps.mapping') },
    { key: 'preview', label: t('steps.preview') },
  ];
  const activeIndex = step === 'done' ? steps.length : steps.findIndex((entry) => entry.key === step);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={withProjectId('/configuration?tab=import', projectId)}
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('cancel')}
          </Link>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <ol className="flex items-center gap-2 text-sm">
          {steps.map((entry, index) => (
            <li
              key={entry.key}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1',
                index === activeIndex && 'border-primary bg-primary text-primary-foreground',
                index < activeIndex && 'border-primary text-primary',
                index > activeIndex && 'text-muted-foreground',
              )}
            >
              <span className="tabular-nums">{index + 1}</span>
              {entry.label}
            </li>
          ))}
        </ol>
      </div>

      {step === 'upload' && (
        <FormSection title={t('upload.title')} description={t('upload.hint')} icon={<FileUp className="h-4 w-4" />}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isReading}>
            {isReading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {isReading ? t('upload.reading') : t('upload.choose')}
          </Button>
        </FormSection>
      )}

      {step === 'mapping' && file && settings && validation && (
        <ImportMappingStep
          file={file}
          settings={settings}
          context={context}
          validation={validation}
          isReading={isReading}
          restoredFromLast={restoredFromLast}
          onSettingsChange={setSettings}
          onFileOptionsChange={handleFileOptions}
          onOtherFile={() => {
            setStep('upload');
            setFile(null);
            setSettings(null);
          }}
          onNext={() => setStep('preview')}
        />
      )}

      {step === 'preview' && file && settings && validation && (
        <ImportPreviewStep
          context={context}
          validation={validation}
          isImporting={isImporting}
          onBack={() => setStep('mapping')}
          onImport={handleImport}
        />
      )}

      {step === 'done' && result && (
        <FormSection title={t('done.title')} icon={<CheckCircle2 className="h-4 w-4 text-success-foreground" />}>
          <p>{t('done.text', { lenders: result.lenders, loans: result.loans })}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={withProjectId('/lenders/list', projectId)}>{t('done.toLenders')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={withProjectId('/configuration?tab=import', projectId)}>{t('done.toImports')}</Link>
            </Button>
          </div>
        </FormSection>
      )}
    </div>
  );
}
