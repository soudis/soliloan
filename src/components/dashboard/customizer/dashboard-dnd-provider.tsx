'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  addWidgetFromType,
  addWidgetFromTypeInNewRow,
  findWidgetLocation,
  moveWidgetToRow,
  removeWidget,
  reorderWidgetInRow,
} from '@/lib/dashboard/layout-editor';
import type { DashboardWidgetType } from '@/types/dashboard-layout';

import { useDashboardLayout } from './dashboard-layout-context';

type ActiveDrag =
  | { kind: 'toolbox'; widgetType: DashboardWidgetType }
  | { kind: 'widget'; widgetType: DashboardWidgetType; title: string }
  | null;

export function DashboardDndProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('dashboard.customizer');
  const { layout, setLayout, isCustomizing } = useDashboardLayout();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!isCustomizing) {
      return;
    }
    const data = event.active.data.current;
    if (data?.kind === 'toolbox' && data.widgetType) {
      setActiveDrag({
        kind: 'toolbox',
        widgetType: data.widgetType as DashboardWidgetType,
      });
      return;
    }
    if (data?.kind === 'widget') {
      const loc = findWidgetLocation(layout, event.active.id as string);
      if (loc) {
        setActiveDrag({
          kind: 'widget',
          widgetType: loc.widget.type,
          title: loc.widget.title,
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  const insertToolboxWidget = (
    type: DashboardWidgetType,
    title: string,
    rowId: string,
    index?: number,
  ) => {
    const { created, layout: next } = addWidgetFromType(layout, rowId, type, title, index);
    if (created) {
      setLayout(next);
    } else {
      setLayout(addWidgetFromTypeInNewRow(layout, type, title));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !isCustomizing) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.kind === 'toolbox' && activeData.widgetType) {
      const type = activeData.widgetType as DashboardWidgetType;
      const title = t(`widgetTypes.${type}`);

      if (overData?.kind === 'new-row') {
        setLayout(addWidgetFromTypeInNewRow(layout, type, title));
        return;
      }

      if (overData?.kind === 'row') {
        insertToolboxWidget(type, title, overData.rowId as string);
        return;
      }

      if (overData?.kind === 'widget') {
        const rowId = overData.rowId as string;
        const targetRow = layout.rows.find((r) => r.id === rowId);
        const overIndex = targetRow?.widgets.findIndex((w) => w.id === over.id) ?? -1;
        insertToolboxWidget(type, title, rowId, overIndex >= 0 ? overIndex : undefined);
      }
      return;
    }

    if (activeData?.kind === 'widget') {
      const widgetId = active.id as string;
      const sourceRowId = activeData.rowId as string;

      if (overData?.kind === 'new-row') {
        const loc = findWidgetLocation(layout, widgetId);
        if (!loc) {
          return;
        }
        const without = removeWidget(layout, widgetId);
        setLayout(addWidgetFromTypeInNewRow(without, loc.widget.type, loc.widget.title));
        return;
      }

      if (overData?.kind === 'widget' && over.id !== active.id) {
        const overRowId = overData.rowId as string;
        if (overRowId === sourceRowId) {
          setLayout(reorderWidgetInRow(layout, sourceRowId, widgetId, over.id as string));
          return;
        }
        const targetRow = layout.rows.find((r) => r.id === overRowId);
        const overIndex = targetRow?.widgets.findIndex((w) => w.id === over.id) ?? -1;
        const moved = moveWidgetToRow(layout, widgetId, overRowId, overIndex >= 0 ? overIndex : undefined);
        if (moved) {
          setLayout(moved);
        }
        return;
      }

      if (overData?.kind === 'row') {
        const moved = moveWidgetToRow(layout, widgetId, overData.rowId as string);
        if (moved) {
          setLayout(moved);
        }
      }
    }
  };

  const overlayLabel =
    activeDrag?.kind === 'toolbox'
      ? t(`widgetTypes.${activeDrag.widgetType}`)
      : activeDrag?.kind === 'widget'
        ? activeDrag.title
        : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null} zIndex={100}>
        {overlayLabel ? (
          <div className="cursor-grabbing rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
            {overlayLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
