'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { TemplateConditionEditor } from '@/components/templates/conditions/template-condition-editor';
import { buildTemplateConditionFields } from '@/lib/templates/template-condition-fields';
import { useMergeTagConfig } from '../../merge-tag-context';
import { usePatchSelectedProps, usePuckAncestorLoops, useSelectedRecord } from '../use-puck-selected';

export function ShowIfField() {
  const tCommon = useTranslations('common');
  const tConditions = useTranslations('templates.editor.conditions');
  const config = useMergeTagConfig();
  const ancestorLoops = usePuckAncestorLoops(true);
  const patch = usePatchSelectedProps();
  const showIf = useSelectedRecord().showIf;

  const fields = useMemo(
    () => buildTemplateConditionFields(config, ancestorLoops, tCommon, tConditions),
    [ancestorLoops, config, tCommon, tConditions],
  );

  return (
    <TemplateConditionEditor
      value={showIf}
      fields={fields}
      onChange={(next) => {
        patch({ showIf: next });
      }}
    />
  );
}
