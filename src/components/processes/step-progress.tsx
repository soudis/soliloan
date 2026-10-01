'use client';

import { useTranslations } from 'next-intl';

type Props = {
  current: number;
  total: number;
  name: string;
};

export function StepProgress({ current, total, name }: Props) {
  const t = useTranslations('processes.wizard');
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const label = t('stepProgress', { current, total, name });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={current}
        aria-valuetext={label}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
