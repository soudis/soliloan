import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin } from '@dnd-kit/core';

/** Prefer widget sortable targets over row drop zones so in-row reordering works. */
export const dashboardCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const widgets = pointerCollisions.filter((c) => c.data?.droppableContainer?.data?.current?.kind === 'widget');
    if (widgets.length > 0) {
      return widgets;
    }
    const rows = pointerCollisions.filter((c) => c.data?.droppableContainer?.data?.current?.kind === 'row');
    if (rows.length > 0) {
      return rows;
    }
    return pointerCollisions;
  }
  return closestCenter(args);
};
