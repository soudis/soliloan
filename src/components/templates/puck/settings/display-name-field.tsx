'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePatchSelectedProps, useSelectedComponentId, useSelectedRecord } from '../use-puck-selected';

export function DisplayNameField() {
  const t = useTranslations('templates.editor.settings');
  const id = useSelectedComponentId();
  const patch = usePatchSelectedProps();
  const displayName = String(useSelectedRecord().displayName ?? '');
  const [local, setLocal] = useState(displayName);

  useEffect(() => {
    setLocal(displayName);
  }, [displayName]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === displayName.trim()) return;
    patch({ displayName: trimmed });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`block-name-${id}`}>{t('displayName')}</Label>
      <Input
        id={`block-name-${id}`}
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
