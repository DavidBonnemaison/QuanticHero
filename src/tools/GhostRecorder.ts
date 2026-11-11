export type AnimState = 'idle' | 'left' | 'right' | 'jump';

export interface GhostFrame {
  timeMs: number;
  x: number;
  y: number;
  flipX: boolean;
  animState: AnimState;
  flipY?: boolean;
}

const ANIM_TO_CODE: Record<AnimState, string> = {
  idle: 'i',
  left: 'l',
  right: 'r',
  jump: 'j'
};

const CODE_TO_ANIM: Record<string, AnimState> = {
  i: 'idle',
  l: 'left',
  r: 'right',
  j: 'jump'
};

/**
 * Compresses an array of ghost frames into a compact delta-encoded string.
 * Target payload is well under 15 KB for typical level runs.
 */
export function compressTrajectory(frames: GhostFrame[]): string {
  if (!frames || frames.length === 0) return '';

  // Decimate if the run is unusually long to guarantee < 15 KB storage limit
  let processedFrames = frames;
  if (frames.length > 1200) {
    const step = Math.ceil(frames.length / 1000);
    processedFrames = frames.filter((_, idx) => idx === 0 || idx === frames.length - 1 || idx % step === 0);
  }

  const chunks: string[] = [];
  let prevTime = 0;
  let prevX = 0;
  let prevY = 0;

  for (let i = 0; i < processedFrames.length; i++) {
    const f = processedFrames[i];
    const roundedTime = Math.round(f.timeMs);
    const roundedX = Math.round(f.x);
    const roundedY = Math.round(f.y);

    const flags = (f.flipX ? 1 : 0) | (f.flipY ? 2 : 0);
    const animCode = ANIM_TO_CODE[f.animState] || 'i';

    if (i === 0) {
      chunks.push(`${roundedTime},${roundedX},${roundedY},${flags},${animCode}`);
    } else {
      const dt = roundedTime - prevTime;
      const dx = roundedX - prevX;
      const dy = roundedY - prevY;
      chunks.push(`${dt},${dx},${dy},${flags},${animCode}`);
    }

    prevTime = roundedTime;
    prevX = roundedX;
    prevY = roundedY;
  }

  return `v1|${chunks.join(';')}`;
}

/**
 * Decompresses a compact string or legacy JSON string back into GhostFrame array.
 */
export function decompressTrajectory(raw: string | null | undefined): GhostFrame[] {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    return [];
  }

  const trimmed = raw.trim();

  // Support legacy or direct JSON arrays
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          timeMs: Number(item.timeMs ?? 0),
          x: Number(item.x ?? 0),
          y: Number(item.y ?? 0),
          flipX: Boolean(item.flipX),
          animState: (CODE_TO_ANIM[item.animState] || item.animState || 'idle') as AnimState,
          ...(item.flipY !== undefined ? { flipY: Boolean(item.flipY) } : {})
        }));
      }
    } catch {
      return [];
    }
  }

  // Version 1 compact delta format
  if (trimmed.startsWith('v1|')) {
    try {
      const payload = trimmed.slice(3);
      if (!payload) return [];

      const parts = payload.split(';');
      const frames: GhostFrame[] = [];
      let currentX = 0;
      let currentY = 0;
      let currentTime = 0;

      for (let i = 0; i < parts.length; i++) {
        const item = parts[i];
        if (!item) continue;
        const tokens = item.split(',');
        if (tokens.length < 5) continue;

        const val0 = Number(tokens[0]);
        const val1 = Number(tokens[1]);
        const val2 = Number(tokens[2]);
        const flags = Number(tokens[3]);
        const animCode = tokens[4];

        if (i === 0) {
          currentTime = val0;
          currentX = val1;
          currentY = val2;
        } else {
          currentTime += val0;
          currentX += val1;
          currentY += val2;
        }

        const flipX = (flags & 1) === 1;
        const flipY = (flags & 2) === 2;
        const animState = CODE_TO_ANIM[animCode] || 'idle';

        frames.push({
          timeMs: currentTime,
          x: currentX,
          y: currentY,
          flipX,
          animState,
          ...(flipY ? { flipY: true } : {})
        });
      }

      return frames;
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Samples a trajectory at timeMs using linear interpolation (LERP) between surrounding frames.
 */
export function sampleTrajectory(frames: GhostFrame[], timeMs: number): GhostFrame | null {
  if (!frames || frames.length === 0) return null;
  if (frames.length === 1 || timeMs <= frames[0].timeMs) {
    return { ...frames[0] };
  }
  const lastIndex = frames.length - 1;
  if (timeMs >= frames[lastIndex].timeMs) {
    return { ...frames[lastIndex] };
  }

  // Binary search for the frame immediately preceding or matching timeMs
  let low = 0;
  let high = lastIndex;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (frames[mid].timeMs <= timeMs) {
      if (mid === lastIndex || frames[mid + 1].timeMs > timeMs) {
        low = mid;
        break;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const frameA = frames[low];
  const frameB = frames[Math.min(low + 1, lastIndex)];

  const span = frameB.timeMs - frameA.timeMs;
  const factor = span > 0 ? Math.max(0, Math.min(1, (timeMs - frameA.timeMs) / span)) : 0;

  return {
    timeMs,
    x: frameA.x + (frameB.x - frameA.x) * factor,
    y: frameA.y + (frameB.y - frameA.y) * factor,
    flipX: factor >= 0.5 ? frameB.flipX : frameA.flipX,
    animState: factor >= 0.5 ? frameB.animState : frameA.animState,
    ...(frameA.flipY !== undefined || frameB.flipY !== undefined
      ? { flipY: factor >= 0.5 ? frameB.flipY : frameA.flipY }
      : {})
  };
}

/**
 * Calculates live speedrun split delta in seconds between player and ghost.
 * Negative delta = player is faster / ahead of the ghost (e.g. -0.35s).
 * Positive delta = player is slower / behind the ghost (e.g. +0.52s).
 */
export function calculateSplitDelta(
  ghostFrames: GhostFrame[],
  playerX: number,
  playerY: number,
  currentTimeMs: number
): number | null {
  if (!ghostFrames || ghostFrames.length === 0) return null;

  let bestFrame = ghostFrames[0];
  let minCost = Number.POSITIVE_INFINITY;

  for (let i = 0; i < ghostFrames.length; i++) {
    const f = ghostFrames[i];
    const dx = f.x - playerX;
    const dy = f.y - playerY;
    const distSq = dx * dx + dy * dy;

    // Time penalty prevents matching distant trajectory loops/revisits
    const dtSeconds = (f.timeMs - currentTimeMs) / 1000;
    const timePenalty = Math.abs(dtSeconds) * 2;
    const cost = distSq + timePenalty * timePenalty;

    if (cost < minCost) {
      minCost = cost;
      bestFrame = f;
    }
  }

  const deltaMs = currentTimeMs - bestFrame.timeMs;
  return deltaMs / 1000;
}

export interface FormattedSplitDelta {
  text: string;
  color: string;
  isAhead: boolean;
}

/**
 * Formats a split delta into a user-facing string with color indicator:
 * Ahead: green with '-' prefix (e.g. -0.35s)
 * Behind: red with '+' prefix (e.g. +0.52s)
 * Sync/Neutral: grey with '±0.00s'
 */
export function formatSplitDelta(deltaSeconds: number | null): FormattedSplitDelta {
  if (deltaSeconds === null || !Number.isFinite(deltaSeconds)) {
    return { text: '--', color: '#94a3b8', isAhead: false };
  }

  if (Math.abs(deltaSeconds) < 0.05) {
    return { text: '±0.00s', color: '#94a3b8', isAhead: false };
  }

  const isAhead = deltaSeconds < 0;
  const sign = isAhead ? '-' : '+';
  const text = `${sign}${Math.abs(deltaSeconds).toFixed(2)}s`;
  const color = isAhead ? '#22c55e' : '#ef4444';

  return { text, color, isAhead };
}

/**
 * Recorder that captures player movements at ~15 Hz with negligible CPU overhead (< 0.1 ms/frame).
 */
export class GhostRecorder {
  private frames: GhostFrame[] = [];
  private lastSampleTime = -Infinity;
  private sampleIntervalMs: number;
  private lastState: {
    x: number;
    y: number;
    flipX: boolean;
    animState: AnimState;
    flipY?: boolean;
  } | null = null;

  constructor(sampleIntervalMs = 66) {
    this.sampleIntervalMs = sampleIntervalMs;
  }

  public reset(): void {
    this.frames = [];
    this.lastSampleTime = -Infinity;
    this.lastState = null;
  }

  public recordFrame(
    timeMs: number,
    x: number,
    y: number,
    flipX: boolean,
    animState: AnimState,
    flipY?: boolean,
    force = false
  ): boolean {
    const timeDelta = timeMs - this.lastSampleTime;
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    const hasStateChanged =
      !this.lastState ||
      this.lastState.animState !== animState ||
      this.lastState.flipX !== flipX ||
      this.lastState.flipY !== flipY;

    if (
      force ||
      this.frames.length === 0 ||
      timeDelta >= this.sampleIntervalMs ||
      (hasStateChanged && timeDelta >= 30)
    ) {
      const frame: GhostFrame = {
        timeMs: Math.round(timeMs),
        x: roundedX,
        y: roundedY,
        flipX,
        animState,
        ...(flipY !== undefined ? { flipY } : {})
      };
      this.frames.push(frame);
      this.lastSampleTime = timeMs;
      this.lastState = { x: roundedX, y: roundedY, flipX, animState, flipY };
      return true;
    }
    return false;
  }

  public getFrames(): GhostFrame[] {
    return this.frames;
  }

  public setFrames(frames: GhostFrame[]): void {
    this.frames = [...frames];
  }

  public getSerialized(): string {
    return compressTrajectory(this.frames);
  }
}
