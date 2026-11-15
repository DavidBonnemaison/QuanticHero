import { PHYSICS } from '../physics/constants';
import type { Platform } from '../types';

export interface ReachableOptions {
  toleranceAlpha?: number;
  velocityMultiplier?: number;
  gravity?: number;
  jumpV0?: number;
  heroSpeedX?: number;
}

export type TransitionType = 'standard_jump' | 'drop_down' | 'overlap' | 'unreachable';

export interface ReachabilityDetails {
  reachable: boolean;
  deltaY: number;
  deltaYMax: number;
  horizontalGap: number;
  maxReach: number;
  tLand: number | null;
  transitionType: TransitionType;
}

/**
 * Calculates time to reach apex (vertical speed = 0).
 * With standard g=700 and v0=-450, t_apex = 450 / 700 ≈ 0.642857 s.
 */
export function t_apex(g: number = PHYSICS.GRAVITY_Y, v0: number = PHYSICS.HERO_JUMP_V0): number {
  return -v0 / g;
}

/**
 * Calculates maximum jump height in pixels (measured upwards from jump start).
 * delta_y_max = v0^2 / (2 * g) ≈ 450^2 / (2 * 700) ≈ 144.642857 px.
 */
export function delta_y_max(
  g: number = PHYSICS.GRAVITY_Y,
  v0: number = PHYSICS.HERO_JUMP_V0
): number {
  return (v0 * v0) / (2 * g);
}

/**
 * Calculates landing time on a platform with vertical altitude difference deltaY (y_target - y_start).
 * In screen coordinates:
 * - deltaY < 0: target platform is HIGHER than start
 * - deltaY > 0: target platform is LOWER than start
 * - deltaY == 0: target platform is at equal elevation
 *
 * Solves: 0.5 * g * t^2 + v0 * t - deltaY = 0
 * Returns null if the target elevation is above apex (discriminant < 0).
 */
export function t_land(
  deltaY: number,
  g: number = PHYSICS.GRAVITY_Y,
  v0: number = PHYSICS.HERO_JUMP_V0
): number | null {
  const discriminant = v0 * v0 + 2 * g * deltaY;
  if (discriminant < 0) {
    return null;
  }
  return (-v0 + Math.sqrt(discriminant)) / g;
}

/**
 * Calculates horizontal reach envelope distance for a given deltaY and tolerance factor alpha.
 * x_reach = alpha * vx * t_land(deltaY)
 */
export function x_reach(
  deltaY: number,
  toleranceAlpha = 0.85,
  vx: number = PHYSICS.HERO_SPEED_X,
  g: number = PHYSICS.GRAVITY_Y,
  v0: number = PHYSICS.HERO_JUMP_V0
): number {
  const landTime = t_land(deltaY, g, v0);
  if (landTime === null || landTime <= 0) {
    return 0;
  }
  return toleranceAlpha * vx * landTime;
}

/**
 * Returns minimal horizontal gap between two platform rectangles.
 * Returns 0 if they overlap horizontally.
 */
export function getHorizontalGap(a: Platform, b: Platform): number {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;

  if (b.x > aRight) {
    return b.x - aRight;
  }
  if (a.x > bRight) {
    return a.x - bRight;
  }
  return 0;
}

/**
 * Returns full reachability analysis from platform A to platform B.
 */
export function getReachabilityDetails(
  platformA: Platform,
  platformB: Platform,
  options: ReachableOptions = {}
): ReachabilityDetails {
  const g = options.gravity ?? PHYSICS.GRAVITY_Y;
  const v0 = options.jumpV0 ?? PHYSICS.HERO_JUMP_V0;
  const mult = options.velocityMultiplier ?? 1;
  const vx = (options.heroSpeedX ?? PHYSICS.HERO_SPEED_X) * mult;
  const alpha = options.toleranceAlpha ?? 0.85;

  const deltaY = platformB.y - platformA.y;
  const maxApex = delta_y_max(g, v0);
  const gap = getHorizontalGap(platformA, platformB);
  const landTime = t_land(deltaY, g, v0);

  if (landTime === null || -deltaY > maxApex) {
    return {
      reachable: false,
      deltaY,
      deltaYMax: maxApex,
      horizontalGap: gap,
      maxReach: 0,
      tLand: null,
      transitionType: 'unreachable'
    };
  }

  const reach = alpha * vx * landTime;
  const reachable = gap <= reach;

  let transitionType: TransitionType = 'unreachable';
  if (reachable) {
    if (gap === 0) {
      transitionType = 'overlap';
    } else if (deltaY > 0 && gap <= alpha * vx * Math.sqrt((2 * deltaY) / g)) {
      transitionType = 'drop_down';
    } else {
      transitionType = 'standard_jump';
    }
  }

  return {
    reachable,
    deltaY,
    deltaYMax: maxApex,
    horizontalGap: gap,
    maxReach: reach,
    tLand: landTime,
    transitionType
  };
}

/**
 * Checks whether platform B can be reached from platform A within kinematic constraints and tolerance factor.
 */
export function isReachable(
  platformA: Platform,
  platformB: Platform,
  options: ReachableOptions = {}
): boolean {
  return getReachabilityDetails(platformA, platformB, options).reachable;
}
