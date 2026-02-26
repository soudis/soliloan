'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SectionNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface SectionNavProps {
  items: SectionNavItem[];
}

export function SectionNavSidebar({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useScrollSpy(items);

  return (
    <nav className="hidden lg:flex flex-col gap-1 sticky top-8 self-start w-48 shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.id, setActiveId)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left cursor-pointer',
            activeId === item.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
          {item.count !== undefined && item.count > 0 && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{item.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function SectionNavBar({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useScrollSpy(items);

  return (
    <nav className="lg:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-b overflow-x-auto flex gap-1 scrollbar-none">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.id, setActiveId)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer',
            activeId === item.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && item.count > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">({item.count})</span>
          )}
        </button>
      ))}
    </nav>
  );
}

function scrollToSection(id: string, setActiveId: (id: string) => void) {
  setActiveId(id);
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function useScrollSpy(items: SectionNavItem[]): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isClickScrolling = useRef(false);

  const wrappedSetActiveId = (id: string) => {
    setActiveId(id);
    isClickScrolling.current = true;
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    for (const section of sections) {
      observerRef.current.observe(section);
    }

    return () => observerRef.current?.disconnect();
  }, [items]);

  return [activeId, wrappedSetActiveId];
}
