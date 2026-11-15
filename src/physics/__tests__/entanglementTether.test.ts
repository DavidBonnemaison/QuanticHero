import { describe, expect, it } from 'vitest';
import { PHYSICS } from '../constants';
import {
  applyToroidalScreenWrap,
  canFuseClones,
  computeFissionVelocities,
  distToSegment,
  findHookedTetherPylon,
  getScreenWrapAxes,
  getScreenWrapGhostPositions,
  isParticleSweptByTether,
  resolveTetherPylonConstraint,
  shouldBreakCrackedPlatform
} from '../entanglementTether';
import { stepHeroControl } from '../stepHeroPhysics';

describe('Spec-08: Entanglement Tether, Clone Fusion/Fission & Toroidal Screen-Wrap', () => {
  describe('1. Physical Entanglement Tether (Lasso & Pylon Pivot)', () => {
    it('computes exact point-to-segment distance', () => {
      expect(distToSegment({ x: 150, y: 200 }, { x: 100, y: 200 }, { x: 300, y: 200 })).toBe(0);
      expect(distToSegment({ x: 150, y: 215 }, { x: 100, y: 200 }, { x: 300, y: 200 })).toBe(15);
      // Beyond endpoint
      expect(distToSegment({ x: 330, y: 240 }, { x: 100, y: 200 }, { x: 300, y: 200 })).toBeCloseTo(
        50,
        5
      );
      // Degenerate zero-length segment
      expect(distToSegment({ x: 103, y: 204 }, { x: 100, y: 200 }, { x: 100, y: 200 })).toBe(5);
    });

    it('sweeps a particle placed within 22 px of the [Alpha, Beta] segment', () => {
      const alpha = { x: 100, y: 300 };
      const beta = { x: 400, y: 300 };

      expect(isParticleSweptByTether({ x: 250, y: 300 }, alpha, beta)).toBe(true);
      expect(isParticleSweptByTether({ x: 250, y: 321 }, alpha, beta)).toBe(true);
      expect(isParticleSweptByTether({ x: 250, y: 322 }, alpha, beta)).toBe(false);
      expect(isParticleSweptByTether({ x: 250, y: 350 }, alpha, beta)).toBe(false);
    });

    it('hooks onto a magnetic tether pylon and constrains Beta to maxLength pendulum arc', () => {
      const pylons = [{ x: 250, y: 200, radius: 18, maxLength: 250 }];
      const alpha = { x: 150, y: 200 }; // dist(alpha, pylon) = 100
      const betaHook = { x: 350, y: 200 };

      const hooked = findHookedTetherPylon(alpha, betaHook, pylons);
      expect(hooked).toEqual(pylons[0]);

      // Beta stretches to (250, 400) => dist(pylon, beta) = 200, total = 300 > 250
      const constraint = resolveTetherPylonConstraint(
        alpha,
        { x: 250, y: 400 },
        { x: 40, y: 120 },
        pylons[0]
      );
      expect(constraint.constrained).toBe(true);
      // Allowed beta dist = 250 - 100 = 150 -> beta.y = 200 + 150 = 350
      expect(constraint.betaPos.x).toBeCloseTo(250, 5);
      expect(constraint.betaPos.y).toBeCloseTo(350, 5);
      // Outward radial velocity (+120 on Y) is removed, tangential (+40 on X) is preserved
      expect(constraint.betaVel.x).toBeCloseTo(40, 5);
      expect(constraint.betaVel.y).toBeCloseTo(0, 5);
    });
  });

  describe('2. Constructive Interference: Clone Fusion, Cracked Platforms & In-Flight Fission', () => {
    it('allows fusion only when distance < 28 px, grace >= 500 ms, and not entangled/pauli', () => {
      const a = { x: 200, y: 400, createdAtMs: 0 };
      const b = { x: 220, y: 400, createdAtMs: 100 };

      // Too soon (< 500 ms since b was created)
      expect(canFuseClones(a, b, 550)).toBe(false);
      // After 500 ms grace
      expect(canFuseClones(a, b, 600)).toBe(true);
      // Too far (>= 28 px)
      expect(canFuseClones(a, { x: 228, y: 400, createdAtMs: 100 }, 600)).toBe(false);
      // Disabled when entangled, Pauli active, or allowCloneFusion === false
      expect(canFuseClones(a, b, 600, { isEntangled: true })).toBe(false);
      expect(canFuseClones(a, b, 600, { isPauliActive: true })).toBe(false);
      expect(canFuseClones(a, b, 600, { allowCloneFusion: false })).toBe(false);
    });

    it('amplifies Super-Quanta jump impulse by 1.32x', () => {
      const res = stepHeroControl(
        {
          vx: 0,
          vy: 0,
          touchingGround: true,
          recoilTimer: 0,
          recoilVx: 0,
          velocityMultiplier: 1,
          upsideDown: 1,
          flipX: false,
          animState: 'idle',
          jumpMultiplier: PHYSICS.SUPER_QUANTA_JUMP_MULT
        },
        { left: false, right: false, jump: true }
      );
      expect(res.jumped).toBe(true);
      expect(res.vy).toBeCloseTo(PHYSICS.HERO_JUMP_V0 * 1.32, 5);
    });

    it('breaks cracked platforms only when fusionStack >= 2 on landing or diving', () => {
      expect(shouldBreakCrackedPlatform(1, true, false)).toBe(false);
      expect(shouldBreakCrackedPlatform(1, false, true)).toBe(false);
      expect(shouldBreakCrackedPlatform(2, true, false)).toBe(true);
      expect(shouldBreakCrackedPlatform(2, false, true)).toBe(true);
      expect(shouldBreakCrackedPlatform(2, false, false)).toBe(false);
    });

    it('computes two-stage rocket fission velocities (-480 upper, +300 lower)', () => {
      const normal = computeFissionVelocities(1);
      expect(normal.upperVy).toBe(-480);
      expect(normal.lowerVy).toBe(300);

      const inverted = computeFissionVelocities(-1);
      expect(inverted.upperVy).toBe(480);
      expect(inverted.lowerVy).toBe(-300);
    });
  });

  describe('3. Non-Euclidean Toroidal Screen-Wrap', () => {
    it('normalizes screenWrap axes cleanly', () => {
      expect(getScreenWrapAxes(undefined)).toEqual({ horizontal: false, vertical: false });
      expect(getScreenWrapAxes(true)).toEqual({ horizontal: true, vertical: false });
      expect(getScreenWrapAxes('horizontal')).toEqual({ horizontal: true, vertical: false });
      expect(getScreenWrapAxes('vertical')).toEqual({ horizontal: false, vertical: true });
      expect(getScreenWrapAxes('both')).toEqual({ horizontal: true, vertical: true });
    });

    it('teleports hero across x=0 and x=width in horizontal mode', () => {
      const leftWrap = applyToroidalScreenWrap({ x: -5, y: 300 }, 800, 600, 'horizontal');
      expect(leftWrap).toEqual({ x: 795, y: 300, wrappedX: true, wrappedY: false });

      const rightWrap = applyToroidalScreenWrap({ x: 804, y: 300 }, 800, 600, 'horizontal');
      expect(rightWrap).toEqual({ x: 4, y: 300, wrappedX: true, wrappedY: false });
    });

    it('teleports hero across both axes in both mode', () => {
      const wrap = applyToroidalScreenWrap({ x: -10, y: 612 }, 800, 600, 'both');
      expect(wrap).toEqual({ x: 790, y: 12, wrappedX: true, wrappedY: true });
    });

    it('projects opposite-edge spectral ghost within 32 px of wrapped border', () => {
      const nearLeft = getScreenWrapGhostPositions({ x: 18, y: 250 }, 800, 600, 'horizontal');
      expect(nearLeft).toEqual([{ x: 818, y: 250 }]);

      const nearRight = getScreenWrapGhostPositions({ x: 785, y: 250 }, 800, 600, 'horizontal');
      expect(nearRight).toEqual([{ x: -15, y: 250 }]);

      const middle = getScreenWrapGhostPositions({ x: 400, y: 250 }, 800, 600, 'horizontal');
      expect(middle).toEqual([]);
    });
  });
});
