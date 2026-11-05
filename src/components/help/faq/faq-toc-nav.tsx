'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { reorderFaqAction } from '@/actions/help';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { FaqToc, FaqTocArticle, FaqTocCategory } from '@/types/faq';

type FaqTocNavProps = {
  toc: FaqToc;
  isAdmin: boolean;
};

function moveArticles(articles: FaqTocArticle[], activeId: string, overId: string) {
  const oldIndex = articles.findIndex((article) => `article:${article.id}` === activeId);
  const newIndex = articles.findIndex((article) => `article:${article.id}` === overId);
  if (oldIndex < 0 || newIndex < 0) return null;
  return arrayMove(articles, oldIndex, newIndex);
}

function SortableItem({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-start gap-1', isDragging && 'opacity-70')}
    >
      {disabled ? null : (
        <button
          type="button"
          className="mt-1 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
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

export function FaqTocNav({ toc, isAdmin }: FaqTocNavProps) {
  const t = useTranslations('help.faqPage');
  const router = useRouter();
  const pathname = usePathname();
  const activeSlug =
    pathname.startsWith('/help/faq/') && !pathname.endsWith('/new') ? pathname.split('/').pop() : undefined;
  const [localToc, setLocalToc] = useState(toc);
  useEffect(() => {
    setLocalToc(toc);
  }, [toc]);
  const { executeAsync: reorder } = useAction(reorderFaqAction);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const persistOrder = async (next: FaqToc) => {
    setLocalToc(next);
    const result = await reorder({
      categoryIds: next.categories.map((category) => category.id),
      groups: [
        { categoryId: null, articleIds: next.uncategorized.map((article) => article.id) },
        ...next.categories.map((category) => ({
          categoryId: category.id,
          articleIds: category.articles.map((article) => article.id),
        })),
      ],
    });
    if (result?.serverError) {
      toast.error(t('reorderError'));
      setLocalToc(toc);
      return;
    }
    router.refresh();
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('category:') && overId.startsWith('category:')) {
      const oldIndex = localToc.categories.findIndex((category) => `category:${category.id}` === activeId);
      const newIndex = localToc.categories.findIndex((category) => `category:${category.id}` === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      void persistOrder({
        ...localToc,
        categories: arrayMove(localToc.categories, oldIndex, newIndex),
      });
      return;
    }

    if (activeId.startsWith('article:') && overId.startsWith('article:')) {
      const uncategorized = moveArticles(localToc.uncategorized, activeId, overId);
      if (uncategorized) {
        void persistOrder({ ...localToc, uncategorized });
        return;
      }

      const nextCategories = localToc.categories.map((category) => {
        const moved = moveArticles(category.articles, activeId, overId);
        return moved ? { ...category, articles: moved } : category;
      });
      void persistOrder({ ...localToc, categories: nextCategories });
    }
  };

  const isEmptyToc = localToc.uncategorized.length === 0 && localToc.categories.length === 0;
  if (isEmptyToc) return null;

  return (
    <aside className="flex max-h-56 min-h-0 w-full shrink-0 flex-col border-b border-border/50 pb-4 md:max-h-none md:w-72 md:border-b-0 md:border-r md:pr-6 md:pb-0">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pt-1 text-sm md:pb-8">
          {localToc.uncategorized.length > 0 ? (
            <ArticleList articles={localToc.uncategorized} activeSlug={activeSlug} isAdmin={isAdmin} canDrag={isAdmin} />
          ) : null}
          <SortableContext
            items={localToc.categories.map((category) => `category:${category.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {localToc.categories.map((category) => (
              <SortableItem key={category.id} id={`category:${category.id}`} disabled={!isAdmin}>
                <CategoryBlock category={category} activeSlug={activeSlug} isAdmin={isAdmin} canDragArticles={isAdmin} />
              </SortableItem>
            ))}
          </SortableContext>
        </nav>
      </DndContext>
    </aside>
  );
}

function ArticleLink({
  article,
  activeSlug,
  isAdmin,
  canDrag,
}: {
  article: FaqTocArticle;
  activeSlug?: string;
  isAdmin: boolean;
  canDrag: boolean;
}) {
  const t = useTranslations('help.faqPage');
  const link = (
    <Link
      href={`/help/faq/${article.slug}`}
      className={cn(
        'block rounded-md px-2 py-1 hover:bg-accent',
        activeSlug === article.slug && 'bg-accent font-medium',
      )}
    >
      <span className="block truncate">{article.title}</span>
      {!article.published && isAdmin ? (
        <span className="text-[11px] font-normal text-muted-foreground">{t('draft')}</span>
      ) : null}
    </Link>
  );

  if (!canDrag) return link;
  return (
    <SortableItem id={`article:${article.id}`} disabled={false}>
      {link}
    </SortableItem>
  );
}

function ArticleList({
  articles,
  activeSlug,
  isAdmin,
  canDrag,
}: {
  articles: FaqTocArticle[];
  activeSlug?: string;
  isAdmin: boolean;
  canDrag: boolean;
}) {
  return (
    <div className="space-y-1">
      <SortableContext
        items={articles.map((article) => `article:${article.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {articles.map((article) => (
          <ArticleLink key={article.id} article={article} activeSlug={activeSlug} isAdmin={isAdmin} canDrag={canDrag} />
        ))}
      </SortableContext>
    </div>
  );
}

function CategoryBlock({
  category,
  activeSlug,
  isAdmin,
  canDragArticles,
}: {
  category: FaqTocCategory;
  activeSlug?: string;
  isAdmin: boolean;
  canDragArticles: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category.name}</p>
      <ArticleList articles={category.articles} activeSlug={activeSlug} isAdmin={isAdmin} canDrag={canDragArticles} />
    </div>
  );
}
