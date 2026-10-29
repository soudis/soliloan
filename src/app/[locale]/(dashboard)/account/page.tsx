import { redirect } from 'next/navigation';
import { AccountPageContent } from '@/components/account/account-page-content';
import { db } from '@/lib/db';
import { getForumSubscriptionsUnsafe } from '@/lib/help/get-forum-subscriptions';
import { requireSession } from '@/lib/require-session';

export default async function AccountPage() {
  const session = await requireSession();
  const userId = session.user.id;
  if (!userId) {
    redirect('/auth/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      language: true,
      forumDigestDelayMinutes: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  const showForumDigest = Boolean(session.user.isManager && user.email?.trim());
  const subscriptions = showForumDigest ? await getForumSubscriptionsUnsafe(userId) : null;

  return (
    <AccountPageContent
      user={user}
      forumDigest={
        showForumDigest && subscriptions
          ? {
              delayMinutes: user.forumDigestDelayMinutes,
              boards: subscriptions.boards,
              threads: subscriptions.threads,
              mutes: subscriptions.mutes,
            }
          : null
      }
    />
  );
}
