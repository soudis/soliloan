import { cn } from '@/lib/utils';

const ROWS = 5;
const COLS = 4;
const TOTAL = ROWS * COLS;

interface GridIndicator5x4Props {
  value: number;
  className?: string;
}

export function GridIndicator5x4({ value, className }: GridIndicator5x4Props) {
  const clamped = Math.max(0, Math.min(TOTAL, Math.round(value)));

  return (
    <div className={cn('grid w-full grid-cols-4 gap-1', className)}>
      {Array.from({ length: TOTAL }, (_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const position = (ROWS - 1 - row) * COLS + col + 1;
        const active = position <= clamped;

        return (
          <div
            key={`${row}-${col}`}
            className={cn(
              'aspect-square min-w-0 rounded-sm',
              active ? (value > TOTAL ? 'bg-destructive' : 'bg-primary') : 'bg-muted',
            )}
          />
        );
      })}
    </div>
  );
}
