import { redirect } from 'next/navigation';

import { AccountPageContent } from '@/components/account/account-page-content';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      language: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  return <AccountPageContent user={user} />;
}
