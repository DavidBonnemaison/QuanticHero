import { describe, expect, it } from 'vitest';
import {
  delta_y_max,
  getHorizontalGap,
  getReachabilityDetails,
  isReachable,
  t_apex,
  t_land,
  x_reach
} from '../src/generator/kinematics';
import { PHYSICS } from '../src/physics/constants';
import type { Platform } from '../src/types';

describe('Ballistic Kinematics Engine', () => {
  it('correctly calculates time to apex (t_apex)', () => {
    const apexTime = t_apex(PHYSICS.GRAVITY_Y, PHYSICS.HERO_JUMP_V0);
    // t_apex = -(-450) / 700 = 450 / 700 ≈ 0.642857 s
    expect(apexTime).toBeCloseTo(0.642857, 4);
  });

  it('correctly calculates maximum upward jump height (delta_y_max)', () => {
    const maxY = delta_y_max(PHYSICS.GRAVITY_Y, PHYSICS.HERO_JUMP_V0);
    // delta_y_max = 450^2 / (2 * 700) = 202500 / 1400 ≈ 144.642857 px
    expect(maxY).toBeCloseTo(144.642857, 4);
  });

  it('correctly calculates landing time on equal elevation (deltaY = 0)', () => {
    const landTime = t_land(0, PHYSICS.GRAVITY_Y, PHYSICS.HERO_JUMP_V0);
    expect(landTime).not.toBeNull();
    // Equal elevation landing time is 2 * t_apex ≈ 1.285714 s
    expect(landTime ?? 0).toBeCloseTo(2 * t_apex(), 4);
  });

  it('correctly calculates landing time at the very apex of the jump', () => {
    const maxApex = delta_y_max();
    const landTime = t_land(-maxApex);
    expect(landTime).not.toBeNull();
    expect(landTime ?? 0).toBeCloseTo(t_apex(), 4);
  });

  it('returns null when target altitude exceeds apex (unreachable height)', () => {
    const maxApex = delta_y_max();
    const landTime = t_land(-(maxApex + 10));
    expect(landTime).toBeNull();
  });

  it('calculates longer landing time for lower platforms (deltaY > 0)', () => {
    const t0 = t_land(0) ?? 0;
    const tDown = t_land(200) ?? 0;
    expect(tDown).toBeGreaterThan(t0);
  });

  it('calculates horizontal reach envelope with tolerance factor alpha', () => {
    const reachAlpha85 = x_reach(0, 0.85);
    const reachAlpha70 = x_reach(0, 0.7);

    const theoreticalMax = PHYSICS.HERO_SPEED_X * (t_land(0) ?? 0); // ~450 px
    expect(theoreticalMax).toBeCloseTo(450.0, 1);

    expect(reachAlpha85).toBeCloseTo(0.85 * theoreticalMax, 2);
    expect(reachAlpha70).toBeCloseTo(0.7 * theoreticalMax, 2);
    expect(reachAlpha85).toBeGreaterThan(reachAlpha70);
  });

  it('returns 0 reach for platforms higher than delta_y_max', () => {
    const unreachableY = -200;
    expect(x_reach(unreachableY)).toBe(0);
  });

  it('calculates horizontal gaps between platforms correctly', () => {
    const platA: Platform = { x: 100, y: 500, width: 200, height: 20 };
    const platRight: Platform = { x: 350, y: 500, width: 100, height: 20 };
    const platLeft: Platform = { x: 20, y: 500, width: 50, height: 20 };
    const platOverlap: Platform = { x: 250, y: 500, width: 100, height: 20 };

    expect(getHorizontalGap(platA, platRight)).toBe(50); // 350 - (100 + 200) = 50
    expect(getHorizontalGap(platA, platLeft)).toBe(30); // 100 - (20 + 50) = 30
    expect(getHorizontalGap(platA, platOverlap)).toBe(0);
  });

  it('evaluates reachability between platforms with isReachable', () => {
    const start: Platform = { x: 100, y: 800, width: 200, height: 20 };

    // Platform within range (gap = 80 px, climb = 50 px)
    const reachablePlat: Platform = { x: 380, y: 750, width: 150, height: 20 };
    expect(isReachable(start, reachablePlat, { toleranceAlpha: 0.8 })).toBe(true);

    // Platform too far horizontally (gap = 450 px)
    const tooFarPlat: Platform = { x: 750, y: 800, width: 150, height: 20 };
    expect(isReachable(start, tooFarPlat, { toleranceAlpha: 0.8 })).toBe(false);

    // Platform too high vertically (climb = 160 px > 144.64 px apex)
    const tooHighPlat: Platform = { x: 320, y: 640, width: 150, height: 20 };
    expect(isReachable(start, tooHighPlat)).toBe(false);
  });

  it('provides comprehensive reachability analysis details', () => {
    const a: Platform = { x: 100, y: 600, width: 200, height: 20 };
    const b: Platform = { x: 350, y: 550, width: 150, height: 20 };

    const details = getReachabilityDetails(a, b, { toleranceAlpha: 0.85 });
    expect(details.reachable).toBe(true);
    expect(details.deltaY).toBe(-50);
    expect(details.deltaYMax).toBeCloseTo(144.64, 1);
    expect(details.horizontalGap).toBe(50);
    expect(details.maxReach).toBeGreaterThan(50);
    expect(details.transitionType).toBe('standard_jump');
  });
});
