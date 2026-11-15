import { type GhostFrame, decompressTrajectory } from '../tools/GhostRecorder';
import type { IsotopeMedal, LevelData, ScoreItem } from '../types';

export const TOTAL_PERIODIC_ELEMENTS = 118;

export const MEDAL_RANK: Record<IsotopeMedal, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3
};

export interface LevelPar {
  parTimeMs: number | null;
  parJumps: number | null;
}

export interface CalculateMedalParams {
  timeMs: number;
  jumpCount: number;
  level?: Partial<LevelData>;
  parTimeMs?: number | null;
  parJumps?: number | null;
}

export interface MedalDisplayInfo {
  medal: IsotopeMedal;
  label: string;
  shortLabel: string;
  symbol: string;
  color: string;
}

/**
 * Counts the number of distinct jumps in a recorded ghost trajectory
 * by detecting rising edges into the 'jump' animation state.
 */
export function countJumpsInTrajectory(frames: GhostFrame[]): number {
  if (!frames || frames.length === 0) return 0;

  let jumps = 0;
  let wasJumping = false;

  for (const frame of frames) {
    const isJumping = frame.animState === 'jump';
    if (isJumping && !wasJumping) {
      jumps += 1;
    }
    wasJumping = isJumping;
  }

  return jumps;
}

/**
 * Extracts parTimeMs and parJumps from a level's explicit par fields
 * or falls back to authorTime / authorGhost.
 */
export function getLevelPar(level?: Partial<LevelData>): LevelPar {
  if (!level) {
    return { parTimeMs: null, parJumps: null };
  }

  const rawTime = level.parTimeMs ?? level.authorTime;
  const parTimeMs = typeof rawTime === 'number' && rawTime > 0 ? rawTime : null;

  let parJumps: number | null = null;
  if (typeof level.parJumps === 'number' && level.parJumps >= 0) {
    parJumps = level.parJumps;
  } else if (level.authorGhost) {
    const frames = decompressTrajectory(level.authorGhost);
    if (frames.length > 0) {
      parJumps = countJumpsInTrajectory(frames);
    }
  }

  return { parTimeMs, parJumps };
}

/**
 * Computes the Isotope Medal tier for a completed run:
 * - none: level not completed (timeMs <= 0)
 * - bronze (Isotope Stable): level completed
 * - silver (Isotope Pur): time <= 1.25 * parTimeMs OR jumpCount <= parJumps + 1
 * - gold (Isotope Quantique): time <= parTimeMs AND jumpCount <= parJumps
 */
export function calculateIsotopeMedal(params: CalculateMedalParams): IsotopeMedal {
  const { timeMs, jumpCount, level } = params;

  if (!Number.isFinite(timeMs) || timeMs <= 0) {
    return 'none';
  }

  const derived = getLevelPar(level);
  const parTimeMs = params.parTimeMs !== undefined ? params.parTimeMs : derived.parTimeMs;
  const parJumps = params.parJumps !== undefined ? params.parJumps : derived.parJumps;

  const hasTimePar = typeof parTimeMs === 'number' && parTimeMs > 0;
  const hasJumpPar = typeof parJumps === 'number' && parJumps >= 0;

  const timeGold = hasTimePar && timeMs <= parTimeMs;
  const timeSilver = hasTimePar && timeMs <= parTimeMs * 1.25;
  const jumpsGold = hasJumpPar ? jumpCount <= parJumps : true;
  const jumpsSilver = hasJumpPar && jumpCount <= parJumps + 1;

  if (timeGold && jumpsGold) {
    return 'gold';
  }

  if (timeSilver || jumpsSilver) {
    return 'silver';
  }

  return 'bronze';
}

/**
 * Returns the higher of two isotope medals (medals never downgrade).
 */
export function bestMedal(a?: IsotopeMedal, b?: IsotopeMedal): IsotopeMedal {
  const medalA = a ?? 'none';
  const medalB = b ?? 'none';
  return MEDAL_RANK[medalA] >= MEDAL_RANK[medalB] ? medalA : medalB;
}

/**
 * Counts how many unique levels have earned a Gold Isotope medal (out of 118).
 */
export function countGoldMedals(scores: Record<number, ScoreItem>): number {
  let count = 0;
  for (const [idStr, item] of Object.entries(scores)) {
    const id = Number(idStr);
    if (id > 0 && item?.medal === 'gold') {
      count += 1;
    }
  }
  return Math.min(count, TOTAL_PERIODIC_ELEMENTS);
}

/**
 * Returns UI display metadata for an Isotope Medal tier.
 */
export function getMedalDisplayInfo(medal?: IsotopeMedal): MedalDisplayInfo {
  switch (medal) {
    case 'gold':
      return {
        medal: 'gold',
        label: 'Isotope Quantique (Or)',
        shortLabel: 'OR',
        symbol: '★',
        color: '#fbbf24'
      };
    case 'silver':
      return {
        medal: 'silver',
        label: 'Isotope Pur (Argent)',
        shortLabel: 'ARGENT',
        symbol: '◆',
        color: '#e2e8f0'
      };
    case 'bronze':
      return {
        medal: 'bronze',
        label: 'Isotope Stable (Bronze)',
        shortLabel: 'BRONZE',
        symbol: '●',
        color: '#d97706'
      };
    default:
      return {
        medal: 'none',
        label: 'Non synthétisé',
        shortLabel: '--',
        symbol: '',
        color: '#64748b'
      };
  }
}
