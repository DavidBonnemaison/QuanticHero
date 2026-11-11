import { describe, expect, it } from 'vitest';
import {
  type GhostFrame,
  GhostRecorder,
  calculateSplitDelta,
  compressTrajectory,
  decompressTrajectory,
  formatSplitDelta,
  sampleTrajectory
} from './GhostRecorder';

describe('GhostRecorder', () => {
  it('samples initial frame and subsequent frames at ~15 Hz', () => {
    const recorder = new GhostRecorder(66);
    expect(recorder.getFrames()).toHaveLength(0);

    // Initial frame always recorded
    const r1 = recorder.recordFrame(0, 100, 200, false, 'idle');
    expect(r1).toBe(true);
    expect(recorder.getFrames()).toHaveLength(1);

    // Immediate frame skipped (within 66 ms without state change)
    const r2 = recorder.recordFrame(20, 105, 200, false, 'idle');
    expect(r2).toBe(false);
    expect(recorder.getFrames()).toHaveLength(1);

    // Frame after 70 ms recorded
    const r3 = recorder.recordFrame(70, 120, 200, false, 'idle');
    expect(r3).toBe(true);
    expect(recorder.getFrames()).toHaveLength(2);

    // State change recorded after >= 30ms
    const r4 = recorder.recordFrame(105, 130, 190, true, 'jump');
    expect(r4).toBe(true);
    expect(recorder.getFrames()).toHaveLength(3);
  });

  it('force recording saves frame regardless of elapsed interval', () => {
    const recorder = new GhostRecorder(66);
    recorder.recordFrame(0, 50, 50, false, 'idle');
    const rForced = recorder.recordFrame(10, 55, 50, false, 'idle', false, true);

    expect(rForced).toBe(true);
    expect(recorder.getFrames()).toHaveLength(2);
  });

  it('resets recorded frames on reset()', () => {
    const recorder = new GhostRecorder();
    recorder.recordFrame(0, 10, 10, false, 'idle');
    expect(recorder.getFrames().length).toBeGreaterThan(0);

    recorder.reset();
    expect(recorder.getFrames()).toHaveLength(0);
  });

  describe('compressTrajectory & decompressTrajectory', () => {
    it('round-trips empty and single-frame trajectories', () => {
      expect(compressTrajectory([])).toBe('');
      expect(decompressTrajectory('')).toEqual([]);
      expect(decompressTrajectory(null)).toEqual([]);
      expect(decompressTrajectory(undefined)).toEqual([]);

      const single: GhostFrame[] = [{ timeMs: 0, x: 150, y: 300, flipX: true, animState: 'jump' }];
      const compressed = compressTrajectory(single);
      const decompressed = decompressTrajectory(compressed);

      expect(decompressed).toEqual(single);
    });

    it('round-trips complex multi-frame trajectories accurately with delta compression', () => {
      const original: GhostFrame[] = [
        { timeMs: 0, x: 100, y: 200, flipX: false, animState: 'idle' },
        { timeMs: 66, x: 125, y: 195, flipX: false, animState: 'right' },
        { timeMs: 133, x: 150, y: 190, flipX: false, animState: 'right' },
        { timeMs: 200, x: 175, y: 160, flipX: false, animState: 'jump', flipY: true },
        { timeMs: 266, x: 190, y: 180, flipX: true, animState: 'left' }
      ];

      const compressed = compressTrajectory(original);
      expect(compressed.startsWith('v1|')).toBe(true);

      const decompressed = decompressTrajectory(compressed);
      expect(decompressed).toEqual(original);
    });

    it('supports legacy JSON serialized format in decompressTrajectory', () => {
      const jsonFrames = [
        { timeMs: 0, x: 50, y: 100, flipX: false, animState: 'idle' },
        { timeMs: 70, x: 80, y: 100, flipX: false, animState: 'right' }
      ];
      const rawJson = JSON.stringify(jsonFrames);

      const parsed = decompressTrajectory(rawJson);
      expect(parsed).toEqual(jsonFrames);
    });

    it('safely handles malformed strings without throwing', () => {
      expect(decompressTrajectory('invalid-garbage-format')).toEqual([]);
      expect(decompressTrajectory('v1|corrupt;items,only')).toEqual([]);
      expect(decompressTrajectory('{"not": "an array"}')).toEqual([]);
    });

    it('guarantees compressed size remains well under 15 KB even for 2000 frames (decimation)', () => {
      const longRun: GhostFrame[] = [];
      for (let i = 0; i < 2000; i++) {
        longRun.push({
          timeMs: i * 66,
          x: 100 + i * 5,
          y: 200 + (i % 20),
          flipX: i % 4 === 0,
          animState: i % 10 === 0 ? 'jump' : 'right'
        });
      }

      const compressed = compressTrajectory(longRun);
      const byteSize = new TextEncoder().encode(compressed).length;

      // Acceptance criterion 2: < 15 KB (15360 bytes)
      expect(byteSize).toBeLessThan(15360);
      expect(byteSize).toBeLessThan(14000);

      const decompressed = decompressTrajectory(compressed);
      expect(decompressed.length).toBeGreaterThan(500);
      expect(decompressed[0].timeMs).toBe(0);
      expect(decompressed[decompressed.length - 1].timeMs).toBe(longRun[longRun.length - 1].timeMs);
    });
  });

  describe('sampleTrajectory (LERP)', () => {
    const frames: GhostFrame[] = [
      { timeMs: 0, x: 100, y: 200, flipX: false, animState: 'idle' },
      { timeMs: 100, x: 200, y: 300, flipX: true, animState: 'right' },
      { timeMs: 200, x: 400, y: 300, flipX: true, animState: 'jump' }
    ];

    it('returns null for empty frames', () => {
      expect(sampleTrajectory([], 50)).toBeNull();
    });

    it('clamps to first frame when time <= start', () => {
      const sample = sampleTrajectory(frames, -50);
      expect(sample).toEqual(frames[0]);
    });

    it('clamps to last frame when time >= end', () => {
      const sample = sampleTrajectory(frames, 300);
      expect(sample).toEqual(frames[2]);
    });

    it('linearly interpolates coordinates midway between two frames', () => {
      // At t = 50ms, midway between frame 0 (x=100, y=200) and frame 1 (x=200, y=300)
      const sample = sampleTrajectory(frames, 50);
      expect(sample).not.toBeNull();
      expect(sample?.x).toBe(150);
      expect(sample?.y).toBe(250);
      expect(sample?.timeMs).toBe(50);
      // factor = 0.5 picks frame 1 discrete values
      expect(sample?.flipX).toBe(true);
      expect(sample?.animState).toBe('right');
    });

    it('smoothly interpolates at intermediate factors', () => {
      // At t = 25ms (factor = 0.25)
      const sample = sampleTrajectory(frames, 25);
      expect(sample?.x).toBe(125);
      expect(sample?.y).toBe(225);
      // factor < 0.5 picks frame 0 discrete values
      expect(sample?.flipX).toBe(false);
      expect(sample?.animState).toBe('idle');
    });
  });

  describe('calculateSplitDelta', () => {
    const ghostFrames: GhostFrame[] = [
      { timeMs: 0, x: 100, y: 200, flipX: false, animState: 'idle' },
      { timeMs: 1000, x: 300, y: 200, flipX: false, animState: 'right' },
      { timeMs: 2000, x: 600, y: 200, flipX: false, animState: 'right' },
      { timeMs: 3000, x: 900, y: 200, flipX: false, animState: 'jump' }
    ];

    it('returns null if ghostFrames is empty', () => {
      expect(calculateSplitDelta([], 100, 200, 500)).toBeNull();
    });

    it('returns negative delta when player is ahead of ghost', () => {
      // Ghost was at x=300 at t=1000ms. Player reaches x=300 at t=650ms (350ms faster).
      const delta = calculateSplitDelta(ghostFrames, 300, 200, 650);
      expect(delta).not.toBeNull();
      // delta in seconds = (650 - 1000) / 1000 = -0.35s
      expect(delta).toBeCloseTo(-0.35, 2);
    });

    it('returns positive delta when player is behind ghost', () => {
      // Ghost was at x=600 at t=2000ms. Player reaches x=600 at t=2520ms (520ms slower).
      const delta = calculateSplitDelta(ghostFrames, 600, 200, 2520);
      expect(delta).not.toBeNull();
      // delta in seconds = (2520 - 2000) / 1000 = +0.52s
      expect(delta).toBeCloseTo(0.52, 2);
    });

    it('returns zero or near-zero delta when synchronized', () => {
      const delta = calculateSplitDelta(ghostFrames, 300, 200, 1000);
      expect(delta).not.toBeNull();
      expect(delta).toBeCloseTo(0, 2);
    });
  });

  describe('formatSplitDelta', () => {
    it('formats ahead time with green color and "-" prefix', () => {
      const result = formatSplitDelta(-0.35);
      expect(result.text).toBe('-0.35s');
      expect(result.color).toBe('#22c55e');
      expect(result.isAhead).toBe(true);
    });

    it('formats behind time with red color and "+" prefix', () => {
      const result = formatSplitDelta(0.52);
      expect(result.text).toBe('+0.52s');
      expect(result.color).toBe('#ef4444');
      expect(result.isAhead).toBe(false);
    });

    it('formats close to zero delta with neutral color', () => {
      const result = formatSplitDelta(0.01);
      expect(result.text).toBe('±0.00s');
      expect(result.color).toBe('#94a3b8');
      expect(result.isAhead).toBe(false);
    });

    it('handles null and invalid values safely', () => {
      expect(formatSplitDelta(null)).toEqual({ text: '--', color: '#94a3b8', isAhead: false });
      expect(formatSplitDelta(Number.NaN)).toEqual({
        text: '--',
        color: '#94a3b8',
        isAhead: false
      });
    });
  });
});
