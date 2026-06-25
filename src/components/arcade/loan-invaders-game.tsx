'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Gamepad2, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitHighscoreAction } from '@/actions/arcade/mutations/submit-score';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { ArcadeAudio } from '@/lib/arcade/audio';
import { GameEngine, type GameHud } from '@/lib/arcade/engine';
import { MAX_COMMENT_LENGTH, MAX_PSEUDONYM_LENGTH } from '@/lib/schemas/arcade';
import { cn } from '@/lib/utils';
import { TouchControls } from './touch-controls';

const submitFormSchema = z.object({
  pseudonym: z
    .string()
    .trim()
    .min(1, { message: 'validation.common.required' })
    .max(MAX_PSEUDONYM_LENGTH, { message: 'validation.common.tooLong' }),
  comment: z.string().trim().max(MAX_COMMENT_LENGTH, { message: 'validation.common.tooLong' }),
  revealIdentity: z.boolean(),
});

type SubmitFormValues = z.infer<typeof submitFormSchema>;

interface LoanInvadersGameProps {
  playerName: string;
  playerEmail: string | null;
}

export function LoanInvadersGame({ playerName, playerEmail }: LoanInvadersGameProps) {
  const t = useTranslations('arcade');
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<ArcadeAudio | null>(null);

  const [hud, setHud] = useState<GameHud>({ score: 0, lives: 3, wave: 1, status: 'idle' });
  const [muted, setMuted] = useState(false);
  const [showTouch, setShowTouch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // --- Engine + audio lifecycle ---------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;
    const audio = new ArcadeAudio();
    audioRef.current = audio;
    const engine = new GameEngine({
      canvas: canvasRef.current,
      onHud: setHud,
      playSfx: (name) => audio.play(name as Parameters<ArcadeAudio['play']>[0]),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    setShowTouch(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // React to status changes for music + game-over dialog.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (hud.status === 'playing') audio.resumeMusic();
    else audio.pauseMusic();

    if (hud.status === 'gameover') {
      setSubmitted(false);
      setDialogOpen(engineRef.current ? engineRef.current.getScore() > 0 : false);
    }
    // Only react to status transitions, not per-frame score updates.
  }, [hud.status]);

  // --- Keyboard controls -----------------------------------------------------
  useEffect(() => {
    const engineInput = () => engineRef.current?.input;

    // Don't hijack keys while the user is typing in a form field (e.g. the
    // score-submission dialog) - otherwise Space/arrows get swallowed.
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const input = engineInput();
      if (!input || isTypingTarget(e.target)) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          input.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          input.right = true;
          break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          input.fire = true;
          e.preventDefault();
          break;
        case 'p':
        case 'P':
          engineRef.current?.togglePause();
          break;
      }
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const input = engineInput();
      if (!input || isTypingTarget(e.target)) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          input.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          input.right = false;
          break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          input.fire = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleStart = useCallback(() => {
    audioRef.current?.unlock();
    if (muted) audioRef.current?.setMuted(true);
    engineRef.current?.start();
  }, [muted]);

  const handlePauseToggle = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleMuteToggle = useCallback(() => {
    const next = audioRef.current?.toggleMuted() ?? !muted;
    setMuted(next);
  }, [muted]);

  // --- Score submission ------------------------------------------------------
  const { executeAsync, isExecuting } = useAction(submitHighscoreAction);

  const form = useForm<SubmitFormValues>({
    resolver: zodResolver(submitFormSchema),
    defaultValues: { pseudonym: '', comment: '', revealIdentity: false },
  });

  useEffect(() => {
    if (dialogOpen) {
      form.reset({
        pseudonym: playerName ? playerName.slice(0, MAX_PSEUDONYM_LENGTH) : '',
        comment: '',
        revealIdentity: false,
      });
    }
  }, [dialogOpen, playerName, form]);

  const onSubmit = async (values: SubmitFormValues) => {
    const result = await executeAsync({
      pseudonym: values.pseudonym,
      comment: values.comment.trim() || null,
      revealIdentity: values.revealIdentity,
      score: hud.score,
      wave: hud.wave,
    });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    if (result?.validationErrors) {
      toast.error(t('dialog.invalid'));
      return;
    }
    toast.success(t('dialog.saved'));
    setSubmitted(true);
    setDialogOpen(false);
    router.refresh();
  };

  const isPlaying = hud.status === 'playing';
  const isPaused = hud.status === 'paused';
  const isGameOver = hud.status === 'gameover';
  const isIdle = hud.status === 'idle';

  return (
    <div className="mx-auto flex w-full flex-col gap-3 max-w-[calc((100svh-17rem)*0.75)] md:max-w-[calc((100svh-17rem)*0.75)]">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 font-mono text-sm">
        <Stat label={t('score')} value={hud.score.toLocaleString()} />
        <Stat label={t('wave')} value={String(hud.wave)} />
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{t('lives')}</span>
          <span className="text-base text-red-500">{'\u2665'.repeat(Math.max(0, hud.lives)) || '—'}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleMuteToggle}
          aria-label={muted ? t('muteOff') : t('muteOn')}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Game canvas */}
      <Card className="relative overflow-hidden rounded-lg border-2 border-primary/30 bg-[#070b18] p-0">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full [image-rendering:pixelated]"
          style={{ aspectRatio: '3 / 4' }}
        />

        {/* Overlays */}
        {(isIdle || isPaused || isGameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center text-white backdrop-blur-sm">
            {isIdle && (
              <>
                <Gamepad2 className="h-12 w-12 text-primary" />
                <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
                <p className="max-w-xs text-sm text-slate-300">{t('tagline')}</p>
                <div className="rounded-md bg-white/5 px-4 py-3 text-xs text-slate-300">
                  <p>{showTouch ? t('howToTouch') : t('howToKeyboard')}</p>
                </div>
                <Button type="button" size="lg" onClick={handleStart}>
                  <Play className="mr-2 h-4 w-4" />
                  {t('start')}
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Pause className="h-12 w-12 text-primary" />
                <h2 className="text-2xl font-bold">{t('paused')}</h2>
                <Button type="button" size="lg" onClick={handlePauseToggle}>
                  <Play className="mr-2 h-4 w-4" />
                  {t('resume')}
                </Button>
              </>
            )}
            {isGameOver && (
              <>
                <h2 className="text-3xl font-bold text-red-500">{t('gameOver')}</h2>
                <div className="space-y-1">
                  <p className="text-sm text-slate-300">{t('finalScore')}</p>
                  <p className="font-mono text-4xl font-bold text-amber-400">{hud.score.toLocaleString()}</p>
                  <p className="text-sm text-slate-400">
                    {t('reachedWave')}: {hud.wave}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!submitted && hud.score > 0 && (
                    <Button type="button" onClick={() => setDialogOpen(true)}>
                      {t('submitScore')}
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={handleStart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('restart')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* In-game pause button */}
        {isPlaying && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePauseToggle}
            aria-label={t('pause')}
            className="absolute right-2 top-2 bg-black/30 text-white hover:bg-black/50"
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
      </Card>

      {/* Touch controls */}
      {showTouch && (isPlaying || isPaused) && (
        <TouchControls
          onLeftChange={(active) => {
            const input = engineRef.current?.input;
            if (input) input.left = active;
          }}
          onRightChange={(active) => {
            const input = engineRef.current?.input;
            if (input) input.right = active;
          }}
          onFireChange={(active) => {
            const input = engineRef.current?.input;
            if (input) input.fire = active;
          }}
        />
      )}

      {!showTouch && <p className="text-center text-xs text-muted-foreground">{t('howToKeyboard')}</p>}

      {/* Submit score dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 font-mono text-sm">
                <span>{t('finalScore')}</span>
                <span className="font-semibold">{hud.score.toLocaleString()}</span>
              </div>
              <FormField
                control={form.control}
                name="pseudonym"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.pseudonym')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('dialog.pseudonymPlaceholder')}
                        maxLength={MAX_PSEUDONYM_LENGTH}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.comment')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('dialog.commentPlaceholder')}
                        maxLength={MAX_COMMENT_LENGTH}
                        rows={2}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revealIdentity"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="min-w-0 space-y-0.5">
                      <FormLabel className="text-base">{t('dialog.reveal')}</FormLabel>
                      <FormDescription>
                        {t('dialog.revealHint')}
                        {field.value && (
                          <span className="mt-1 block break-words font-medium text-foreground">
                            {playerName}
                            {playerEmail ? ` · ${playerEmail}` : ''}
                          </span>
                        )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={isExecuting}>
                  {t('skip')}
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('dialog.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums')}>{value}</span>
    </div>
  );
}
