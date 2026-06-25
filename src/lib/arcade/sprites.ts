/**
 * Pixel-art sprites for the Procrastinator mini-game.
 *
 * Each sprite is an array of equal-length strings; every character maps to a
 * colour in {@link PALETTE} ('.' and ' ' are transparent). Enemies/boss/player
 * provide multiple frames for simple 2-frame animation.
 */

export type SpriteFrame = string[];
export type AnimatedSprite = SpriteFrame[];

/** Single-character colour palette. Bright and playful, but readable on dark. */
export const PALETTE: Record<string, string> = {
  '.': 'transparent',
  ' ': 'transparent',
  k: '#0b1020', // near-black outline
  w: '#f8fafc', // white
  s: '#e2c6a0', // skin
  e: '#94a3b8', // slate / stone
  r: '#ef4444', // red
  o: '#f97316', // orange
  y: '#facc15', // yellow / gold
  g: '#22c55e', // green
  c: '#22d3ee', // cyan
  b: '#3b82f6', // blue
  p: '#a855f7', // purple
  m: '#ec4899', // magenta
  t: '#2dd4bf', // teal
  n: '#1e293b', // navy (suit)
};

// --- Player cannon -----------------------------------------------------------

const PLAYER: AnimatedSprite = [
  [
    '......w......',
    '......w......',
    '.....www.....',
    '..ttttttttt..',
    '.ttttttttttt.',
    'ttttttttttttt',
    'tt.ttttttt.tt',
    't...t...t...t',
  ],
  [
    '......w......',
    '......w......',
    '.....www.....',
    '..ttttttttt..',
    '.ttttttttttt.',
    'ttttttttttttt',
    'tt.ttttttt.tt',
    't..t.t.t.t..t',
  ],
];

// --- Enemies (11 wide) -------------------------------------------------------

const LOAN_SHARK: AnimatedSprite = [
  [
    '....b......',
    '...bb......',
    '.bbbbbbbbb.',
    'bbbkbbbbbbb',
    'bbbbbbbbbbb',
    'wbwbwbwbwbw',
    '.w.w.w.w.w.',
    '..b.....b..',
  ],
  [
    '....b......',
    '...bb......',
    '.bbbbbbbbb.',
    'bbbkbbbbbbb',
    'bbbbbbbbbbb',
    '.w.w.w.w.w.',
    'wbwbwbwbwbw',
    'b..b...b..b',
  ],
];

const HEDGE_FUND: AnimatedSprite = [
  [
    '...sssss...',
    '..sssssss..',
    '..sk.s.ks..',
    '..sssssss..',
    '.wwwwrwwww.',
    'nwwwwrwwwwn',
    'nnwwwrwwwnn',
    'nn.nnrnn.nn',
  ],
  [
    '...sssss...',
    '..sssssss..',
    '..sk.s.ks..',
    '..sssssss..',
    'nwwwwrwwwwn',
    'nnwwwrwwwnn',
    '.nwwwrwwwn.',
    '.n.nnrnn.n.',
  ],
];

const DEBT_COLLECTOR: AnimatedSprite = [
  [
    '.kkkkkkkkk.',
    '...kkkkk...',
    '..ooooooo..',
    '..okoooko..',
    '..ooooooo..',
    '..okkkkko..',
    '.o.ooooo.o.',
    'o...o.o...o',
  ],
  [
    '.kkkkkkkkk.',
    '...kkkkk...',
    '..ooooooo..',
    '..okoooko..',
    '..ooooooo..',
    '..okkkkko..',
    'o..ooooo..o',
    '.o.o...o.o.',
  ],
];

const PAYDAY_LENDER: AnimatedSprite = [
  [
    '..mmmmmmm..',
    '.mmmmmmmmm.',
    'mmykmmmkymm',
    'mmmmmmmmmmm',
    'mwwwwwwwwwm',
    'mwkwkwkwkwm',
    '.mmmmmmmmm.',
    '..m.m.m.m..',
  ],
  [
    '..mmmmmmm..',
    '.mmmmmmmmm.',
    'mmkymmmykmm',
    'mmmmmmmmmmm',
    'mwwwwwwwwwm',
    'mwkwkwkwkwm',
    '.mmmmmmmmm.',
    '.m.m.m.m.m.',
  ],
];

const CRYPTO_BRO: AnimatedSprite = [
  [
    '..yyyyyyy..',
    '.yyyyyyyyy.',
    '.sssssssss.',
    'kkkkkkkkkkk',
    '.s.r.s.r.s.',
    '.sssssssss.',
    '.s.sssss.s.',
    '...sssss...',
  ],
  [
    '..yyyyyyy..',
    '.yyyyyyyyy.',
    '.sssssssss.',
    'kkkkkkkkkkk',
    '.s.s.s.s.s.',
    '.sssssssss.',
    '.skkkkkks..',
    '...sssss...',
  ],
];

const VULTURE_FUND: AnimatedSprite = [
  [
    'k.........k',
    '.kk.....kk.',
    '.kkkkkkkkk.',
    'kkrkkkkrkkk',
    '.kkkkkkkkk.',
    '..kkyykk...',
    '...kyyk....',
    '....kk.....',
  ],
  [
    '.kk.....kk.',
    'k..k...k..k',
    '.kkkkkkkkk.',
    'kkrkkkkrkkk',
    '.kkkkkkkkk.',
    '..kkyykk...',
    '...kyyk....',
    '....kk.....',
  ],
];

// --- Bonus UFO (11 wide) -----------------------------------------------------

const UFO: AnimatedSprite = [
  ['...ppppp...', '..pwpwpwp..', '.ppppppppp.', 'wpwpwpwpwpw', '.w.w.w.w.w.'],
  ['...ppppp...', '..pwpwpwp..', '.ppppppppp.', 'wpwpwpwpwpw', 'w.w.w.w.w.w'],
];

// --- Bosses (13 wide) --------------------------------------------------------

const BOSS_CEO: AnimatedSprite = [
  [
    '...kkkkkkk...',
    '..ksssssssk..',
    '.sssssssssss.',
    '.skk.sss.kks.',
    '.sssssssssss.',
    '.swwwwrwwwws.',
    'byyyyyrwyyyyb',
    'bbyyyyrwyyybb',
    'bb.yyyrwyy.bb',
    'bbb.yyrwy.bbb',
  ],
  [
    '...kkkkkkk...',
    '..ksssssssk..',
    '.sssssssssss.',
    '.skk.sss.kks.',
    '.sssssssssss.',
    '.swwwwrwwwws.',
    'byyyyyrwyyyyb',
    'bbyyyyrwyyybb',
    'b.byyyrwyyb.b',
    'b.b.yyrwy.b.b',
  ],
];

const BOSS_BANK: AnimatedSprite = [
  [
    '......k......',
    '.....yyy.....',
    '...sssssss...',
    '..s.k.r.k.s..',
    '.sssssssssss.',
    'ekekekekekeke',
    'ekekekekekeke',
    'ekekekekekeke',
    'sssssssssssss',
    'ksssssssssssk',
  ],
  [
    '......r......',
    '.....yyy.....',
    '...sssssss...',
    '..s.k.r.k.s..',
    '.sssssssssss.',
    'ekekekekekeke',
    'kekekekekekek',
    'ekekekekekeke',
    'sssssssssssss',
    'ksssssssssssk',
  ],
];

// --- THE BUREAU (indestructible interlude boss, 13 wide) ---------------------

const BUREAU: AnimatedSprite = [
  [
    '....kkkkk....',
    '..ksssssssk..',
    '..sskssskss..',
    '..sssssssss..',
    '..ssskkksss..',
    '.nnnnwwwnnnn.',
    '.nnnwwywwnnn.',
    '.nnnnwywnnnn.',
    '.nnnnnynnnnn.',
    '.nnn.nnn.nnn.',
  ],
  [
    '....kkkkk....',
    '..ksssssssk..',
    '..sskssskss..',
    '..sssssssss..',
    '..ssskkksss..',
    '.nnnnwwwnnnn.',
    '.nnnwwywwnnn.',
    '.nnnwyyywnnn.',
    '.nnnnyyynnnn.',
    '.nnn.nnn.nnn.',
  ],
];

export type EnemyKind = 'loanShark' | 'hedgeFund' | 'debtCollector' | 'paydayLender' | 'cryptoBro' | 'vultureFund';

export type BossKind = 'bossCeo' | 'bossBank';

export const ENEMY_SPRITES: Record<EnemyKind, AnimatedSprite> = {
  loanShark: LOAN_SHARK,
  hedgeFund: HEDGE_FUND,
  debtCollector: DEBT_COLLECTOR,
  paydayLender: PAYDAY_LENDER,
  cryptoBro: CRYPTO_BRO,
  vultureFund: VULTURE_FUND,
};

export const BOSS_SPRITES: Record<BossKind, AnimatedSprite> = {
  bossCeo: BOSS_CEO,
  bossBank: BOSS_BANK,
};

export const PLAYER_SPRITE = PLAYER;
export const UFO_SPRITE = UFO;
export const BUREAU_SPRITE = BUREAU;

export function spriteSize(frame: SpriteFrame): { cols: number; rows: number } {
  const rows = frame.length;
  const cols = frame.reduce((max, line) => Math.max(max, line.length), 0);
  return { cols, rows };
}

/**
 * Renders a sprite frame at (dx, dy) with the given pixel size. Coordinates are
 * in the canvas' (logical) coordinate space; image smoothing should be off for
 * crisp pixels.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  dx: number,
  dy: number,
  pixel: number,
  tint?: string,
): void {
  for (let row = 0; row < frame.length; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === '.' || key === ' ') continue;
      const color = tint ?? PALETTE[key] ?? '#ffffff';
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(dx + col * pixel), Math.round(dy + row * pixel), pixel, pixel);
    }
  }
}
