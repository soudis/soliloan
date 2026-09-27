'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EntityFilterControl } from '@/components/dashboard/widgets/filters/entity-filter-control';
import { Button } from '@/components/ui/button';
import {
  parseTemplateCondition,
  type TemplateCondition,
  type TemplateConditionRule,
} from '@/lib/templates/template-condition';
import type { TemplateConditionField } from '@/lib/templates/template-condition-fields';

export function TemplateConditionEditor({
  value,
  onChange,
  fields,
}: {
  value: unknown;
  onChange: (next: TemplateCondition) => void;
  fields: TemplateConditionField[];
}) {
  const t = useTranslations('templates.editor.conditions');
  const tGroups = useTranslations('templates.editor.conditions.groups');
  const rules = parseTemplateCondition(value);
  const groups = groupFields(fields);

  const updateRule = (id: string, patch: Partial<TemplateConditionRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addRule = () => {
    const first = fields[0];
    if (!first) return;
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        field: first.field,
        type: first.type,
        value: null,
      },
    ]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{t('label')}</p>
        <Button type="button" variant="outline" size="sm" onClick={addRule} disabled={fields.length === 0}>
          <Plus className="mr-1 h-3 w-3" />
          {t('addRule')}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{rules.length === 0 ? t('empty') : t('hint')}</p>
      {fields.length === 0 ? <p className="text-[11px] text-muted-foreground">{t('noFields')}</p> : null}
      {rules.map((rule) => {
        const definition = fields.find((field) => field.field === rule.field);
        return (
          <div key={rule.id} className="space-y-2 rounded-md border p-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <select
                  aria-label={t('field')}
                  className="w-full rounded border bg-white px-2 py-1.5 text-sm"
                  value={rule.field}
                  onChange={(event) => {
                    const next = fields.find((field) => field.field === event.target.value);
                    if (!next) return;
                    updateRule(rule.id, { field: next.field, type: next.type, value: null });
                  }}
                >
                  {!definition ? <option value={rule.field}>{rule.field}</option> : null}
                  {groups.map((group) => (
                    <optgroup key={group.id} label={tGroups.has(group.id) ? tGroups(group.id) : group.id}>
                      {group.fields.map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {definition ? (
                  <EntityFilterControl
                    definition={definition}
                    value={rule.value}
                    onChange={(next) => updateRule(rule.id, { value: next })}
                  />
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={t('removeRule')}
                onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupFields(fields: TemplateConditionField[]) {
  const groups: { id: string; fields: TemplateConditionField[] }[] = [];
  for (const field of fields) {
    const existing = groups.find((group) => group.id === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ id: field.group, fields: [field] });
  }
  return groups;
}
