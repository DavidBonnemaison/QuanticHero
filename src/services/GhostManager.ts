import type { GhostFrame } from '../tools/GhostRecorder';

export const MAX_SWARM_ATTEMPTS = 25;

export interface SwarmAttempt {
  frames: GhostFrame[];
  isVictory: boolean;
  durationMs: number;
}

/**
 * Buffers up to the last 25 session attempts (failed runs + winning run)
 * for a level so they can be replayed simultaneously as a quantum swarm.
 */
export class SessionSwarmBuffer {
  private attempts: SwarmAttempt[] = [];
  private readonly maxAttempts: number;

  constructor(maxAttempts = MAX_SWARM_ATTEMPTS) {
    this.maxAttempts = maxAttempts;
  }

  public addAttempt(frames: GhostFrame[], isVictory = false): void {
    if (!frames || frames.length === 0) return;

    const copied = frames.map((f) => ({ ...f }));
    const durationMs = copied[copied.length - 1].timeMs;

    this.attempts.push({
      frames: copied,
      isVictory,
      durationMs
    });

    while (this.attempts.length > this.maxAttempts) {
      this.attempts.shift();
    }
  }

  public getAttempts(): SwarmAttempt[] {
    return this.attempts;
  }

  public getFramesList(): GhostFrame[][] {
    return this.attempts.map((a) => a.frames);
  }

  public getMaxDurationMs(): number {
    let max = 0;
    for (const attempt of this.attempts) {
      if (attempt.durationMs > max) {
        max = attempt.durationMs;
      }
    }
    return max;
  }

  public get size(): number {
    return this.attempts.length;
  }

  public clear(): void {
    this.attempts = [];
  }
}

/**
 * Computes a tint color along the atom's emission spectrum for each ghost in the swarm.
 */
export function getSwarmSpectrumTint(
  baseHex: string,
  index: number,
  total: number,
  isVictory: boolean
): number {
  if (isVictory) {
    return 0x38bdf8;
  }

  const cleaned = (baseHex || '#00e5ff').replace('#', '');
  const parsed = Number.parseInt(cleaned, 16);
  const baseColor = Number.isNaN(parsed) ? 0x00e5ff : parsed;

  const baseR = (baseColor >> 16) & 0xff;
  const baseG = (baseColor >> 8) & 0xff;
  const baseB = baseColor & 0xff;

  const t = total > 1 ? index / (total - 1) : 0.5;
  // Blend between base atom color and complementary spectral shift
  const shiftR = Math.round(baseR * (0.65 + 0.35 * Math.sin(t * Math.PI)));
  const shiftG = Math.round(baseG * (0.65 + 0.35 * Math.cos(t * Math.PI * 0.5)));
  const shiftB = Math.min(255, Math.round(baseB * (0.65 + 0.35 * t) + 40));

  return (shiftR << 16) | (shiftG << 8) | shiftB;
}
