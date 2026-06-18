'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';

import { EntityFilterControl } from './entity-filter-control';
import { EntityFilterFieldPicker } from './entity-filter-field-picker';

export function EntityFilterList({
  filters,
  fieldOptions,
  onChange,
}: {
  filters: EntityFilter[];
  fieldOptions: EntityFilterFieldOption[];
  onChange: (filters: EntityFilter[]) => void;
}) {
  const t = useTranslations('dashboard.customizer.historyTable');

  const updateFilter = (id: string, patch: Partial<EntityFilter>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const addFilter = () => {
    const first = fieldOptions[0];
    if (!first) {
      return;
    }
    onChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        field: first.field,
        entity: first.entity,
        value: null,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('filters')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addFilter}>
          <Plus className="mr-1 h-3 w-3" />
          {t('addFilter')}
        </Button>
      </div>
      {filters.map((filter) => {
        const definition = getFilterDefinitionForField(fieldOptions, filter.entity, filter.field);

        return (
          <div key={filter.id} className="space-y-2 rounded-md border p-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityFilterFieldPicker
                  value={`${filter.entity}:${filter.field}`}
                  fieldOptions={fieldOptions}
                  onChange={(entity, field) => updateFilter(filter.id, { entity, field, value: null })}
                />
                {definition ? (
                  <EntityFilterControl
                    definition={definition}
                    value={filter.value}
                    onChange={(value) => updateFilter(filter.id, { value })}
                  />
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={t('removeFilter')}
                onClick={() => removeFilter(filter.id)}
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
