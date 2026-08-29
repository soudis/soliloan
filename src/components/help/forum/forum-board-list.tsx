'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { reorderForumBoardsAction } from '@/actions/help';
import { Badge } from '@/components/ui/badge';
import { Link, useRouter } from '@/i18n/navigation';
import { formatForumRelativeTime } from '@/lib/help/forum-time';
import { cn } from '@/lib/utils';
import type { ForumBoardListItem } from '@/types/forum';

type ForumBoardListProps = {
  boards: ForumBoardListItem[];
  isAdmin: boolean;
};

function SortableRow({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-stretch gap-2', isDragging && 'opacity-70')}
    >
      {disabled ? null : (
        <button
          type="button"
          className="mt-4 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ForumBoardList({ boards, isAdmin }: ForumBoardListProps) {
  const t = useTranslations('help.forumPage');
  const router = useRouter();
  const { executeAsync: reorder } = useAction(reorderForumBoardsAction);
  const [items, setItems] = useState(boards);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setItems(boards);
  }, [boards]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((board) => board.id === active.id);
    const newIndex = items.findIndex((board) => board.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    const result = await reorder({ boardIds: next.map((board) => board.id) });
    if (result?.serverError) {
      setItems(boards);
      toast.error(result.serverError);
      return;
    }
    router.refresh();
  };

  const list = (
    <div className="space-y-3">
      {items.map((board) => (
        <SortableRow key={board.id} id={board.id} disabled={!isAdmin}>
          <Link
            href={`/help/forum/${board.slug}`}
            className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{board.name}</h2>
                  {board.unreadCount > 0 ? (
                    <Badge variant="secondary">{t('unreadCount', { count: board.unreadCount })}</Badge>
                  ) : null}
                </div>
                {board.description ? <p className="text-sm text-muted-foreground">{board.description}</p> : null}
                <p className="text-sm text-muted-foreground">
                  {t('threadCount', { count: board.threadCount })}
                  {board.moderatorNames.length > 0
                    ? ` · ${t('moderators')}: ${board.moderatorNames.join(', ')}`
                    : ` · ${t('noModerators')}`}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {board.lastPostedAt ? (
                  <>
                    <p>{t('lastActivity')}</p>
                    <p>{formatForumRelativeTime(board.lastPostedAt)}</p>
                    {board.lastThreadTitle ? (
                      <p className="max-w-xs truncate text-foreground/80">{board.lastThreadTitle}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        </SortableRow>
      ))}
    </div>
  );

  if (!isAdmin) {
    return list;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
      <SortableContext items={items.map((board) => board.id)} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}
