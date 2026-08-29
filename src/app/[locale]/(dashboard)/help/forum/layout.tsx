import { type ReactNode, Suspense } from 'react';

export default function ForumLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
