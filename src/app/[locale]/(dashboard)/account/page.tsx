import { redirect } from 'next/navigation';

import { AccountPageContent } from '@/components/account/account-page-content';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/require-session';

export default async function AccountPage() {
  const session = await requireSession();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      language: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  return <AccountPageContent user={user} />;
}
