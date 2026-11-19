import type { MatterState, Wormhole } from '../types';
import { PHYSICS } from './constants';

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Checks whether a hero hitbox overlaps a rectangular region (center-based or top-left-based).
 * Uses center coordinates (cx, cy) when `centered` is true (Phaser Rectangle default).
 */
export function isHeroOverlappingRect(
  heroX: number,
  heroY: number,
  rect: RectBounds,
  centered = true,
  margin = 0
): boolean {
  const hLeft = heroX - PHYSICS.HERO_HITBOX_HALF_W;
  const hRight = heroX + PHYSICS.HERO_HITBOX_HALF_W;
  const hTop = heroY - PHYSICS.HERO_HITBOX_HALF_H;
  const hBottom = heroY + PHYSICS.HERO_HITBOX_HALF_H;

  const rLeft = (centered ? rect.x - rect.width / 2 : rect.x) - margin;
  const rRight = (centered ? rect.x + rect.width / 2 : rect.x + rect.width) + margin;
  const rTop = (centered ? rect.y - rect.height / 2 : rect.y) - margin;
  const rBottom = (centered ? rect.y + rect.height / 2 : rect.y + rect.height) + margin;

  return hRight > rLeft && hLeft < rRight && hBottom > rTop && hTop < rBottom;
}

/**
 * Returns true if the hero should plunge into a liquid platform rather than float on its surface.
 * Triggered by diving (Flick-Down / S / ArrowDown) or arriving at vy * upsideDown > 380 px/s.
 */
export function shouldPlungeIntoLiquid(
  vy: number,
  upsideDown: number,
  isDiving: boolean,
  diveRequested: boolean
): boolean {
  return isDiving || diveRequested || vy * upsideDown > PHYSICS.LIQUID_PLUNGE_VY;
}

/**
 * Applies Archimedes buoyancy thrust inside a liquid platform:
 * vy -= 900 * dt (in normal gravity), inverted when upsideDown === -1.
 */
export function stepLiquidBuoyancy(vy: number, upsideDown: number, dt: number): number {
  if (dt <= 0) return vy;
  return vy - PHYSICS.LIQUID_BUOYANCY_ACCEL * dt * upsideDown;
}

/**
 * Returns the dolphin-leap exit velocity when emerging out of a liquid platform (-520 * upsideDown).
 */
export function getLiquidEmergeVelocity(upsideDown: number): number {
  return PHYSICS.LIQUID_EMERGE_VY * upsideDown;
}

/**
 * Applies smooth noble-gas updraft velocity:
 * vy = clamp(vy - 1100 * dt, -340, 200) in normal gravity (mirrored when upsideDown === -1).
 */
export function stepGasUpdraft(vy: number, dt: number, upsideDown = 1): number {
  if (dt <= 0) return vy;
  if (upsideDown === -1) {
    const next = vy + PHYSICS.GAS_UPDRAFT_ACCEL * dt;
    return Math.max(-PHYSICS.GAS_MAX_VY, Math.min(-PHYSICS.GAS_MIN_VY, next));
  }
  const next = vy - PHYSICS.GAS_UPDRAFT_ACCEL * dt;
  return Math.max(PHYSICS.GAS_MIN_VY, Math.min(PHYSICS.GAS_MAX_VY, next));
}

/**
 * Returns elastic trampoline bounce velocity on a plasma platform (-640 * upsideDown).
 */
export function getPlasmaBounceVelocity(upsideDown: number): number {
  return PHYSICS.PLASMA_BOUNCE_VY * upsideDown;
}

export function normalizeMatterState(raw?: string): MatterState {
  if (raw === 'liquid' || raw === 'gas' || raw === 'cryo' || raw === 'plasma' || raw === 'solid') {
    return raw;
  }
  return 'solid';
}

// --- Mechanics #5: Quantum Pinning (Zeno Effect) ---

export interface QuantumPinningState {
  pinnedPlatformId: string | null;
  pinElapsedMs: number;
  cooldownRemainingMs: number;
}

export interface PinnablePlatformRef {
  id: string;
  x: number; // center X
  y: number; // center Y
  width: number;
  height: number;
}

export function createQuantumPinningState(): QuantumPinningState {
  return {
    pinnedPlatformId: null,
    pinElapsedMs: 0,
    cooldownRemainingMs: 0
  };
}

/**
 * Finds the nearest pinnable platform (decayMs or phase) within maxRadius (180 px) of the hero.
 */
export function findNearestPinnablePlatform(
  heroX: number,
  heroY: number,
  platforms: PinnablePlatformRef[],
  maxRadius: number = PHYSICS.QUANTUM_PIN_RADIUS
): PinnablePlatformRef | null {
  let best: PinnablePlatformRef | null = null;
  let bestDist = maxRadius;

  for (const plat of platforms) {
    const halfW = plat.width / 2;
    const halfH = plat.height / 2;
    const clampedX = Math.max(plat.x - halfW, Math.min(heroX, plat.x + halfW));
    const clampedY = Math.max(plat.y - halfH, Math.min(heroY, plat.y + halfH));
    const dist = Math.hypot(heroX - clampedX, heroY - clampedY);
    if (dist <= bestDist) {
      bestDist = dist;
      best = plat;
    }
  }

  return best;
}

/**
 * Finds a pinnable platform containing the given world pointer coordinates (with optional padding).
 */
export function findPinnablePlatformAtPoint(
  worldX: number,
  worldY: number,
  platforms: PinnablePlatformRef[],
  padding = 16
): PinnablePlatformRef | null {
  for (const plat of platforms) {
    const halfW = plat.width / 2 + padding;
    const halfH = plat.height / 2 + padding;
    if (
      worldX >= plat.x - halfW &&
      worldX <= plat.x + halfW &&
      worldY >= plat.y - halfH &&
      worldY <= plat.y + halfH
    ) {
      return plat;
    }
  }
  return null;
}

/**
 * Advances Quantum Pinning state by deltaMs.
 * Enforces max 1 platform pinned at a time, max 3500 ms duration, and 1500 ms thermal cooldown.
 */
export function stepQuantumPinning(
  state: QuantumPinningState,
  targetPlatformId: string | null,
  deltaMs: number
): QuantumPinningState {
  if (state.cooldownRemainingMs > 0) {
    return {
      pinnedPlatformId: null,
      pinElapsedMs: 0,
      cooldownRemainingMs: Math.max(0, state.cooldownRemainingMs - deltaMs)
    };
  }

  if (targetPlatformId === null) {
    return {
      pinnedPlatformId: null,
      pinElapsedMs: 0,
      cooldownRemainingMs: 0
    };
  }

  const nextElapsed =
    state.pinnedPlatformId === targetPlatformId ? state.pinElapsedMs + deltaMs : deltaMs;

  if (nextElapsed >= PHYSICS.QUANTUM_PIN_MAX_DURATION_MS) {
    return {
      pinnedPlatformId: null,
      pinElapsedMs: 0,
      cooldownRemainingMs: PHYSICS.QUANTUM_PIN_COOLDOWN_MS
    };
  }

  return {
    pinnedPlatformId: targetPlatformId,
    pinElapsedMs: nextElapsed,
    cooldownRemainingMs: 0
  };
}

// --- Mechanics #6: Momentum-Conserving Wormholes ---

export function isHeroInWormholeInlet(
  heroX: number,
  heroY: number,
  wormhole: Pick<Wormhole, 'inX' | 'inY'>,
  radius: number = PHYSICS.WORMHOLE_RADIUS
): boolean {
  return Math.hypot(heroX - wormhole.inX, heroY - wormhole.inY) <= radius;
}

/**
 * Computes wormhole exit position and velocity preserving momentum magnitude (min 250 px/s)
 * rotated along outNormalAngleDeg.
 */
export function computeWormholeExit(
  vx: number,
  vy: number,
  wormhole: Pick<Wormhole, 'outX' | 'outY' | 'outNormalAngleDeg'>
): { x: number; y: number; vx: number; vy: number; speed: number } {
  const speed = Math.max(PHYSICS.WORMHOLE_MIN_SPEED, Math.hypot(vx, vy));
  const outRad = (wormhole.outNormalAngleDeg * Math.PI) / 180;
  const rawVx = Math.cos(outRad) * speed;
  const rawVy = Math.sin(outRad) * speed;

  // Clean up IEEE-754 near-zero values (e.g. Math.cos(Math.PI/2))
  const outVx = Math.abs(rawVx) < 1e-9 ? 0 : rawVx;
  const outVy = Math.abs(rawVy) < 1e-9 ? 0 : rawVy;

  return {
    x: wormhole.outX,
    y: wormhole.outY,
    vx: outVx,
    vy: outVy,
    speed
  };
}

// --- Mechanics #7 & #8: Broglie Wave-Trail Solidification & Ghost Surfing ---

export interface TrailPoint {
  x: number;
  y: number;
}

export interface CrystalSegment {
  x: number; // center X
  y: number; // center Y
  width: number;
  height: number;
}

/**
 * Crystallizes up to the last 8 Broglie wave-trail points into solid cyan crystal platform segments.
 */
export function buildBroglieScaffoldSegments(points: TrailPoint[], yOffset = 22): CrystalSegment[] {
  const recent = points.slice(-PHYSICS.BROGLIE_TRAIL_POINTS);
  return recent.map((pt) => ({
    x: pt.x,
    y: pt.y + yOffset,
    width: 24,
    height: 10
  }));
}

/**
 * Checks whether a descending hero can temporal-surf on top of an active GhostHero.
 */
export function canGhostSurf(
  hero: { x: number; y: number; vy: number; upsideDown: number; hasSurfedThisJump?: boolean },
  ghost: { x: number; y: number; visible: boolean; active: boolean } | null
): boolean {
  if (!ghost || !ghost.visible || !ghost.active) return false;
  if (hero.hasSurfedThisJump) return false;
  if (hero.vy * hero.upsideDown <= 0) return false;

  return (
    Math.abs(hero.x - ghost.x) < PHYSICS.GHOST_SURF_DX &&
    Math.abs(hero.y - ghost.y) < PHYSICS.GHOST_SURF_DY
  );
}

/**
 * Returns temporal bounce velocity on GhostHero (-520 * upsideDown).
 */
export function getGhostSurfVelocity(upsideDown: number): number {
  return PHYSICS.GHOST_SURF_VY * upsideDown;
}
