'use client';

import { useDraggable } from '@dnd-kit/core';
import {
  BarChart3,
  GripVertical,
  Hash,
  LineChart,
  Minus,
  PieChart,
  Table2,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DASHBOARD_WIDGET_TYPES, type DashboardWidgetType } from '@/types/dashboard-layout';

const TOOLBOX_ICONS: Record<DashboardWidgetType, React.ComponentType<{ className?: string }>> = {
  history_table: Table2,
  pie_chart: PieChart,
  line_chart: LineChart,
  bar_chart: BarChart3,
  stat: Hash,
  divider: Minus,
  loan_table_view: Table2,
  lender_table_view: Users,
};

function ToolboxItem({ type }: { type: DashboardWidgetType }) {
  const t = useTranslations('dashboard.customizer');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { kind: 'toolbox', widgetType: type },
  });

  const Icon = TOOLBOX_ICONS[type];

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
