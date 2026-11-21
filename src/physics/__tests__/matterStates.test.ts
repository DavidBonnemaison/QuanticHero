import { describe, expect, it } from 'vitest';
import { updateDecayPlatform } from '../../mechanics/quantumMechanics';
import { PHYSICS } from '../constants';
import {
  buildBroglieScaffoldSegments,
  canGhostSurf,
  computeWormholeExit,
  createQuantumPinningState,
  findNearestPinnablePlatform,
  findPinnablePlatformAtPoint,
  getGhostSurfVelocity,
  getLiquidEmergeVelocity,
  getPlasmaBounceVelocity,
  isHeroInWormholeInlet,
  shouldPlungeIntoLiquid,
  stepGasUpdraft,
  stepLiquidBuoyancy,
  stepQuantumPinning
} from '../matterStates';
import { stepHeroControl } from '../stepHeroPhysics';

describe('Spec-09: Matter States, Quantum Pinning, Wormholes, Broglie & Ghost Surfing', () => {
  describe('4 Matter States (liquid, gas, cryo, plasma)', () => {
    it('liquid: floats at surface for normal arrival, plunges on dive or vy > 520', () => {
      expect(shouldPlungeIntoLiquid(200, 1, false, false)).toBe(false);
      expect(shouldPlungeIntoLiquid(520, 1, false, false)).toBe(false);
      expect(shouldPlungeIntoLiquid(521, 1, false, false)).toBe(true);
      expect(shouldPlungeIntoLiquid(100, 1, true, false)).toBe(true);
      expect(shouldPlungeIntoLiquid(100, 1, false, true)).toBe(true);
      // Inverted gravity
      expect(shouldPlungeIntoLiquid(-530, -1, false, false)).toBe(true);
    });

    it('liquid: applies Archimedes buoyancy (vy -= 1650 * dt) and dolphin emerge (vy = -520)', () => {
      const vyAfter = stepLiquidBuoyancy(400, 1, 0.1);
      expect(vyAfter).toBeCloseTo(235, 5);

      const vyInverted = stepLiquidBuoyancy(-400, -1, 0.1);
      expect(vyInverted).toBeCloseTo(-235, 5);

      expect(getLiquidEmergeVelocity(1)).toBe(-520);
      expect(getLiquidEmergeVelocity(-1)).toBe(520);
    });

    it('gas: applies smooth updraft clamped to [-340, 200]', () => {
      // Starting at vy = 100, dt = 0.1 -> 100 - 110 = -10
      expect(stepGasUpdraft(100, 0.1, 1)).toBeCloseTo(-10, 5);
      // Upper clamp at 200 when falling very fast
      expect(stepGasUpdraft(500, 0.05, 1)).toBe(200);
      // Lower clamp at -340 when rising
      expect(stepGasUpdraft(-300, 0.1, 1)).toBe(-340);
    });

    it('cryo: conserves 100% of horizontal sliding velocity (groundDrag = 1.0)', () => {
      const res = stepHeroControl(
        {
          vx: PHYSICS.WALL_RECOIL_VX,
          vy: 0,
          touchingGround: true,
          recoilTimer: 0,
          recoilVx: 0,
          velocityMultiplier: 1,
          upsideDown: 1,
          flipX: false,
          animState: 'right',
          onCryo: true
        },
        { left: false, right: false, jump: false },
        PHYSICS.DELTA_FIXED_MS
      );
      expect(res.vx).toBe(PHYSICS.WALL_RECOIL_VX);

      // Compare with normal solid ground where vx drops to 0
      const solidRes = stepHeroControl(
        {
          vx: PHYSICS.WALL_RECOIL_VX,
          vy: 0,
          touchingGround: true,
          recoilTimer: 0,
          recoilVx: 0,
          velocityMultiplier: 1,
          upsideDown: 1,
          flipX: false,
          animState: 'right',
          onCryo: false
        },
        { left: false, right: false, jump: false },
        PHYSICS.DELTA_FIXED_MS
      );
      expect(solidRes.vx).toBe(0);
    });

    it('plasma: elastic trampoline bounce returns vy = -640 * upsideDown', () => {
      expect(getPlasmaBounceVelocity(1)).toBe(-640);
      expect(getPlasmaBounceVelocity(-1)).toBe(640);
    });
  });

  describe('Quantum Pinning (Zeno Effect)', () => {
    it('finds nearest pinnable platform within 180 px and ignores further ones', () => {
      const plats = [
        { id: 'p1', x: 300, y: 200, width: 80, height: 20 },
        { id: 'p2', x: 500, y: 200, width: 80, height: 20 }
      ];
      // Hero at (180, 200): distance to p1 left edge (260) is 80 px <= 180
      const nearest = findNearestPinnablePlatform(180, 200, plats, 180);
      expect(nearest?.id).toBe('p1');

      // Hero at (0, 200): distance to p1 left edge (260) is 260 px > 180
      expect(findNearestPinnablePlatform(0, 200, plats, 180)).toBeNull();
    });

    it('finds pinnable platform under pointer coordinates', () => {
      const plats = [{ id: 'p1', x: 300, y: 200, width: 80, height: 20 }];
      expect(findPinnablePlatformAtPoint(310, 205, plats)?.id).toBe('p1');
      expect(findPinnablePlatformAtPoint(500, 500, plats)).toBeNull();
    });

    it('enforces max 3.5s pin duration followed by 1.5s thermal cooldown', () => {
      let state = createQuantumPinningState();
      state = stepQuantumPinning(state, 'p1', 2000);
      expect(state.pinnedPlatformId).toBe('p1');
      expect(state.pinElapsedMs).toBe(2000);
      expect(state.cooldownRemainingMs).toBe(0);

      // Exceeding 3500 ms triggers thermal overload & 1500 ms cooldown
      state = stepQuantumPinning(state, 'p1', 1500);
      expect(state.pinnedPlatformId).toBeNull();
      expect(state.cooldownRemainingMs).toBe(1500);

      // Cannot pin during cooldown
      state = stepQuantumPinning(state, 'p1', 1000);
      expect(state.pinnedPlatformId).toBeNull();
      expect(state.cooldownRemainingMs).toBe(500);

      // Cooldown finishes
      state = stepQuantumPinning(state, 'p1', 500);
      expect(state.cooldownRemainingMs).toBe(0);

      // Can pin again after cooldown
      state = stepQuantumPinning(state, 'p1', 100);
      expect(state.pinnedPlatformId).toBe('p1');
    });

    it('freezes decayMs platform countdown when decayPaused is true', () => {
      const decayState = {
        timerMs: 300,
        decayMs: 1000,
        triggered: true,
        collapsed: false,
        decayPaused: true
      };
      const res = updateDecayPlatform(decayState, 500, 1.0);
      expect(decayState.timerMs).toBe(300);
      expect(res.collapsed).toBe(false);
      expect(res.solid).toBe(true);
      expect(res.shaking).toBe(false);
    });
  });

  describe('Momentum-Conserving Wormholes', () => {
    it('reorients (vx=0, vy=650) into outNormalAngleDeg=0 as (vx=650, vy=0)', () => {
      const exit = computeWormholeExit(0, 650, {
        outX: 800,
        outY: 300,
        outNormalAngleDeg: 0
      });
      expect(exit.x).toBe(800);
      expect(exit.y).toBe(300);
      expect(exit.vx).toBe(650);
      expect(exit.vy).toBe(0);
      expect(exit.speed).toBe(650);
    });

    it('enforces minimum exit speed of 250 px/s and supports arbitrary exit angles', () => {
      const exit = computeWormholeExit(10, 0, {
        outX: 400,
        outY: 200,
        outNormalAngleDeg: -90
      });
      expect(exit.speed).toBe(250);
      expect(exit.vx).toBe(0);
      expect(exit.vy).toBe(-250);
    });

    it('detects hero inside wormhole inlet radius', () => {
      const wh = { inX: 200, inY: 300 };
      expect(isHeroInWormholeInlet(210, 305, wh)).toBe(true);
      expect(isHeroInWormholeInlet(260, 300, wh)).toBe(false);
    });
  });

  describe('Broglie Wave-Trail Solidification & Ghost Surfing', () => {
    it('crystallizes up to the last 8 Broglie trail points into solid segments', () => {
      const points = Array.from({ length: 12 }, (_, i) => ({ x: i * 15, y: 300 - i * 5 }));
      const segments = buildBroglieScaffoldSegments(points, 20);
      expect(segments).toHaveLength(8);
      expect(segments[0].x).toBe(4 * 15);
      expect(segments[7].x).toBe(11 * 15);
      expect(segments[7].y).toBe(300 - 11 * 5 + 20);
    });

    it('triggers temporal Ghost Surfing bounce (vy = -520 * upsideDown) once per jump', () => {
      const ghost = { x: 400, y: 300, visible: true, active: true };

      // Descending hero within hitbox -> triggers
      expect(
        canGhostSurf({ x: 410, y: 290, vy: 220, upsideDown: 1, hasSurfedThisJump: false }, ghost)
      ).toBe(true);

      // Ascending hero -> does not trigger
      expect(
        canGhostSurf({ x: 410, y: 290, vy: -220, upsideDown: 1, hasSurfedThisJump: false }, ghost)
      ).toBe(false);

      // Already surfed this jump -> does not trigger
      expect(
        canGhostSurf({ x: 410, y: 290, vy: 220, upsideDown: 1, hasSurfedThisJump: true }, ghost)
      ).toBe(false);

      // Ghost hidden -> does not trigger
      expect(
        canGhostSurf(
          { x: 410, y: 290, vy: 220, upsideDown: 1, hasSurfedThisJump: false },
          { ...ghost, visible: false }
        )
      ).toBe(false);

      expect(getGhostSurfVelocity(1)).toBe(-520);
      expect(getGhostSurfVelocity(-1)).toBe(520);
    });
  });
});
