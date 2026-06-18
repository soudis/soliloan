'use client';

export function DividerWidget({ title }: { title: string }) {
  const label = title.trim();
  const hasTitle = label.length > 0;

  if (!hasTitle) {
    return <hr className="h-px w-full border-0 bg-border" />;
  }

  return (
    <div className="flex w-full items-center gap-3 py-0">
      <div className="h-px min-w-0 flex-1 bg-border" />
      <span className="shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <div className="h-px min-w-0 flex-1 bg-border" />
    </div>
  );
}
