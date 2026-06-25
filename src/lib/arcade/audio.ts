/**
 * Audio for the Procrastinator mini-game.
 *
 * - Sound effects are synthesised live via the Web Audio API (no binary assets).
 * - The background soundtrack is an optional user-provided file served from
 *   `/arcade/soundtrack.mp3`; everything degrades gracefully if it is missing.
 *
 * The audio context is created lazily on the first user gesture to respect
 * browser autoplay policies.
 */

export type SfxName =
  | 'shoot'
  | 'hit'
  | 'explosion'
  | 'playerHit'
  | 'waveUp'
  | 'bossAppear'
  | 'bonus'
  | 'gameOver'
  | 'auditAppear'
  | 'stamp';

const SOUNDTRACK_URL = '/arcade/soundtrack.mp3';

export class ArcadeAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private musicAvailable = true;
  private muted = false;

  /** Lazily create the audio context. Safe to call repeatedly. */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** Call from a user gesture (e.g. game start) to unlock audio + music. */
  unlock(): void {
    this.ensureContext();
    this.startMusic();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
    if (this.music) {
      this.music.muted = muted;
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startMusic(): void {
    if (!this.musicAvailable || typeof Audio === 'undefined') return;
    if (!this.music) {
      const audio = new Audio(SOUNDTRACK_URL);
      audio.loop = true;
      audio.volume = 0.4;
      audio.muted = this.muted;
      audio.addEventListener('error', () => {
        this.musicAvailable = false;
      });
      this.music = audio;
    }
    const playPromise = this.music.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked or file missing - ignore, SFX still work.
      });
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  pauseMusic(): void {
    this.music?.pause();
  }

  resumeMusic(): void {
    if (this.musicAvailable && this.music) {
      this.music.play().catch(() => {});
    }
  }

  /** Play a synthesised sound effect. No-ops when muted or unsupported. */
  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;

    switch (name) {
      case 'shoot':
        this.blip(ctx, { type: 'square', from: 880, to: 1320, duration: 0.12, gain: 0.18 });
        break;
      case 'hit':
        this.blip(ctx, { type: 'square', from: 440, to: 180, duration: 0.1, gain: 0.16 });
        break;
      case 'explosion':
        this.noise(ctx, { duration: 0.32, gain: 0.25 });
        break;
      case 'playerHit':
        this.blip(ctx, { type: 'sawtooth', from: 300, to: 60, duration: 0.5, gain: 0.28 });
        this.noise(ctx, { duration: 0.4, gain: 0.2 });
        break;
      case 'waveUp':
        this.arp(ctx, [523, 659, 784, 1047], 0.09, 'square', 0.16);
        break;
      case 'bossAppear':
        this.arp(ctx, [196, 165, 147, 110], 0.16, 'sawtooth', 0.22);
        break;
      case 'bonus':
        this.arp(ctx, [784, 988, 1319], 0.07, 'triangle', 0.18);
        break;
      case 'gameOver':
        this.arp(ctx, [392, 330, 262, 196, 131], 0.18, 'square', 0.22);
        break;
      case 'auditAppear':
        // Ominous descending low arp for THE BUREAU.
        this.arp(ctx, [220, 174, 146, 110, 82], 0.16, 'sawtooth', 0.24);
        break;
      case 'stamp':
        // Short bureaucratic "thud" when a § is stamped out.
        this.blip(ctx, { type: 'square', from: 180, to: 70, duration: 0.08, gain: 0.16 });
        this.noise(ctx, { duration: 0.06, gain: 0.12 });
        break;
    }
  }

  private blip(
    ctx: AudioContext,
    opts: { type: OscillatorType; from: number; to: number; duration: number; gain: number },
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(opts.from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), now + opts.duration);
    gain.gain.setValueAtTime(opts.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
    osc.connect(gain).connect(this.master as GainNode);
    osc.start(now);
    osc.stop(now + opts.duration + 0.02);
  }

  private arp(ctx: AudioContext, freqs: number[], step: number, type: OscillatorType, gainValue: number): void {
    const now = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      const start = now + i * step;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(gainValue, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + step);
      osc.connect(gain).connect(this.master as GainNode);
      osc.start(start);
      osc.stop(start + step + 0.02);
    });
  }

  private noise(ctx: AudioContext, opts: { duration: number; gain: number }): void {
    const bufferSize = Math.floor(ctx.sampleRate * opts.duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + opts.duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    source
      .connect(filter)
      .connect(gain)
      .connect(this.master as GainNode);
    source.start();
  }

  /** Release all resources. */
  dispose(): void {
    this.stopMusic();
    this.music = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
