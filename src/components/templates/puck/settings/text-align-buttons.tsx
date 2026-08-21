'use client';

import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import type { TextAlign } from '../table-model';

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
  { value: 'justify', icon: AlignJustify },
];

export function TextAlignButtons({
  value,
  onChange,
  disabled,
}: {
  value: TextAlign | undefined;
  onChange: (value: TextAlign) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {ALIGN_OPTIONS.map(({ value: option, icon: Icon }) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`flex items-center justify-center rounded-md border p-2 transition-colors disabled:opacity-50 ${
            value === option
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-white text-muted-foreground hover:border-border hover:text-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
