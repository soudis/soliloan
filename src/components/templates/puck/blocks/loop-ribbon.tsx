'use client';

export function LoopRibbon({ loopKey, label }: { loopKey: string; label?: string }) {
  if (!loopKey.trim()) return null;
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-muted/60 px-2 py-[3px]">
      <span className="font-mono text-[9px] leading-tight tracking-tight text-muted-foreground">
        {'{{#'}
        {loopKey}
        {'}}'}
      </span>
      {label ? (
        <span className="truncate font-sans text-[10px] font-normal text-muted-foreground/75">{label}</span>
      ) : null}
    </div>
  );
}

export function LoopRibbonEnd({ loopKey }: { loopKey: string }) {
  if (!loopKey.trim()) return null;
  return (
    <div className="shrink-0 border-t border-border/70 bg-muted/60 px-2 py-[3px] text-right">
      <span className="font-mono text-[9px] leading-tight tracking-tight text-muted-foreground">
        {'{{/'}
        {loopKey}
        {'}}'}
      </span>
    </div>
  );
}
