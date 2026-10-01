'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useProject } from '@/components/providers/project-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectHasPflichtfelder } from '@/lib/dashboard/notifications/compute-notifications';
import {
  MAX_REPAY_SOON_DAYS,
  MIN_REPAY_SOON_DAYS,
  NOTIFICATION_KINDS,
  type NotificationKind,
  type NotificationsWidgetConfig,
} from '@/types/dashboard-widgets/notifications';

export function NotificationsSettings({
  config,
  onConfigChange,
}: {
  config: NotificationsWidgetConfig;
  onConfigChange: (config: NotificationsWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.notifications');
  const { project } = useProject();
  const [repaySoonDays, setRepaySoonDays] = useState(String(config.repaySoonDays));

  useEffect(() => {
    setRepaySoonDays(String(config.repaySoonDays));
  }, [config.repaySoonDays]);

  const projectConfig = {
    deInvestmentActCompliance: project.configuration.deInvestmentActCompliance,
    lenderRequiredFields: project.configuration.lenderRequiredFields,
    lenderAdditionalFields: project.configuration.lenderAdditionalFields,
  };

  const visibleKinds = NOTIFICATION_KINDS.filter((kind) => {
    if (kind === 'investmentTypeCapacity') {
      return projectConfig.deInvestmentActCompliance;
    }
    if (kind === 'requiredFields') {
      return projectHasPflichtfelder(projectConfig);
    }
    return true;
  });

  const setEnabled = (kind: NotificationKind, checked: boolean) => {
    onConfigChange({
      ...config,
      enabled: { ...config.enabled, [kind]: checked },
    });
  };

  const commitRepaySoonDays = () => {
    const parsed = Number(repaySoonDays);
    if (!Number.isInteger(parsed) || parsed < MIN_REPAY_SOON_DAYS || parsed > MAX_REPAY_SOON_DAYS) {
      setRepaySoonDays(String(config.repaySoonDays));
      return;
    }
    if (parsed !== config.repaySoonDays) {
      onConfigChange({ ...config, repaySoonDays: parsed });
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
      {visibleKinds.map((kind) => (
        <div key={kind} className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id={`notification-${kind}`}
              checked={config.enabled[kind]}
              onCheckedChange={(checked) => setEnabled(kind, checked === true)}
            />
            <Label htmlFor={`notification-${kind}`} className="leading-snug font-normal">
              {t(`kinds.${kind}`)}
            </Label>
          </div>
          {kind === 'repaySoon' ? (
            <div className="space-y-1 pl-6">
              <Label htmlFor="notification-repay-soon-days" className="text-xs text-muted-foreground">
                {t('repaySoonDays')}
              </Label>
              <Input
                id="notification-repay-soon-days"
                type="number"
                min={MIN_REPAY_SOON_DAYS}
                max={MAX_REPAY_SOON_DAYS}
                value={repaySoonDays}
                onChange={(event) => setRepaySoonDays(event.target.value)}
                onBlur={commitRepaySoonDays}
                className="h-8 w-24"
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
