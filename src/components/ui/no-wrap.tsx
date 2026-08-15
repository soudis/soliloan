import type { ReactNode } from 'react';

export function NoWrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}
