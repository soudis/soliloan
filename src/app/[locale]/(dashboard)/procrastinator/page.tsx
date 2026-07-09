import { Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getHighscores } from '@/actions/arcade/queries/get-highscores';
import { HighscoreTable } from '@/components/arcade/highscore-table';
import { LoanInvadersGame } from '@/components/arcade/loan-invaders-game';
import { requireManager } from '@/lib/require-session';

export default async function ProcrastinatorPage() {
  const session = await requireManager();

  const t = await getTranslations('arcade');
  const highscores = await getHighscores();
  const playerName = session.user.name?.trim() || session.user.email || 'Player';
  const playerEmail = session.user.email ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-2 py-3 md:px-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,640px)_1fr]">
        <LoanInvadersGame playerName={playerName} playerEmail={playerEmail} />
        <HighscoreTable highscores={highscores} />
      </div>
    </div>
  );
}
