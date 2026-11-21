import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCK_DURATION_MS,
  collapseSuperposition,
  computeObserverBeamAngleDeg,
  computeQuantumNoiseOffset,
  computeSuperpositionProbability,
  createSuperpositionState,
  determineCollapsedState,
  getSuperposedRectForState,
  isPointInObserverCone,
  isRectIntersectingObserverCone,
  isSuperposedObjectAtPoint,
  isSuperposedObjectInCone,
  tickSuperpositionLock
} from './wavefunctionCollapse';

describe('wavefunctionCollapse pure mechanics', () => {
  it('never calls Math.random() across probability, collapse, beam, and noise computations', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    try {
      const config = { altX: 400, altY: 200, periodMs: 2400, lockDurationMs: 3000 };
      for (let t = 0; t <= 4800; t += 150) {
        const p = computeSuperpositionProbability(t, config.periodMs);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
        const state = createSuperpositionState();
        collapseSuperposition(state, t, config, 'player');
        computeObserverBeamAngleDeg(
          { x: 400, y: 60, sweepAngleDeg: 120, speedDegPerSec: 40, range: 500 },
          t
        );
        computeQuantumNoiseOffset(t, t);
      }
      expect(randomSpy).not.toHaveBeenCalled();
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('computes smooth deterministic probability p(t) in [0, 1] with exact phase landmarks', () => {
    const period = 2000;
    expect(computeSuperpositionProbability(0, period)).toBeCloseTo(1, 5);
    expect(computeSuperpositionProbability(500, period)).toBeCloseTo(0.5, 5);
    expect(computeSuperpositionProbability(1000, period)).toBeCloseTo(0, 5);
    expect(computeSuperpositionProbability(1500, period)).toBeCloseTo(0.5, 5);
    expect(computeSuperpositionProbability(2000, period)).toBeCloseTo(1, 5);
  });

  it('determines collapsed state deterministically at the p >= 0.5 threshold', () => {
    expect(determineCollapsedState(1)).toBe('A');
    expect(determineCollapsedState(0.5001)).toBe('A');
    expect(determineCollapsedState(0.5)).toBe('A');
    expect(determineCollapsedState(0.4999)).toBe('B');
    expect(determineCollapsedState(0)).toBe('B');
  });

  it('collapses to A when p(t) >= 0.5, to B when p(t) < 0.5, and reverts after lockDurationMs', () => {
    const config = { altX: 300, altY: 200, periodMs: 2000, lockDurationMs: 3000 };

    // At t = 200ms, p > 0.5 => state A
    const initA = createSuperpositionState(config.lockDurationMs);
    const colA = collapseSuperposition(initA, 200, config, 'player');
    expect(colA.changed).toBe(true);
    expect(colA.collapsedTo).toBe('A');
    expect(colA.state.collapsedState).toBe('A');
    expect(colA.state.lockRemainingMs).toBe(3000);

    // Re-observing while locked refreshes timer without flipping state (Quantum Zeno)
    const tickMid = tickSuperpositionLock(colA.state, 1500);
    expect(tickMid.released).toBe(false);
    expect(tickMid.state.lockRemainingMs).toBe(1500);

    const reObs = collapseSuperposition(tickMid.state, 1000, config, 'beam');
    expect(reObs.changed).toBe(false);
    expect(reObs.collapsedTo).toBe('A');
    expect(reObs.state.lockRemainingMs).toBe(3000);

    // Tick down to expiration
    const tickEnd = tickSuperpositionLock(reObs.state, 3000);
    expect(tickEnd.released).toBe(true);
    expect(tickEnd.state.collapsedState).toBeNull();
    expect(tickEnd.state.lockRemainingMs).toBe(0);

    // Now at t = 1000ms (p = 0 < 0.5), collapse yields state B
    const colB = collapseSuperposition(tickEnd.state, 1000, config, 'pointer');
    expect(colB.changed).toBe(true);
    expect(colB.collapsedTo).toBe('B');
    expect(colB.state.collapsedState).toBe('B');
  });

  it('uses DEFAULT_LOCK_DURATION_MS (3000ms) when lockDurationMs is omitted', () => {
    const state = createSuperpositionState();
    expect(state.lockDurationMs).toBe(DEFAULT_LOCK_DURATION_MS);
    const res = collapseSuperposition(state, 0, { altX: 10, altY: 20, periodMs: 2000 });
    expect(res.state.lockRemainingMs).toBe(3000);
  });

  it('returns exact bounds for states A and B', () => {
    const base = { x: 100, y: 500, width: 160, height: 24 };
    const config = { altX: 100, altY: 320, periodMs: 2400 };
    expect(getSuperposedRectForState(base, config, 'A')).toEqual(base);
    expect(getSuperposedRectForState(base, config, 'B')).toEqual({
      x: 100,
      y: 320,
      width: 160,
      height: 24
    });
  });

  it('sweeps ObserverBeam angles deterministically back and forth and supports 360 continuous sweep', () => {
    const beam = { x: 500, y: 60, sweepAngleDeg: 120, speedDegPerSec: 40, range: 500 };
    // Starts at 90 - 60 = 30 deg
    expect(computeObserverBeamAngleDeg(beam, 0)).toBeCloseTo(30, 5);
    // After 1.5s at 40 deg/s => 90 deg (straight down)
    expect(computeObserverBeamAngleDeg(beam, 1500)).toBeCloseTo(90, 5);
    // After 3.0s => 150 deg (rightmost edge of sweep)
    expect(computeObserverBeamAngleDeg(beam, 3000)).toBeCloseTo(150, 5);
    // After 4.5s => returns to 90 deg
    expect(computeObserverBeamAngleDeg(beam, 4500)).toBeCloseTo(90, 5);
    // After 6.0s => back to 30 deg
    expect(computeObserverBeamAngleDeg(beam, 6000)).toBeCloseTo(30, 5);

    const fullRot = { x: 500, y: 300, sweepAngleDeg: 360, speedDegPerSec: 90, range: 400 };
    expect(computeObserverBeamAngleDeg(fullRot, 1000, 0)).toBeCloseTo(90, 5);
    expect(computeObserverBeamAngleDeg(fullRot, 4000, 0)).toBeCloseTo(0, 5);
  });

  it('accurately detects points and rectangles inside active/passive observer cones', () => {
    const cone = { originX: 100, originY: 300, angleDeg: 0, halfAngleDeg: 35, range: 300 };

    expect(isPointInObserverCone(250, 300, cone)).toBe(true);
    expect(isPointInObserverCone(250, 340, cone)).toBe(true);
    expect(isPointInObserverCone(50, 300, cone)).toBe(false); // behind hero
    expect(isPointInObserverCone(450, 300, cone)).toBe(false); // out of range

    const rectInFront = { x: 240, y: 280, width: 100, height: 24 };
    const rectBehind = { x: 0, y: 280, width: 60, height: 24 };
    expect(isRectIntersectingObserverCone(rectInFront, cone)).toBe(true);
    expect(isRectIntersectingObserverCone(rectBehind, cone)).toBe(false);

    // Superposed object intersection checks both A and B states
    const base = { x: 0, y: 280, width: 60, height: 24 };
    const config = { altX: 250, altY: 290, periodMs: 2400 };
    expect(isSuperposedObjectInCone(base, config, cone)).toBe(true);
    expect(isSuperposedObjectAtPoint(base, config, 270, 300)).toBe(true);
    expect(isSuperposedObjectAtPoint(base, config, 700, 500)).toBe(false);
  });
});
