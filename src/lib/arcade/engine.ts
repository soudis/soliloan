/**
 * Procrastinator game engine - a Space Invaders style shooter where the player
 * fights loan sharks, hedge fund managers and other financial villains.
 *
 * Framework-agnostic: it owns the canvas, the requestAnimationFrame loop and all
 * game state, and reports HUD changes through a callback so React only re-renders
 * when score/lives/wave/status actually change.
 */

import {
  BOSS_SPRITES,
  type BossKind,
  drawSprite,
  ENEMY_SPRITES,
  type EnemyKind,
  PLAYER_SPRITE,
  spriteSize,
  UFO_SPRITE,
} from './sprites';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export interface GameHud {
  score: number;
  lives: number;
  wave: number;
  status: GameStatus;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  onHud: (hud: GameHud) => void;
  playSfx?: (name: string) => void;
}

const WIDTH = 480;
const HEIGHT = 640;
const PIXEL = 3;
const BOSS_PIXEL = 4;

const COLS = 8;
const ROWS = 5;
const MARGIN = 16;
const DROP = 12;

const PLAYER_SPEED = 320; // px/s
const PLAYER_BULLET_SPEED = 540;
const ENEMY_BULLET_SPEED = 220;
const PLAYER_FIRE_COOLDOWN = 0.32;
const MAX_PLAYER_BULLETS = 3;
const START_LIVES = 3;
const PLAYER_Y = HEIGHT - 60;
const INVULN_TIME = 1.6;

const ENEMY_ORDER: EnemyKind[] = [
  'loanShark',
  'hedgeFund',
  'paydayLender',
  'debtCollector',
  'cryptoBro',
  'vultureFund',
];

const ENEMY_STATS: Record<EnemyKind, { hp: number; points: number }> = {
  loanShark: { hp: 1, points: 10 },
  hedgeFund: { hp: 1, points: 20 },
  paydayLender: { hp: 1, points: 25 },
  debtCollector: { hp: 2, points: 30 },
  cryptoBro: { hp: 2, points: 40 },
  vultureFund: { hp: 3, points: 60 },
};

interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  vx?: number;
  color: string;
  /** Remaining extra enemies this (player) bullet can pass through. */
  pierce?: number;
  dead?: boolean;
}

interface CannonUpgrades {
  /** Each level shortens the fire cooldown. */
  rapid: number;
  /** Number of bullets fired per shot. */
  spread: number;
  /** Max player bullets allowed on screen at once. */
  maxBullets: number;
  /** Extra enemies a bullet pierces through. */
  pierce: number;
}

type UpgradeKind = keyof CannonUpgrades;

const UPGRADE_CAPS: CannonUpgrades = { rapid: 5, spread: 3, maxBullets: 6, pierce: 4 };
const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  rapid: 'RAPID FIRE!',
  spread: 'SPREAD SHOT!',
  maxBullets: 'EXTRA AMMO!',
  pierce: 'PIERCING ROUNDS!',
};

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  alive: boolean;
}

interface Boss {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: BossKind;
  hp: number;
  maxHp: number;
  dir: number;
  speed: number;
  fireTimer: number;
  attackTimer: number;
  name: string;
}

/** A regular enemy "dispatched" by a boss to dive at the player. */
interface Diver {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: EnemyKind;
  hp: number;
  vx: number;
  vy: number;
  alive: boolean;
}

interface Ufo {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

function aabb(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const PARTICLE_COLORS = ['#facc15', '#f97316', '#ef4444', '#f8fafc'];

export class GameEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onHud: (hud: GameHud) => void;
  private readonly playSfx: (name: string) => void;

  private rafId = 0;
  private lastTime = 0;
  private status: GameStatus = 'idle';

  private score = 0;
  private lives = START_LIVES;
  private wave = 1;
  private lastHud: GameHud = { score: 0, lives: START_LIVES, wave: 1, status: 'idle' };

  readonly input = { left: false, right: false, fire: false };

  private player = { x: WIDTH / 2 - 20, y: PLAYER_Y, w: 39, h: 24, cooldown: 0, invuln: 0 };
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private divers: Diver[] = [];
  private ufo: Ufo | null = null;
  private particles: Particle[] = [];
  private stars: Star[] = [];

  private formationDir = 1;
  private formationAnim = 0;
  private frame = 0;
  private enemyFireTimer = 1.2;
  private ufoTimer = 12;
  private waveBannerTimer = 0;
  private bannerText = '';
  private attackText = '';
  private attackTextTimer = 0;
  private waveSpeedJitter = 1;

  private upgrades: CannonUpgrades = { rapid: 0, spread: 1, maxBullets: MAX_PLAYER_BULLETS, pierce: 0 };

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.onHud = options.onHud;
    this.playSfx = options.playSfx ?? (() => {});
    this.initStars();
  }

  private initStars(): void {
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 12 + Math.random() * 40,
      size: Math.random() < 0.8 ? 1 : 2,
    }));
  }

  start(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.wave = 1;
    this.player = { x: WIDTH / 2 - 20, y: PLAYER_Y, w: 39, h: 24, cooldown: 0, invuln: 0 };
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.boss = null;
    this.divers = [];
    this.ufo = null;
    this.ufoTimer = 8;
    this.upgrades = { rapid: 0, spread: 1, maxBullets: MAX_PLAYER_BULLETS, pierce: 0 };
    this.buildWave();
    this.status = 'playing';
    this.lastTime = performance.now();
    this.emitHud(true);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.emitHud();
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.lastTime = performance.now();
      this.emitHud();
    }
  }

  togglePause(): void {
    if (this.status === 'playing') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getScore(): number {
    return this.score;
  }

  getWave(): number {
    return this.wave;
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private buildWave(): void {
    this.playerBullets = [];
    this.enemyBullets = [];
    this.divers = [];
    this.formationDir = 1;
    this.enemyFireTimer = Math.max(0.5, 1.35 - this.wave * 0.05);
    // Light per-wave RNG so each run feels a little different.
    this.waveSpeedJitter = 0.9 + Math.random() * 0.3;

    if (this.wave % 5 === 0) {
      this.spawnBoss();
      return;
    }

    this.enemies = [];
    const enemyW = spriteSize(ENEMY_SPRITES.loanShark[0]).cols * PIXEL;
    const enemyH = spriteSize(ENEMY_SPRITES.loanShark[0]).rows * PIXEL;
    const colGap = 18;
    const rowGap = 16;
    const totalW = COLS * enemyW + (COLS - 1) * colGap;
    const startX = (WIDTH - totalW) / 2;
    const startY = 70;

    const maxTier = Math.min(ENEMY_ORDER.length - 1, 1 + Math.floor((this.wave - 1) / 1.8));
    for (let r = 0; r < ROWS; r++) {
      const fromBottom = ROWS - 1 - r;
      const tier = Math.min(maxTier, fromBottom);
      for (let c = 0; c < COLS; c++) {
        // Small chance to spawn a tougher "elite" variant for variety.
        let kind = ENEMY_ORDER[tier];
        if (tier < maxTier && Math.random() < 0.12) {
          const upTier = tier + 1 + Math.floor(Math.random() * (maxTier - tier));
          kind = ENEMY_ORDER[Math.min(maxTier, upTier)];
        }
        const stats = ENEMY_STATS[kind];
        this.enemies.push({
          x: startX + c * (enemyW + colGap),
          y: startY + r * (enemyH + rowGap),
          w: enemyW,
          h: enemyH,
          kind,
          hp: stats.hp,
          maxHp: stats.hp,
          alive: true,
        });
      }
    }

    this.showBanner(`WAVE ${this.wave}`);
    this.playSfx('waveUp');
  }

  private spawnBoss(): void {
    const kind: BossKind = (this.wave / 5) % 2 === 1 ? 'bossCeo' : 'bossBank';
    const size = spriteSize(BOSS_SPRITES[kind][0]);
    const w = size.cols * BOSS_PIXEL;
    const h = size.rows * BOSS_PIXEL;
    const hp = 26 + this.wave * 4;
    this.enemies = [];
    this.boss = {
      x: WIDTH / 2 - w / 2,
      y: 70,
      w,
      h,
      kind,
      hp,
      maxHp: hp,
      dir: 1,
      speed: 80 + this.wave * 4,
      fireTimer: 1.4,
      attackTimer: 2.8,
      name: kind === 'bossCeo' ? 'CONDESCENDING BILLIONAIRE' : 'REAL ESTATE TYCOON',
    };
    this.showBanner(`BOSS: ${this.boss.name}`);
    this.playSfx('bossAppear');
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.waveBannerTimer = 1.8;
  }

  private announceAttack(text: string): void {
    this.attackText = text;
    this.attackTextTimer = 1;
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.status === 'playing') {
      this.update(dt);
    }
    this.render();
  };

  private update(dt: number): void {
    if (this.waveBannerTimer > 0) this.waveBannerTimer -= dt;
    if (this.attackTextTimer > 0) this.attackTextTimer -= dt;
    this.updateStars(dt);
    this.updatePlayer(dt);
    this.updateBullets(dt);
    if (this.boss) this.updateBoss(dt);
    else this.updateFormation(dt);
    this.updateDivers(dt);
    this.updateUfo(dt);
    this.updateParticles(dt);
    this.handleCollisions();
    this.checkWaveComplete();
    this.emitHud();
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > HEIGHT) {
        star.y = 0;
        star.x = Math.random() * WIDTH;
      }
    }
  }

  private updatePlayer(dt: number): void {
    const dir = (this.input.left ? -1 : 0) + (this.input.right ? 1 : 0);
    this.player.x += dir * PLAYER_SPEED * dt;
    this.player.x = Math.max(MARGIN, Math.min(WIDTH - MARGIN - this.player.w, this.player.x));

    if (this.player.cooldown > 0) this.player.cooldown -= dt;
    if (this.player.invuln > 0) this.player.invuln -= dt;

    if (this.input.fire && this.player.cooldown <= 0 && this.playerBullets.length < this.upgrades.maxBullets) {
      this.fire();
      this.player.cooldown = PLAYER_FIRE_COOLDOWN * 0.86 ** this.upgrades.rapid;
      this.playSfx('shoot');
    }
  }

  private fire(): void {
    const cx = this.player.x + this.player.w / 2;
    const top = this.player.y - 6;
    const shots = this.upgrades.spread;
    const color = this.upgrades.pierce > 0 ? '#f472b6' : '#22d3ee';
    // Each pierce upgrade level adds 0.5 "pierce power" (probabilistic penetration).
    const pierce = this.upgrades.pierce * 0.5;
    // Centre the fan of bullets around the cannon.
    for (let i = 0; i < shots; i++) {
      const offset = shots === 1 ? 0 : i - (shots - 1) / 2;
      this.playerBullets.push({
        x: cx - 2 + offset * 10,
        y: top,
        w: 4,
        h: 12,
        vy: -PLAYER_BULLET_SPEED,
        vx: offset * 60,
        color,
        pierce,
      });
    }
  }

  private updateBullets(dt: number): void {
    this.playerBullets = this.playerBullets.filter((b) => {
      b.y += b.vy * dt;
      if (b.vx) b.x += b.vx * dt;
      return b.y + b.h > 0 && b.x > -10 && b.x < WIDTH + 10;
    });
    this.enemyBullets = this.enemyBullets.filter((b) => {
      b.y += b.vy * dt;
      if (b.vx) b.x += b.vx * dt;
      return b.y < HEIGHT && b.x > -20 && b.x < WIDTH + 20;
    });
  }

  private updateFormation(dt: number): void {
    const alive = this.enemies.filter((e) => e.alive);
    if (alive.length === 0) return;

    const aliveRatio = alive.length / (ROWS * COLS);
    const speed = (16 + this.wave * 4) * (1 + (1 - aliveRatio) * 1.3) * this.waveSpeedJitter;

    let minX = Infinity;
    let maxX = -Infinity;
    let maxBottom = -Infinity;
    for (const e of alive) {
      const dx = this.formationDir * speed * dt;
      e.x += dx;
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x + e.w);
      maxBottom = Math.max(maxBottom, e.y + e.h);
    }

    if (minX < MARGIN || maxX > WIDTH - MARGIN) {
      this.formationDir *= -1;
      const nudge = minX < MARGIN ? MARGIN - minX : WIDTH - MARGIN - maxX;
      for (const e of alive) {
        e.x += nudge;
        e.y += DROP;
      }
      maxBottom += DROP;
    }

    this.formationAnim += dt;
    const frameInterval = Math.max(0.18, 0.6 - this.wave * 0.03);
    if (this.formationAnim >= frameInterval) {
      this.formationAnim = 0;
      this.frame ^= 1;
    }

    if (maxBottom >= this.player.y - 6) {
      this.gameOver();
      return;
    }

    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer <= 0) {
      this.formationFire(alive);
      this.enemyFireTimer = Math.max(0.4, (1.35 - this.wave * 0.05) * (0.6 + Math.random() * 0.8));
    }
  }

  private formationFire(alive: Enemy[]): void {
    // Pick the lowest enemy in a random column so shots come from the front.
    const shooter = alive[Math.floor(Math.random() * alive.length)];
    let lowest = shooter;
    for (const e of alive) {
      if (Math.abs(e.x - shooter.x) < 4 && e.y > lowest.y) lowest = e;
    }
    this.enemyBullets.push({
      x: lowest.x + lowest.w / 2 - 2,
      y: lowest.y + lowest.h,
      w: 4,
      h: 12,
      vy: ENEMY_BULLET_SPEED + this.wave * 6,
      color: '#f97316',
    });
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    if (!boss) return;
    boss.x += boss.dir * boss.speed * dt;
    if (boss.x < MARGIN) {
      boss.x = MARGIN;
      boss.dir = 1;
    } else if (boss.x + boss.w > WIDTH - MARGIN) {
      boss.x = WIDTH - MARGIN - boss.w;
      boss.dir = -1;
    }

    this.formationAnim += dt;
    if (this.formationAnim >= 0.3) {
      this.formationAnim = 0;
      this.frame ^= 1;
    }

    // Normal aimed-ish triple shot.
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      const cx = boss.x + boss.w / 2;
      const by = boss.y + boss.h;
      for (const spread of [-1, 0, 1]) {
        this.enemyBullets.push({
          x: cx - 2 + spread * 16,
          y: by,
          w: 4,
          h: 14,
          vy: ENEMY_BULLET_SPEED + 40,
          color: '#ef4444',
        });
      }
      boss.fireTimer = Math.max(0.7, 1.5 - this.wave * 0.02);
    }

    // Special attacks on a separate timer.
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      this.bossSpecialAttack(boss);
      boss.attackTimer = Math.max(1.6, 3.4 - this.wave * 0.06);
    }
  }

  private bossSpecialAttack(boss: Boss): void {
    const attacks = ['barrage', 'aimed', 'dispatch', 'rain'] as const;
    const attack = attacks[Math.floor(Math.random() * attacks.length)];
    const cx = boss.x + boss.w / 2;
    const by = boss.y + boss.h;

    switch (attack) {
      case 'barrage': {
        // Wide fan that forces the player to keep moving.
        this.announceAttack('BARRAGE!');
        const count = 5;
        for (let i = 0; i < count; i++) {
          const spread = i - (count - 1) / 2;
          this.enemyBullets.push({
            x: cx - 2,
            y: by,
            w: 4,
            h: 12,
            vx: spread * 46,
            vy: ENEMY_BULLET_SPEED + 30,
            color: '#fb923c',
          });
        }
        this.playSfx('hit');
        break;
      }
      case 'aimed': {
        // Three fast shots converging on the player's current position.
        this.announceAttack('TARGETED!');
        const px = this.player.x + this.player.w / 2;
        const py = this.player.y;
        const speed = ENEMY_BULLET_SPEED + 130;
        for (const fanned of [-0.12, 0, 0.12]) {
          const ang = Math.atan2(py - by, px - cx) + fanned;
          this.enemyBullets.push({
            x: cx - 2,
            y: by,
            w: 5,
            h: 10,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            color: '#f43f5e',
          });
        }
        this.playSfx('shoot');
        break;
      }
      case 'dispatch': {
        // Send 1-2 enemies diving at the player.
        this.announceAttack('DISPATCH!');
        const maxTier = Math.min(ENEMY_ORDER.length - 1, 2 + Math.floor(this.wave / 5));
        const divers = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < divers; i++) {
          const kind = ENEMY_ORDER[Math.floor(Math.random() * (maxTier + 1))];
          const size = spriteSize(ENEMY_SPRITES[kind][0]);
          this.divers.push({
            x: cx - (size.cols * PIXEL) / 2 + (i === 0 ? -30 : 30),
            y: by,
            w: size.cols * PIXEL,
            h: size.rows * PIXEL,
            kind,
            hp: ENEMY_STATS[kind].hp + 1,
            vx: 0,
            vy: 150 + this.wave * 4,
            alive: true,
          });
        }
        this.playSfx('bossAppear');
        break;
      }
      case 'rain': {
        // A curtain of bullets falling from random points across the top.
        this.announceAttack('CASH RAIN!');
        for (let i = 0; i < 7; i++) {
          this.enemyBullets.push({
            x: 20 + Math.random() * (WIDTH - 40),
            y: 30 + Math.random() * 30,
            w: 4,
            h: 12,
            vy: ENEMY_BULLET_SPEED + 20 + Math.random() * 60,
            color: '#22d3ee',
          });
        }
        this.playSfx('hit');
        break;
      }
    }
  }

  private updateDivers(dt: number): void {
    if (this.divers.length === 0) return;
    for (const diver of this.divers) {
      if (!diver.alive) continue;
      // Light homing toward the player's horizontal position.
      const targetX = this.player.x + this.player.w / 2;
      const cx = diver.x + diver.w / 2;
      diver.vx += Math.sign(targetX - cx) * 140 * dt;
      diver.vx = Math.max(-130, Math.min(130, diver.vx));
      diver.x += diver.vx * dt;
      diver.y += diver.vy * dt;
      diver.x = Math.max(MARGIN, Math.min(WIDTH - MARGIN - diver.w, diver.x));

      if (this.player.invuln <= 0 && aabb(diver, this.player)) {
        diver.alive = false;
        this.hitPlayer();
      }
    }
    this.divers = this.divers.filter((d) => d.alive && d.y < HEIGHT + 20);
  }

  private updateUfo(dt: number): void {
    if (this.ufo) {
      this.ufo.x += this.ufo.dir * 120 * dt;
      if (this.ufo.x > WIDTH + 40 || this.ufo.x < -40) this.ufo = null;
      return;
    }
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0 && this.status === 'playing') {
      const size = spriteSize(UFO_SPRITE[0]);
      const fromLeft = Math.random() < 0.5;
      this.ufo = {
        x: fromLeft ? -40 : WIDTH + 40,
        y: 40,
        w: size.cols * PIXEL,
        h: size.rows * PIXEL,
        dir: fromLeft ? 1 : -1,
      };
      this.ufoTimer = 10 + Math.random() * 9;
    }
  }

  private updateParticles(dt: number): void {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  private grantRandomUpgrade(): void {
    const pool = (Object.keys(UPGRADE_CAPS) as UpgradeKind[]).filter((k) => this.upgrades[k] < UPGRADE_CAPS[k]);
    if (pool.length === 0) {
      // Already maxed out - hand out bonus points instead.
      this.score += 200;
      this.showBanner('BONUS!');
      this.playSfx('bonus');
      return;
    }
    const kind = pool[Math.floor(Math.random() * pool.length)];
    this.upgrades[kind] += 1;
    this.showBanner(UPGRADE_LABELS[kind]);
    this.playSfx('bonus');
  }

  private spawnExplosion(x: number, y: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      });
    }
  }

  private handleCollisions(): void {
    // Player bullets vs enemies / boss / ufo.
    for (const bullet of this.playerBullets) {
      if (bullet.dead) continue;

      if (this.boss && aabb(bullet, this.boss)) {
        this.boss.hp -= 1;
        this.score += 5;
        this.spawnExplosion(bullet.x, bullet.y, 4);
        this.playSfx('hit');
        bullet.dead = true;
        if (this.boss.hp <= 0) {
          this.spawnExplosion(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 40);
          this.score += 500 + this.wave * 20;
          this.boss = null;
          this.playSfx('explosion');
        }
        continue;
      }

      if (this.ufo && aabb(bullet, this.ufo)) {
        this.score += 75;
        this.spawnExplosion(this.ufo.x + this.ufo.w / 2, this.ufo.y + this.ufo.h / 2, 18);
        this.ufo = null;
        this.grantRandomUpgrade();
        bullet.dead = true;
        continue;
      }

      let hitDiver = false;
      for (const diver of this.divers) {
        if (!diver.alive) continue;
        if (aabb(bullet, diver)) {
          diver.hp -= 1;
          if (diver.hp <= 0) {
            diver.alive = false;
            this.score += ENEMY_STATS[diver.kind].points * 2;
            this.spawnExplosion(diver.x + diver.w / 2, diver.y + diver.h / 2, 14);
            this.playSfx('explosion');
          } else {
            this.spawnExplosion(bullet.x, bullet.y, 4);
            this.playSfx('hit');
          }
          if (bullet.pierce && Math.random() < Math.min(1, bullet.pierce)) {
            bullet.pierce -= 0.5;
          } else {
            bullet.dead = true;
          }
          hitDiver = true;
          break;
        }
      }
      if (hitDiver) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (aabb(bullet, enemy)) {
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            this.score += ENEMY_STATS[enemy.kind].points;
            this.spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 14);
            this.playSfx('explosion');
          } else {
            this.spawnExplosion(bullet.x, bullet.y, 4);
            this.playSfx('hit');
          }
          // Probabilistic penetration: chance = min(1, remaining pierce power);
          // each successful pierce spends 0.5 power.
          if (bullet.pierce && Math.random() < Math.min(1, bullet.pierce)) {
            bullet.pierce -= 0.5;
          } else {
            bullet.dead = true;
          }
          break;
        }
      }
    }
    this.playerBullets = this.playerBullets.filter((b) => !b.dead);

    // Enemy bullets vs player.
    if (this.player.invuln <= 0) {
      for (const bullet of this.enemyBullets) {
        if (aabb(bullet, this.player)) {
          bullet.y = HEIGHT + 100;
          this.hitPlayer();
          break;
        }
      }
      this.enemyBullets = this.enemyBullets.filter((b) => b.y < HEIGHT);
    }
  }

  private hitPlayer(): void {
    this.lives -= 1;
    this.player.invuln = INVULN_TIME;
    this.spawnExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 24);
    this.playSfx('playerHit');
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.status = 'gameover';
    this.playSfx('gameOver');
    this.emitHud(true);
  }

  private checkWaveComplete(): void {
    if (this.status !== 'playing') return;
    const formationCleared = this.enemies.length > 0 && this.enemies.every((e) => !e.alive);
    const bossCleared = this.boss === null && this.enemies.length === 0;
    if (formationCleared || bossCleared) {
      this.wave += 1;
      this.buildWave();
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#070b18';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Stars
    for (const star of this.stars) {
      ctx.fillStyle = star.size > 1 ? '#93c5fd' : '#334155';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Ground line
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, PLAYER_Y + this.player.h + 8, WIDTH, 2);

    // Enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      drawSprite(ctx, ENEMY_SPRITES[enemy.kind][this.frame], enemy.x, enemy.y, PIXEL);
    }

    // Boss + HP bar
    if (this.boss) {
      drawSprite(ctx, BOSS_SPRITES[this.boss.kind][this.frame], this.boss.x, this.boss.y, BOSS_PIXEL);
      const barW = WIDTH - 80;
      const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 24, barW, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(40, 24, barW * ratio, 8);
    }

    // Divers (boss "dispatch" attack)
    for (const diver of this.divers) {
      if (!diver.alive) continue;
      drawSprite(ctx, ENEMY_SPRITES[diver.kind][this.frame], diver.x, diver.y, PIXEL);
    }

    // UFO
    if (this.ufo) {
      drawSprite(ctx, UFO_SPRITE[this.frame], this.ufo.x, this.ufo.y, PIXEL);
    }

    // Bullets
    for (const b of this.playerBullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    for (const b of this.enemyBullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // Player (blink while invulnerable)
    const blink = this.player.invuln > 0 && Math.floor(this.player.invuln * 12) % 2 === 0;
    if (!blink && this.status !== 'gameover') {
      drawSprite(ctx, PLAYER_SPRITE[this.frame], this.player.x, this.player.y, PIXEL);
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // Cannon upgrade indicators
    const badges: string[] = [];
    if (this.upgrades.rapid > 0) badges.push(`RAPID x${this.upgrades.rapid}`);
    if (this.upgrades.spread > 1) badges.push(`SPREAD x${this.upgrades.spread}`);
    if (this.upgrades.maxBullets > MAX_PLAYER_BULLETS) badges.push(`AMMO ${this.upgrades.maxBullets}`);
    if (this.upgrades.pierce > 0) badges.push(`PIERCE x${this.upgrades.pierce}`);
    if (badges.length > 0) {
      ctx.fillStyle = '#5eead4';
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(badges.join('  '), 8, HEIGHT - 8);
    }

    // Boss special-attack announcement (small, near top)
    if (this.attackTextTimer > 0 && this.status === 'playing') {
      ctx.globalAlpha = Math.min(1, this.attackTextTimer * 2);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.attackText, WIDTH / 2, 52);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Wave / boss banner
    if (this.waveBannerTimer > 0 && this.status === 'playing') {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.bannerText, WIDTH / 2, HEIGHT / 2);
      ctx.textAlign = 'left';
    }
  }

  private emitHud(force = false): void {
    if (
      force ||
      this.score !== this.lastHud.score ||
      this.lives !== this.lastHud.lives ||
      this.wave !== this.lastHud.wave ||
      this.status !== this.lastHud.status
    ) {
      this.lastHud = { score: this.score, lives: this.lives, wave: this.wave, status: this.status };
      this.onHud(this.lastHud);
    }
  }
}
