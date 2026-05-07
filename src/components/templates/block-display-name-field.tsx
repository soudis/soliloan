'use client';

import { useEditor, useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setNodeDisplayName } from '@/lib/templates/craft-node-name';

export function BlockDisplayNameField() {
  const { actions } = useEditor();
  const { id, displayName } = useNode((node) => ({
    id: node.id,
    displayName: typeof node.data.displayName === 'string' ? node.data.displayName : '',
  }));
  const [local, setLocal] = useState(displayName);
  const t = useTranslations('templates.editor.settings');

  useEffect(() => {
    setLocal(displayName);
  }, [displayName]);

  const commit = () => {
    const trimmed = local.trim();
    if (!trimmed || trimmed === displayName) return;
    setNodeDisplayName(actions, id, trimmed);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`block-name-${id}`}>{t('displayName')}</Label>
      <Input
        id={`block-name-${id}`}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
