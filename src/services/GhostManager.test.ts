import { describe, expect, it } from 'vitest';
import type { GhostFrame } from '../tools/GhostRecorder';
import {
  MAX_SWARM_ATTEMPTS,
  SessionSwarmBuffer,
  getSwarmSpectrumTint
} from './GhostManager';

const makeFrames = (endTimeMs: number, xOffset = 0): GhostFrame[] => [
  { timeMs: 0, x: 100 + xOffset, y: 400, flipX: false, animState: 'idle' },
  { timeMs: Math.round(endTimeMs / 2), x: 200 + xOffset, y: 350, flipX: false, animState: 'jump' },
  { timeMs: endTimeMs, x: 300 + xOffset, y: 400, flipX: false, animState: 'right' }
];

describe('GhostManager: SessionSwarmBuffer', () => {
  it('stores failed attempts and winning attempt together', () => {
    const buffer = new SessionSwarmBuffer();

    buffer.addAttempt(makeFrames(1000, 1), false);
    buffer.addAttempt(makeFrames(1500, 2), false);
    buffer.addAttempt(makeFrames(1200, 3), false);
    buffer.addAttempt(makeFrames(2000, 4), true);

    expect(buffer.size).toBe(4);
    const attempts = buffer.getAttempts();
    expect(attempts.filter((a) => !a.isVictory)).toHaveLength(3);
    expect(attempts.filter((a) => a.isVictory)).toHaveLength(1);
    expect(attempts[3].isVictory).toBe(true);
    expect(buffer.getMaxDurationMs()).toBe(2000);
  });

  it('caps the buffer at 25 trajectories using FIFO eviction', () => {
    const buffer = new SessionSwarmBuffer();

    for (let i = 1; i <= 32; i++) {
      buffer.addAttempt(makeFrames(1000 + i * 10, i), i === 32);
    }

    expect(buffer.size).toBe(MAX_SWARM_ATTEMPTS);
    expect(buffer.size).toBe(25);

    const attempts = buffer.getAttempts();
    // Oldest 7 (1..7) should be evicted; first remaining is #8 (x = 108)
    expect(attempts[0].frames[0].x).toBe(108);
    expect(attempts[24].frames[0].x).toBe(132);
    expect(attempts[24].isVictory).toBe(true);
  });

  it('ignores empty frame arrays and supports clear()', () => {
    const buffer = new SessionSwarmBuffer();
    buffer.addAttempt([], false);
    expect(buffer.size).toBe(0);

    buffer.addAttempt(makeFrames(800), false);
    expect(buffer.size).toBe(1);

    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.getMaxDurationMs()).toBe(0);
  });

  it('defensively copies frames so external mutations do not corrupt stored attempts', () => {
    const buffer = new SessionSwarmBuffer();
    const frames = makeFrames(1000);
    buffer.addAttempt(frames, false);

    frames[0].x = 9999;
    expect(buffer.getFramesList()[0][0].x).toBe(100);
  });

  it('computes spectral tint colors for swarm ghosts', () => {
    const victoryTint = getSwarmSpectrumTint('#e63946', 0, 5, true);
    expect(victoryTint).toBe(0x38bdf8);

    const failTint0 = getSwarmSpectrumTint('#e63946', 0, 5, false);
    const failTint4 = getSwarmSpectrumTint('#e63946', 4, 5, false);
    expect(typeof failTint0).toBe('number');
    expect(failTint0).not.toBe(failTint4);
  });
});
