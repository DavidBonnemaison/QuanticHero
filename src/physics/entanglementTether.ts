import type { LevelData, TetherPylon } from '../types';
import { PHYSICS } from './constants';

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Computes the minimum Euclidean distance from point `p` to line segment `[a, b]`.
 */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-9) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Returns true if a particle lies within `threshold` px (default 22 px) of segment `[alpha, beta]`.
 */
export function isParticleSweptByTether(
  particle: Vec2,
  alpha: Vec2,
  beta: Vec2,
  threshold = PHYSICS.TETHER_SWEEP_RADIUS
): boolean {
  return distToSegment(particle, alpha, beta) < threshold;
}

/**
 * Returns the first magnetic tether pylon intersected by segment `[alpha, beta]`, or null.
 */
export function findHookedTetherPylon(
  alpha: Vec2,
  beta: Vec2,
  pylons: TetherPylon[]
): TetherPylon | null {
  for (const pylon of pylons) {
    if (distToSegment(pylon, alpha, beta) <= pylon.radius) {
      return pylon;
    }
  }
  return null;
}

export interface TetherConstraintResult {
  constrained: boolean;
  betaPos: Vec2;
  betaVel: Vec2;
  totalLength: number;
}

/**
 * Enforces the pulley/pendulum tether constraint when hooked around a magnetic pylon.
 * If `dist(alpha, pylon) + dist(pylon, beta) > maxLength`, Beta is clamped to the arc
 * of radius `maxLength - dist(alpha, pylon)` around the pylon and outward radial velocity is removed.
 */
export function resolveTetherPylonConstraint(
  alpha: Vec2,
  beta: Vec2,
  betaVel: Vec2,
  pylon: TetherPylon,
  maxLength = pylon.maxLength ?? PHYSICS.TETHER_DEFAULT_MAX_LENGTH
): TetherConstraintResult {
  const dAlpha = Math.hypot(alpha.x - pylon.x, alpha.y - pylon.y);
  const rx = beta.x - pylon.x;
  const ry = beta.y - pylon.y;
  const dBeta = Math.hypot(rx, ry);
  const totalLength = dAlpha + dBeta;

  if (totalLength <= maxLength || dBeta <= 1e-6) {
    return {
      constrained: false,
      betaPos: { x: beta.x, y: beta.y },
      betaVel: { x: betaVel.x, y: betaVel.y },
      totalLength
    };
  }

  const allowedBetaDist = Math.max(pylon.radius, maxLength - dAlpha);
  if (dBeta <= allowedBetaDist) {
    return {
      constrained: false,
      betaPos: { x: beta.x, y: beta.y },
      betaVel: { x: betaVel.x, y: betaVel.y },
      totalLength
    };
  }

  const nx = rx / dBeta;
  const ny = ry / dBeta;
  const clampedX = pylon.x + nx * allowedBetaDist;
  const clampedY = pylon.y + ny * allowedBetaDist;

  // Project out outward radial velocity to produce clean pendulum swing
  const radialDot = betaVel.x * nx + betaVel.y * ny;
  let nextVx = betaVel.x;
  let nextVy = betaVel.y;
  if (radialDot > 0) {
    nextVx -= radialDot * nx;
    nextVy -= radialDot * ny;
  }

  return {
    constrained: true,
    betaPos: { x: clampedX, y: clampedY },
    betaVel: { x: nextVx, y: nextVy },
    totalLength: dAlpha + allowedBetaDist
  };
}

export interface FusionCandidate {
  x: number;
  y: number;
  createdAtMs: number;
  active?: boolean;
}

/**
 * Checks whether two superposition clones can constructively interfere (fuse) into Super-Quanta.
 */
export function canFuseClones(
  heroA: FusionCandidate,
  heroB: FusionCandidate,
  nowMs: number,
  options: {
    isEntangled?: boolean;
    isPauliActive?: boolean;
    allowCloneFusion?: boolean;
    maxDistance?: number;
    graceMs?: number;
  } = {}
): boolean {
  if (options.isEntangled || options.isPauliActive) return false;
  if (options.allowCloneFusion === false) return false;
  if (heroA.active === false || heroB.active === false) return false;

  const graceMs = options.graceMs ?? PHYSICS.CLONE_FUSION_GRACE_MS;
  if (nowMs - heroA.createdAtMs < graceMs || nowMs - heroB.createdAtMs < graceMs) {
    return false;
  }

  const maxDist = options.maxDistance ?? PHYSICS.CLONE_FUSION_DISTANCE;
  const dist = Math.hypot(heroB.x - heroA.x, heroB.y - heroA.y);
  return dist < maxDist;
}

/**
 * Computes vertical impulses for in-flight clone fission (two-stage rocket).
 */
export function computeFissionVelocities(upsideDown = 1): {
  upperVy: number;
  lowerVy: number;
} {
  return {
    upperVy: PHYSICS.FISSION_UPPER_VY * upsideDown,
    lowerVy: PHYSICS.FISSION_LOWER_VY * upsideDown
  };
}

/**
 * Returns true if a hero should shatter a `cracked: true` platform.
 */
export function shouldBreakCrackedPlatform(
  fusionStack: number,
  touchingTop: boolean,
  isDiving: boolean
): boolean {
  return fusionStack >= 2 && (touchingTop || isDiving);
}

export interface ScreenWrapAxes {
  horizontal: boolean;
  vertical: boolean;
}

export function getScreenWrapAxes(screenWrap: LevelData['screenWrap']): ScreenWrapAxes {
  if (!screenWrap) {
    return { horizontal: false, vertical: false };
  }
  if (screenWrap === true || screenWrap === 'horizontal') {
    return { horizontal: true, vertical: false };
  }
  if (screenWrap === 'vertical') {
    return { horizontal: false, vertical: true };
  }
  if (screenWrap === 'both') {
    return { horizontal: true, vertical: true };
  }
  return { horizontal: false, vertical: false };
}

export interface ToroidalWrapResult {
  x: number;
  y: number;
  wrappedX: boolean;
  wrappedY: boolean;
}

/**
 * Teleports a position across toroidal world boundaries while preserving 100% of velocity.
 */
export function applyToroidalScreenWrap(
  pos: Vec2,
  worldWidth: number,
  worldHeight: number,
  screenWrap: LevelData['screenWrap']
): ToroidalWrapResult {
  const axes = getScreenWrapAxes(screenWrap);
  let x = pos.x;
  let y = pos.y;
  let wrappedX = false;
  let wrappedY = false;

  if (axes.horizontal && worldWidth > 0) {
    if (x < 0) {
      x += worldWidth;
      wrappedX = true;
    } else if (x > worldWidth) {
      x -= worldWidth;
      wrappedX = true;
    }
  }

  if (axes.vertical && worldHeight > 0) {
    if (y < 0) {
      y += worldHeight;
      wrappedY = true;
    } else if (y > worldHeight) {
      y -= worldHeight;
      wrappedY = true;
    }
  }

  return { x, y, wrappedX, wrappedY };
}

/**
 * Returns mirror ghost coordinates when a hero approaches within `margin` (default 32 px)
 * of a wrapped boundary.
 */
export function getScreenWrapGhostPositions(
  pos: Vec2,
  worldWidth: number,
  worldHeight: number,
  screenWrap: LevelData['screenWrap'],
  margin = PHYSICS.SCREEN_WRAP_GHOST_MARGIN
): Vec2[] {
  const axes = getScreenWrapAxes(screenWrap);
  const ghosts: Vec2[] = [];

  if (axes.horizontal && worldWidth > 0) {
    if (pos.x < margin) {
      ghosts.push({ x: pos.x + worldWidth, y: pos.y });
    } else if (pos.x > worldWidth - margin) {
      ghosts.push({ x: pos.x - worldWidth, y: pos.y });
    }
  }

  if (axes.vertical && worldHeight > 0) {
    if (pos.y < margin) {
      ghosts.push({ x: pos.x, y: pos.y + worldHeight });
    } else if (pos.y > worldHeight - margin) {
      ghosts.push({ x: pos.x, y: pos.y - worldHeight });
    }
  }

  return ghosts;
}
