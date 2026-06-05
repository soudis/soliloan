'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DASHBOARD_WIDGET_TYPES, type DashboardWidgetType } from '@/types/dashboard-layout';

import { WIDGET_TYPE_ICONS } from './widget-icons';

function ToolboxItem({ type }: { type: DashboardWidgetType }) {
  const t = useTranslations('dashboard.customizer');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { kind: 'toolbox', widgetType: type },
  });

  const Icon = WIDGET_TYPE_ICONS[type];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-full touch-none cursor-grab items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="select-none">{t(`widgetTypes.${type}`)}</span>
    </div>
  );
}

export function DashboardWidgetToolbox() {
  const t = useTranslations('dashboard.customizer');

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs text-muted-foreground">{t('toolboxHint')}</p>
      {DASHBOARD_WIDGET_TYPES.map((type) => (
        <ToolboxItem key={type} type={type} />
      ))}
    </div>
  );
}
