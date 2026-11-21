import { gameEvents } from '../tools/gameEvents';
import type { CoherenceTier } from '../types';

export type { CoherenceTier };

export const COHERENCE_MAX = 100;
export const COHERENCE_IDLE_THRESHOLD_MS = 350;
export const COHERENCE_IDLE_VELOCITY_THRESHOLD = 20;
export const COHERENCE_DECAY_PER_SEC = 45;
export const COHERENCE_PASSIVE_DECAY_PER_SEC = 8;
export const COHERENCE_HYPER_DECAY_PER_SEC = 14;

export const COHERENCE_TIER_THRESHOLDS = {
  x1: 0,
  x2: 25,
  x3: 55,
  HYPER: 85
} as const;

export const COHERENCE_GAINS = {
  wavedash: 14,
  wallBounce: 8,
  phaseShift: 10,
  tunnel: 12,
  particleCollect: 10,
  wormhole: 12,
  ghostSurf: 12,
  pauliBlast: 14
} as const;

export interface CoherenceSnapshot {
  /** Normalized coherence value in [0, 1] */
  value: number;
  /** Raw coherence value in [0, 100] */
  raw: number;
  tier: CoherenceTier;
  styleScore: number;
  coherentRun: boolean;
}

/**
 * Resolves the coherence tier from a raw coherence value (0..100):
 * - x1:    0  .. 24
 * - x2:    25 .. 54
 * - x3:    55 .. 84
 * - HYPER: 85 .. 100
 */
export function getCoherenceTier(raw: number): CoherenceTier {
  if (raw >= COHERENCE_TIER_THRESHOLDS.HYPER) return 'HYPER';
  if (raw >= COHERENCE_TIER_THRESHOLDS.x3) return 'x3';
  if (raw >= COHERENCE_TIER_THRESHOLDS.x2) return 'x2';
  return 'x1';
}

export function getTierMultiplier(tier: CoherenceTier): number {
  switch (tier) {
    case 'HYPER':
      return 4;
    case 'x3':
      return 3;
    case 'x2':
      return 2;
    default:
      return 1;
  }
}

/**
 * Quantum Coherence (Flow) System.
 * Rewards fluid chained movement without altering base physics determinism.
 */
export class CoherenceSystem {
  private raw = 0;
  private tier: CoherenceTier = 'x1';
  private styleScore = 0;
  private idleGroundedMs = 0;
  private lastEmittedRaw = 0;
  private lastEmittedTier: CoherenceTier = 'x1';
  private isAttached = false;
  private unsubEvents: Array<() => void> = [];

  public attach(): void {
    if (this.isAttached) return;
    this.isAttached = true;

    this.unsubEvents.push(
      gameEvents.on('hero:wavedash', () => {
        this.addCoherence(COHERENCE_GAINS.wavedash);
      }),
      gameEvents.on('hero:wall_bounce', () => {
        this.addCoherence(COHERENCE_GAINS.wallBounce);
      }),
      gameEvents.on('phase:shift', () => {
        this.addCoherence(COHERENCE_GAINS.phaseShift);
      }),
      gameEvents.on('tunnel:use', () => {
        this.addCoherence(COHERENCE_GAINS.tunnel);
      }),
      gameEvents.on('particle:collect', () => {
        this.addCoherence(COHERENCE_GAINS.particleCollect);
      }),
      gameEvents.on('tether:collect', () => {
        this.addCoherence(COHERENCE_GAINS.particleCollect);
      }),
      gameEvents.on('hero:wormhole', () => {
        this.addCoherence(COHERENCE_GAINS.wormhole);
      }),
      gameEvents.on('hero:ghost_surf', () => {
        this.addCoherence(COHERENCE_GAINS.ghostSurf);
      }),
      gameEvents.on('pauli:blast', () => {
        this.addCoherence(COHERENCE_GAINS.pauliBlast);
      }),
      gameEvents.on('hero:death', () => {
        this.handleDeath();
      })
    );
  }

  public detach(): void {
    for (const unsub of this.unsubEvents) {
      unsub();
    }
    this.unsubEvents = [];
    this.isAttached = false;
  }

  public addCoherence(amount: number): void {
    if (amount <= 0) return;

    this.raw = Math.min(COHERENCE_MAX, Math.max(0, this.raw + amount));
    this.idleGroundedMs = 0;
    this.tier = getCoherenceTier(this.raw);
    this.styleScore += Math.round(amount * getTierMultiplier(this.tier));

    this.emitChange(false);
  }

  public handleDeath(): void {
    const hadCoherence = this.raw > 0;
    this.raw = 0;
    this.tier = 'x1';
    this.idleGroundedMs = 0;
    this.emitChange(hadCoherence);
  }

  /**
   * Advances coherence decay timers.
   * Coherence continuously drains passively (-8 / s, or -14 / s in HYPER) so the player must
   * keep chaining stylish moves, and drains rapidly (-45 / s) when grounded and idle > 350 ms.
   */
  public update(deltaMs: number, vx: number, isGrounded: boolean): void {
    if (deltaMs <= 0) return;

    const passiveRate =
      this.tier === 'HYPER' ? COHERENCE_HYPER_DECAY_PER_SEC : COHERENCE_PASSIVE_DECAY_PER_SEC;
    let decayAmount = 0;

    if (isGrounded && Math.abs(vx) < COHERENCE_IDLE_VELOCITY_THRESHOLD) {
      const prevIdle = this.idleGroundedMs;
      this.idleGroundedMs += deltaMs;

      if (this.idleGroundedMs > COHERENCE_IDLE_THRESHOLD_MS && this.raw > 0) {
        const idleDecayMs =
          prevIdle >= COHERENCE_IDLE_THRESHOLD_MS
            ? deltaMs
            : this.idleGroundedMs - COHERENCE_IDLE_THRESHOLD_MS;
        const preIdleMs = Math.max(0, deltaMs - idleDecayMs);
        decayAmount =
          (preIdleMs / 1000) * passiveRate + (idleDecayMs / 1000) * COHERENCE_DECAY_PER_SEC;
      } else if (this.raw > 0) {
        decayAmount = (deltaMs / 1000) * passiveRate;
      }
    } else {
      this.idleGroundedMs = 0;
      if (this.raw > 0) {
        decayAmount = (deltaMs / 1000) * passiveRate;
      }
    }

    if (decayAmount > 0 && this.raw > 0) {
      this.raw = Math.max(0, this.raw - decayAmount);
      this.tier = getCoherenceTier(this.raw);

      if (
        Math.abs(this.raw - this.lastEmittedRaw) >= 1 ||
        this.tier !== this.lastEmittedTier ||
        (this.raw === 0 && this.lastEmittedRaw > 0)
      ) {
        this.emitChange(false);
      }
    }
  }

  public reset(emit = true): void {
    const changed = this.raw !== 0 || this.tier !== 'x1' || this.styleScore !== 0;
    this.raw = 0;
    this.tier = 'x1';
    this.styleScore = 0;
    this.idleGroundedMs = 0;

    if (emit && (changed || this.lastEmittedRaw !== 0 || this.lastEmittedTier !== 'x1')) {
      this.emitChange(false);
    } else {
      this.lastEmittedRaw = 0;
      this.lastEmittedTier = 'x1';
    }
  }

  public getRaw(): number {
    return this.raw;
  }

  public getValue(): number {
    return Math.min(1, Math.max(0, this.raw / COHERENCE_MAX));
  }

  public getTier(): CoherenceTier {
    return this.tier;
  }

  public getStyleScore(): number {
    return this.styleScore;
  }

  public isCoherentRun(): boolean {
    return this.tier === 'HYPER';
  }

  public getSnapshot(): CoherenceSnapshot {
    return {
      value: this.getValue(),
      raw: this.raw,
      tier: this.tier,
      styleScore: this.styleScore,
      coherentRun: this.isCoherentRun()
    };
  }

  private emitChange(decoherence: boolean): void {
    this.lastEmittedRaw = this.raw;
    this.lastEmittedTier = this.tier;
    gameEvents.emit('coherence:changed', {
      value: this.getValue(),
      tier: this.tier,
      raw: this.raw,
      styleScore: this.styleScore,
      ...(decoherence ? { decoherence: true } : {})
    });
  }
}

export default CoherenceSystem;
