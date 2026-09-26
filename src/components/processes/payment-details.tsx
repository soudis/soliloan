'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Girocode } from 'react-girocode';
import { toast } from 'sonner';

import { Checkbox } from '@/components/ui/checkbox';
import { InfoItem } from '@/components/ui/info-item';
import type { YearlyInterestLenderView } from '@/lib/processes/yearly-interest-view';
import { formatCurrency } from '@/lib/utils';
import { formatAddressPlace } from '@/lib/utils/format';
import { formatIban, normalizeIban } from '@/lib/utils/iban';

export type PaymentLine = {
  id: string;
  loanNumber: number;
  amount: number;
};

type Props = {
  lender: YearlyInterestLenderView;
  lines: PaymentLine[];
  purpose: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
};

export function PaymentDetails({
  lender,
  lines,
  purpose,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
}: Props) {
  const t = useTranslations('processes.party');
  const tWizard = useTranslations('processes.wizard');
  const tCommon = useTranslations('common');
  const [totalCopied, setTotalCopied] = useState(false);
  const activeLines = selectable ? lines.filter((line) => selectedIds?.includes(line.id)) : lines;
  const total = Math.round(activeLines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  const addressLines = [
    lender.street?.trim(),
    lender.addon?.trim(),
    lender.zip || lender.place ? formatAddressPlace(lender) : undefined,
  ].filter((line): line is string => Boolean(line));
  const showQr = Boolean(lender.name.trim() && lender.iban?.trim() && total > 0);

  const toggle = (id: string, checked: boolean) => {
    if (!onSelectedIdsChange || !selectedIds) return;
    onSelectedIdsChange(checked ? [...selectedIds, id] : selectedIds.filter((entry) => entry !== id));
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-4">
        <InfoItem
          label={t('name')}
          value={lender.name}
          emptyMessage={t('empty')}
          showCopyButton
          copyValue={lender.name}
        />
        {addressLines.length > 0 ? (
          <InfoItem
            label={t('address')}
            value={addressLines.map((line) => <div key={line}>{line}</div>)}
            showCopyButton
            copyValue={addressLines.join('\n')}
          />
        ) : null}
        <InfoItem
          label={t('iban')}
          value={lender.iban ? formatIban(lender.iban) : undefined}
          emptyMessage={t('empty')}
          showCopyButton
          copyValue={lender.iban ? normalizeIban(lender.iban) : undefined}
        />
        <InfoItem
          label={t('bic')}
          value={lender.bic ?? undefined}
          emptyMessage={t('empty')}
          showCopyButton
          copyValue={lender.bic ?? undefined}
        />
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{tWizard('loans')}</div>
          <ul className="space-y-3">
            {lines.map((line) => {
              const inputId = `payout-loan-${line.id}`;
              return (
                <li key={line.id} className="flex items-center justify-between gap-3 text-lg">
                  <label className="flex items-center gap-2" htmlFor={inputId}>
                    {selectable ? (
                      <Checkbox
                        id={inputId}
                        checked={selectedIds?.includes(line.id) ?? false}
                        onCheckedChange={(checked) => toggle(line.id, checked === true)}
                      />
                    ) : null}
                    <span>{t('loan', { loanNumber: line.loanNumber })}</span>
                  </label>
                  <span className="tabular-nums font-medium">{formatCurrency(line.amount)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t pt-3 text-xl font-semibold">
            <span>{tWizard('total')}</span>
            <div className="flex items-center gap-1">
              <span className="tabular-nums">{formatCurrency(total)}</span>
              <button
                type="button"
                onClick={() => {
                  const amount = total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  void navigator.clipboard.writeText(amount);
                  setTotalCopied(true);
                  toast.success(tCommon('clipboard.copied'));
                  setTimeout(() => setTotalCopied(false), 2000);
                }}
                className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
                title={totalCopied ? tCommon('clipboard.copied') : tCommon('clipboard.copy')}
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {showQr && lender.iban ? (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-md bg-white p-3">
            <Girocode
              iban={normalizeIban(lender.iban)}
              bic={lender.bic ?? undefined}
              recipient={lender.name}
              amount={total}
              text={purpose}
            />
          </div>
          <p className="max-w-48 text-center text-xs text-muted-foreground">{purpose}</p>
        </div>
      ) : null}
    </div>
  );
}
