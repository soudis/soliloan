import { cn } from '@/lib/utils';

interface GridIndicatorProps {
  value: number;
  rows: number;
  cols: number;
  className?: string;
}

export function GridIndicator({ value, rows, cols, className }: GridIndicatorProps) {
  const safeRows = Math.max(0, Math.floor(rows));
  const safeCols = Math.max(1, Math.floor(cols));
  const total = safeRows * safeCols;
  const clamped = Math.max(0, Math.min(total, Math.round(value)));

  return (
    <div
      className={cn('grid w-full gap-1', className)}
      style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const row = Math.floor(i / safeCols);
        const col = i % safeCols;
        const position = (safeRows - 1 - row) * safeCols + col + 1;
        const active = position <= clamped;

        return (
          <div
            key={`${row}-${col}`}
            className={cn(
              'aspect-square min-w-0 rounded-sm',
              active ? (value > total ? 'bg-destructive' : 'bg-primary') : 'bg-muted',
            )}
          />
        );
      })}
    </div>
  );
}
