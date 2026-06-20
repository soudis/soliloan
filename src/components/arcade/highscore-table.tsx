'use client';

import { Crown, Mail, Trophy, User } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import type { HighscoreRow, HighscoresResult } from '@/actions/arcade/queries/get-highscores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface HighscoreTableProps {
  highscores: HighscoresResult;
}

export function HighscoreTable({ highscores }: HighscoreTableProps) {
  const t = useTranslations('arcade');
  const format = useFormatter();
  const { top, personalBest } = highscores;

  const personalBestInTop = personalBest && top.some((row) => row.id === personalBest.id);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          {t('highscores')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {top.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t('highscoresEmpty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">{t('rank')}</TableHead>
                <TableHead>{t('player')}</TableHead>
                <TableHead className="text-center">{t('wave')}</TableHead>
                <TableHead className="text-right">{t('score')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((row) => (
                <HighscoreTableRow key={row.id} row={row} format={format} />
              ))}
            </TableBody>
          </Table>
        )}

        {personalBest && !personalBestInTop && (
          <div className="border-t border-table-border px-6 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('personalBest')}
            </p>
            <div className="flex items-center justify-between gap-3 rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="tabular-nums text-muted-foreground">#{personalBest.rank}</span>
                <PlayerCell row={personalBest} />
              </span>
              <span className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {t('wave')} {personalBest.wave}
                </span>
                <span className="font-mono font-semibold tabular-nums">{format.number(personalBest.score)}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HighscoreTableRow({ row, format }: { row: HighscoreRow; format: ReturnType<typeof useFormatter> }) {
  return (
    <TableRow className={cn(row.isOwn && 'bg-primary/10 hover:bg-primary/15')}>
      <TableCell className="text-center font-mono tabular-nums">
        {row.rank <= 3 ? (
          <Crown
            className={cn(
              'mx-auto h-4 w-4',
              row.rank === 1 && 'text-amber-500',
              row.rank === 2 && 'text-slate-400',
              row.rank === 3 && 'text-amber-700',
            )}
          />
        ) : (
          row.rank
        )}
      </TableCell>
      <TableCell>
        <PlayerCell row={row} />
      </TableCell>
      <TableCell className="text-center tabular-nums text-muted-foreground">{row.wave}</TableCell>
      <TableCell className="text-right font-mono font-semibold tabular-nums">{format.number(row.score)}</TableCell>
    </TableRow>
  );
}

function PlayerCell({ row }: { row: HighscoreRow }) {
  return (
    <span className="flex flex-col">
      <span className="font-medium">{row.pseudonym}</span>
      {(row.name || row.email) && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {row.name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {row.name}
            </span>
          )}
          {row.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.email}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
