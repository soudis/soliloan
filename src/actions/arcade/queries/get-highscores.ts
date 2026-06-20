'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const TOP_LIMIT = 20;

export interface HighscoreRow {
  id: string;
  rank: number;
  pseudonym: string;
  score: number;
  wave: number;
  createdAt: Date;
  /** Present only when the player opted to reveal their identity. */
  name: string | null;
  email: string | null;
  /** True when the entry belongs to the currently signed-in user. */
  isOwn: boolean;
}

export interface HighscoresResult {
  top: HighscoreRow[];
  personalBest: HighscoreRow | null;
}

/**
 * Returns the global Top 20 highscores plus the caller's personal best.
 * Manager-only; mirrors the access rules applied to the page itself.
 */
export async function getHighscores(): Promise<HighscoresResult> {
  const session = await auth();

  if (!session?.user?.isManager) {
    return { top: [], personalBest: null };
  }

  const userId = session.user.id;

  const [topEntries, best] = await Promise.all([
    db.highscoreEntry.findMany({
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: TOP_LIMIT,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    db.highscoreEntry.findFirst({
      where: { userId },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const top: HighscoreRow[] = topEntries.map((entry, index) => ({
    id: entry.id,
    rank: index + 1,
    pseudonym: entry.pseudonym,
    score: entry.score,
    wave: entry.wave,
    createdAt: entry.createdAt,
    name: entry.revealIdentity ? entry.user.name : null,
    email: entry.revealIdentity ? (entry.user.email ?? null) : null,
    isOwn: entry.userId === userId,
  }));

  let personalBest: HighscoreRow | null = null;
  if (best) {
    const rankInTop = top.find((row) => row.id === best.id)?.rank ?? null;
    const betterCount =
      rankInTop ??
      (await db.highscoreEntry.count({
        where: {
          OR: [{ score: { gt: best.score } }, { score: best.score, createdAt: { lt: best.createdAt } }],
        },
      })) + 1;

    personalBest = {
      id: best.id,
      rank: betterCount,
      pseudonym: best.pseudonym,
      score: best.score,
      wave: best.wave,
      createdAt: best.createdAt,
      name: best.revealIdentity ? best.user.name : null,
      email: best.revealIdentity ? (best.user.email ?? null) : null,
      isOwn: true,
    };
  }

  return { top, personalBest };
}
