'use client';

import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface TouchControlsProps {
  onLeftChange: (active: boolean) => void;
  onRightChange: (active: boolean) => void;
  onFireChange: (active: boolean) => void;
  className?: string;
}

export function TouchControls({ onLeftChange, onRightChange, onFireChange, className }: TouchControlsProps) {
  const t = useTranslations('arcade');

  return (
    <div className={cn('flex select-none items-center justify-between gap-4', className)}>
      <div className="flex gap-3">
        <HoldButton label={t('touch.left')} onChange={onLeftChange}>
          <ChevronLeft className="h-7 w-7" />
        </HoldButton>
        <HoldButton label={t('touch.right')} onChange={onRightChange}>
          <ChevronRight className="h-7 w-7" />
        </HoldButton>
      </div>
      <HoldButton label={t('touch.fire')} onChange={onFireChange} variant="fire">
        <Zap className="h-7 w-7" />
      </HoldButton>
    </div>
  );
}

function HoldButton({
  label,
  onChange,
  children,
  variant = 'move',
}: {
  label: string;
  onChange: (active: boolean) => void;
  children: ReactNode;
  variant?: 'move' | 'fire';
}) {
  const activate = (active: boolean) => () => onChange(active);

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'flex h-16 w-16 touch-none items-center justify-center rounded-full border-2 text-foreground transition-colors active:scale-95',
        variant === 'fire'
          ? 'border-amber-500/60 bg-amber-500/20 text-amber-500 active:bg-amber-500/40'
          : 'border-border bg-muted/60 active:bg-muted',
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(true);
      }}
      onPointerUp={activate(false)}
      onPointerLeave={activate(false)}
      onPointerCancel={activate(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
