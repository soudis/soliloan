import { z } from 'zod';

/**
 * Sanity caps for the Procrastinator mini-game. The score is reported by the
 * client (this is a gimmick, not a competitive ranked mode), so these bounds
 * only guard against absurd values rather than providing real anti-cheat.
 */
export const MAX_SCORE = 10_000_000;
export const MAX_WAVE = 1_000;
export const MAX_PSEUDONYM_LENGTH = 20;

export const submitHighscoreSchema = z.object({
  pseudonym: z
    .string()
    .trim()
    .min(1, { message: 'validation.common.required' })
    .max(MAX_PSEUDONYM_LENGTH, { message: 'validation.common.tooLong' }),
  score: z.coerce.number().int().min(0).max(MAX_SCORE),
  wave: z.coerce.number().int().min(1).max(MAX_WAVE),
  revealIdentity: z.coerce.boolean().default(false),
});

export type SubmitHighscoreData = z.infer<typeof submitHighscoreSchema>;
