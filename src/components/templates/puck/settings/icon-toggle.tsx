'use client';

import type { LucideIcon } from 'lucide-react';

export function LayoutButton({
  icon: Icon,
  isActive,
  label,
  onClick,
}: {
  icon: LucideIcon;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center rounded-md border p-2 transition-colors ${
        isActive
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-white text-muted-foreground hover:border-border hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ToggleButton({
  icon: Icon,
  isActive,
  label,
  onClick,
}: {
  icon: LucideIcon;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${
        isActive
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-white text-muted-foreground hover:border-border hover:text-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
