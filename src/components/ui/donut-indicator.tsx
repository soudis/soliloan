import { cn } from '@/lib/utils';

const SIZE = 100;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutIndicatorProps {
  value: number;
  limit: number;
  children?: React.ReactNode;
  className?: string;
}

export function DonutIndicator({ value, limit, children, className }: DonutIndicatorProps) {
  const ratio = limit > 0 ? Math.max(0, Math.min(1, value / limit)) : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);
  const exceeded = value > limit;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full -rotate-90" aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          className={exceeded ? 'stroke-destructive' : 'stroke-primary'}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
