import { type ReactNode, Suspense } from 'react';

import { getFaqTocUnsafe } from '@/actions/help';
import { FaqShell } from '@/components/help/faq/faq-shell';
import { requireManager } from '@/lib/require-session';

export default async function FaqLayout({ children }: { children: ReactNode }) {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const toc = await getFaqTocUnsafe(isAdmin);

  return (
    <Suspense>
      <FaqShell toc={toc} isAdmin={isAdmin}>
        {children}
      </FaqShell>
    </Suspense>
  );
}
