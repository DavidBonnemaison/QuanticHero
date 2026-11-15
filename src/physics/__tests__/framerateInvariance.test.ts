import { describe, expect, it } from 'vitest';
import { PHYSICS } from '../constants';
import { applyFramerateIndependentDrag, stepHeroControl } from '../stepHeroPhysics';

const FREQUENCIES = [30, 60, 120, 240] as const;

/**
 * Simulates wall recoil for `durationMs` at a given refresh rate `hz`
 * using exact trapezoidal/average velocity integration or discrete steps.
 */
function simulateWallRecoil(hz: number, durationMs = 220) {
  const stepMs = 1000 / hz;
  let elapsed = 0;
  let x = 100;
  let y = 300;
  let vx = 0;
  let vy: number = PHYSICS.WALL_RECOIL_VY;
  let recoilTimer: number = PHYSICS.WALL_RECOIL_TIMER_MS;
  let recoilVx: number = PHYSICS.WALL_RECOIL_VX;

  while (elapsed < durationMs - 1e-6) {
    const dtMs = Math.min(stepMs, durationMs - elapsed);
    const dt = dtMs / 1000;
    const prevVx = recoilVx;
    const prevVy = vy;

    const res = stepHeroControl(
      {
        vx,
        vy,
        touchingGround: false,
        recoilTimer,
        recoilVx,
        velocityMultiplier: 1,
        upsideDown: 1,
        flipX: false,
        animState: 'jump',
        isActive: true
      },
      { left: false, right: false, jump: false },
      dtMs
    );

    recoilTimer = res.recoilTimer;
    recoilVx = res.recoilVx;
    vx = res.vx;
    vy = prevVy + PHYSICS.GRAVITY_Y * dt;

    // Average velocity over the sub-step isolates damping invariance from Euler step-size error
    x += ((prevVx + recoilVx) / 2) * dt;
    y += ((prevVy + vy) / 2) * dt;

    elapsed += dtMs;
  }

  return { x, y, vx, recoilVx };
}

function simulateAirDrift(hz: number, durationMs = 500) {
  const stepMs = 1000 / hz;
  let elapsed = 0;
  let x = 200;
  let y = 200;
  let vx: number = PHYSICS.HERO_SPEED_X;
  let vy: number = PHYSICS.HERO_JUMP_V0;

  while (elapsed < durationMs - 1e-6) {
    const dtMs = Math.min(stepMs, durationMs - elapsed);
    const dt = dtMs / 1000;
    const prevVx = vx;
    const prevVy = vy;

    const res = stepHeroControl(
      {
        vx,
        vy,
        touchingGround: false,
        recoilTimer: 0,
        recoilVx: 0,
        velocityMultiplier: 1,
        upsideDown: 1,
        flipX: false,
        animState: 'jump',
        isActive: true
      },
      { left: false, right: false, jump: false },
      dtMs
    );

    vx = res.vx;
    vy = prevVy + PHYSICS.GRAVITY_Y * dt;

    x += ((prevVx + vx) / 2) * dt;
    y += ((prevVy + vy) / 2) * dt;

    elapsed += dtMs;
  }

  return { x, y, vx, vy };
}

describe('Spec-02 Framerate Invariance (30 Hz, 60 Hz, 120 Hz, 240 Hz)', () => {
  it('keeps wall recoil damping velocity identical across 30/60/120/240 Hz', () => {
    const v60 = Array.from({ length: 12 }).reduce<number>(
      (v) => applyFramerateIndependentDrag(v, PHYSICS.WALL_RECOIL_DRAG_X, 1000 / 60),
      PHYSICS.WALL_RECOIL_VX
    );
    const v120 = Array.from({ length: 24 }).reduce<number>(
      (v) => applyFramerateIndependentDrag(v, PHYSICS.WALL_RECOIL_DRAG_X, 1000 / 120),
      PHYSICS.WALL_RECOIL_VX
    );
    const v240 = Array.from({ length: 48 }).reduce<number>(
      (v) => applyFramerateIndependentDrag(v, PHYSICS.WALL_RECOIL_DRAG_X, 1000 / 240),
      PHYSICS.WALL_RECOIL_VX
    );
    const v30 = Array.from({ length: 6 }).reduce<number>(
      (v) => applyFramerateIndependentDrag(v, PHYSICS.WALL_RECOIL_DRAG_X, 1000 / 30),
      PHYSICS.WALL_RECOIL_VX
    );

    expect(Math.abs(v30 - v60)).toBeLessThan(1e-9);
    expect(Math.abs(v120 - v60)).toBeLessThan(1e-9);
    expect(Math.abs(v240 - v60)).toBeLessThan(1e-9);
  });

  it('keeps final (x, y) within < 0.5 px across 30/60/120/240 Hz during 220 ms wall recoil', () => {
    const results = FREQUENCIES.map((hz) => ({ hz, ...simulateWallRecoil(hz, 220) }));
    const ref = results.find((r) => r.hz === 60)!;

    for (const res of results) {
      expect(Math.abs(res.x - ref.x)).toBeLessThan(0.5);
      expect(Math.abs(res.y - ref.y)).toBeLessThan(0.5);
      expect(Math.abs(res.recoilVx - ref.recoilVx)).toBeLessThan(0.01);
    }
  });

  it('keeps final (x, y) within < 0.5 px across 30/60/120/240 Hz during 500 ms air drift', () => {
    const results = FREQUENCIES.map((hz) => ({ hz, ...simulateAirDrift(hz, 500) }));
    const ref = results.find((r) => r.hz === 60)!;

    for (const res of results) {
      expect(Math.abs(res.x - ref.x)).toBeLessThan(0.5);
      expect(Math.abs(res.y - ref.y)).toBeLessThan(0.5);
      expect(Math.abs(res.vx - ref.vx)).toBeLessThan(0.01);
    }
  });
});
