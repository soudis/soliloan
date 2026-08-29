import { getForumBoardsUnsafe, getForumManagerUsersUnsafe } from '@/actions/help';
import { ForumBoardList } from '@/components/help/forum/forum-board-list';
import { ForumEmptyState } from '@/components/help/forum/forum-empty-state';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
import { requireManager } from '@/lib/require-session';

export default async function HelpForumPage() {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const user = forumUserFromSession(session.user);
  const [boards, managers] = await Promise.all([
    getForumBoardsUnsafe(user.id),
    isAdmin ? getForumManagerUsersUnsafe() : Promise.resolve([]),
  ]);

  return (
    <ForumShell isAdmin={isAdmin} boards={boards} managers={managers}>
      {boards.length === 0 ? (
        <ForumEmptyState isAdmin={isAdmin} />
      ) : (
        <ForumBoardList boards={boards} isAdmin={isAdmin} />
      )}
    </ForumShell>
  );
}
