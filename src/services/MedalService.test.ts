import { describe, expect, it } from 'vitest';
import { type GhostFrame, compressTrajectory } from '../tools/GhostRecorder';
import type { LevelData, ScoreItem } from '../types';
import {
  TOTAL_PERIODIC_ELEMENTS,
  bestMedal,
  calculateIsotopeMedal,
  countGoldMedals,
  countJumpsInTrajectory,
  getLevelPar
} from './MedalService';

const makeJumpTrajectory = (jumpCount: number): string => {
  const frames: GhostFrame[] = [{ timeMs: 0, x: 100, y: 400, flipX: false, animState: 'idle' }];
  let t = 100;
  for (let i = 0; i < jumpCount; i++) {
    frames.push({ timeMs: t, x: 120 + i * 50, y: 380, flipX: false, animState: 'jump' });
    frames.push({ timeMs: t + 50, x: 130 + i * 50, y: 360, flipX: false, animState: 'jump' });
    frames.push({ timeMs: t + 100, x: 140 + i * 50, y: 400, flipX: false, animState: 'right' });
    t += 200;
  }
  return compressTrajectory(frames);
};

describe('MedalService', () => {
  it('counts rising-edge jumps in a ghost trajectory', () => {
    const frames: GhostFrame[] = [
      { timeMs: 0, x: 0, y: 0, flipX: false, animState: 'idle' },
      { timeMs: 100, x: 10, y: -10, flipX: false, animState: 'jump' },
      { timeMs: 200, x: 20, y: -20, flipX: false, animState: 'jump' },
      { timeMs: 300, x: 30, y: 0, flipX: false, animState: 'right' },
      { timeMs: 400, x: 40, y: -10, flipX: false, animState: 'jump' },
      { timeMs: 500, x: 50, y: 0, flipX: false, animState: 'idle' }
    ];

    expect(countJumpsInTrajectory(frames)).toBe(2);
    expect(countJumpsInTrajectory([])).toBe(0);
  });

  it('extracts parTimeMs and parJumps from explicit fields or authorTime/authorGhost', () => {
    const explicit = getLevelPar({
      parTimeMs: 8000,
      parJumps: 4,
      authorTime: 10000,
      authorGhost: makeJumpTrajectory(7)
    });
    expect(explicit).toEqual({ parTimeMs: 8000, parJumps: 4 });

    const fromAuthor = getLevelPar({
      authorTime: 10000,
      authorGhost: makeJumpTrajectory(3)
    });
    expect(fromAuthor).toEqual({ parTimeMs: 10000, parJumps: 3 });

    const empty = getLevelPar({});
    expect(empty).toEqual({ parTimeMs: null, parJumps: null });
  });

  it('calculates Gold, Silver, Bronze, and None isotope medals accurately', () => {
    const level: Partial<LevelData> = {
      authorTime: 10000,
      authorGhost: makeJumpTrajectory(4)
    };

    // Not completed
    expect(calculateIsotopeMedal({ timeMs: 0, jumpCount: 0, level })).toBe('none');

    // Gold: time <= authorTime (10000) AND jumpCount <= parJumps (4)
    expect(calculateIsotopeMedal({ timeMs: 10000, jumpCount: 4, level })).toBe('gold');
    expect(calculateIsotopeMedal({ timeMs: 8500, jumpCount: 3, level })).toBe('gold');

    // Silver by time (<= 1.25 * 10000 = 12500), even with extra jumps
    expect(calculateIsotopeMedal({ timeMs: 12000, jumpCount: 8, level })).toBe('silver');

    // Silver by jump economy (<= parJumps + 1 = 5), even when slower than 1.25x
    expect(calculateIsotopeMedal({ timeMs: 18000, jumpCount: 5, level })).toBe('silver');

    // Fast time but too many jumps -> cannot be Gold, falls back to Silver (since time <= 1.25x)
    expect(calculateIsotopeMedal({ timeMs: 9000, jumpCount: 7, level })).toBe('silver');

    // Bronze: completed, but slower than 1.25 * authorTime AND > parJumps + 1
    expect(calculateIsotopeMedal({ timeMs: 15000, jumpCount: 6, level })).toBe('bronze');
  });

  it('never downgrades an already-earned medal via bestMedal()', () => {
    expect(bestMedal('gold', 'bronze')).toBe('gold');
    expect(bestMedal('silver', 'gold')).toBe('gold');
    expect(bestMedal('bronze', 'silver')).toBe('silver');
    expect(bestMedal(undefined, 'bronze')).toBe('bronze');
  });

  it('counts total Gold Isotopes across levels out of 118', () => {
    const scores: Record<number, ScoreItem> = {
      0: { best: 5000, last: 5000, medal: 'gold' }, // shared slot 0 excluded
      1: { best: 8000, last: 8000, medal: 'gold' },
      2: { best: 9000, last: 9000, medal: 'silver' },
      3: { best: 10000, last: 10000, medal: 'gold' },
      4: { best: 12000, last: 12000, medal: 'bronze' }
    };

    expect(TOTAL_PERIODIC_ELEMENTS).toBe(118);
    expect(countGoldMedals(scores)).toBe(2);
  });
});
