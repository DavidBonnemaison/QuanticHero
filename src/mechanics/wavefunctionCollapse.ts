import type { ObserverBeam, SuperpositionConfig } from '../types';

export const DEFAULT_LOCK_DURATION_MS = 3000;
export const DEFAULT_OBSERVER_CONE_RANGE = 340;
export const DEFAULT_OBSERVER_CONE_HALF_ANGLE_DEG = 40;
export const OBSERVER_CONE_FLASH_MS = 220;
export const OBSERVER_BEAM_HALF_ANGLE_DEG = 9;

export type CollapsedState = 'A' | 'B';
export type ObservationSource = 'player' | 'beam' | 'pointer';

export interface SuperpositionRuntimeState {
  collapsedState: CollapsedState | null;
  lockRemainingMs: number;
  lockDurationMs: number;
  lastCollapsedBy?: ObservationSource;
}

export interface SuperposedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObserverCone {
  originX: number;
  originY: number;
  angleDeg: number;
  halfAngleDeg: number;
  range: number;
}

export interface CollapseResult {
  state: SuperpositionRuntimeState;
  collapsedTo: CollapsedState;
  probability: number;
  changed: boolean;
}

export interface LockTickResult {
  state: SuperpositionRuntimeState;
  released: boolean;
}

export function createSuperpositionState(
  lockDurationMs: number = DEFAULT_LOCK_DURATION_MS
): SuperpositionRuntimeState {
  const safeDuration = lockDurationMs > 0 ? lockDurationMs : DEFAULT_LOCK_DURATION_MS;
  return {
    collapsedState: null,
    lockRemainingMs: 0,
    lockDurationMs: safeDuration
  };
}

/**
 * Deterministic instantaneous probability p(t) ∈ [0, 1] of state A.
 * Uses a smooth cosine wave so p(0) = 1 (state A dominant), p(T/2) = 0 (state B dominant).
 * Zero Math.random(): directly synchronized with visual opacity.
 */
export function computeSuperpositionProbability(
  elapsedMs: number,
  periodMs: number,
  phaseOffsetMs = 0
): number {
  const safePeriod = periodMs > 0 ? periodMs : 2400;
  const phase = ((elapsedMs + phaseOffsetMs) / safePeriod) * Math.PI * 2;
  const raw = 0.5 * (1 + Math.cos(phase));
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}

/**
 * 100% deterministic wavefunction collapse rule:
 * State A if p(t) >= 0.5, State B if p(t) < 0.5.
 */
export function determineCollapsedState(probability: number): CollapsedState {
  return probability >= 0.5 ? 'A' : 'B';
}

export function getSuperposedRectForState(
  base: SuperposedBounds,
  config: SuperpositionConfig,
  state: CollapsedState
): SuperposedBounds {
  if (state === 'B') {
    return {
      x: config.altX,
      y: config.altY,
      width: base.width,
      height: base.height
    };
  }
  return {
    x: base.x,
    y: base.y,
    width: base.width,
    height: base.height
  };
}

/**
 * Collapses a superposed object into its deterministic eigenstate ('A' | 'B')
 * and locks it for lockDurationMs. Re-observing an already locked object
 * refreshes its lock timer (Quantum Zeno effect) without flipping its state.
 */
export function collapseSuperposition(
  runtime: SuperpositionRuntimeState,
  elapsedMs: number,
  config: SuperpositionConfig,
  source: ObservationSource = 'player',
  phaseOffsetMs = 0
): CollapseResult {
  const lockDurationMs =
    config.lockDurationMs && config.lockDurationMs > 0
      ? config.lockDurationMs
      : runtime.lockDurationMs || DEFAULT_LOCK_DURATION_MS;
  const probability = computeSuperpositionProbability(elapsedMs, config.periodMs, phaseOffsetMs);

  if (runtime.collapsedState !== null && runtime.lockRemainingMs > 0) {
    return {
      state: {
        collapsedState: runtime.collapsedState,
        lockRemainingMs: lockDurationMs,
        lockDurationMs,
        lastCollapsedBy: source
      },
      collapsedTo: runtime.collapsedState,
      probability,
      changed: false
    };
  }

  const collapsedTo = determineCollapsedState(probability);
  return {
    state: {
      collapsedState: collapsedTo,
      lockRemainingMs: lockDurationMs,
      lockDurationMs,
      lastCollapsedBy: source
    },
    collapsedTo,
    probability,
    changed: true
  };
}

/**
 * Advances the lock countdown timer. When it reaches 0, the object returns
 * automatically to quantum superposition (collapsedState = null).
 */
export function tickSuperpositionLock(
  runtime: SuperpositionRuntimeState,
  deltaMs: number
): LockTickResult {
  if (runtime.collapsedState === null) {
    return { state: runtime, released: false };
  }
  const safeDelta = Math.max(0, deltaMs);
  const nextRemaining = runtime.lockRemainingMs - safeDelta;
  if (nextRemaining <= 0) {
    return {
      state: {
        collapsedState: null,
        lockRemainingMs: 0,
        lockDurationMs: runtime.lockDurationMs
      },
      released: true
    };
  }
  return {
    state: {
      ...runtime,
      lockRemainingMs: nextRemaining
    },
    released: false
  };
}

/**
 * Normalizes an angle difference into [-180, 180].
 */
export function normalizeAngleDiffDeg(angleA: number, angleB: number): number {
  let diff = ((((angleA - angleB) % 360) + 540) % 360) - 180;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Deterministic sweeping angle (in degrees, 0 = right, 90 = down) for a passive ObserverBeam.
 * - If sweepAngleDeg >= 360: continuous rotation at speedDegPerSec.
 * - Otherwise: constant-speed ping-pong sweep centered around centerAngleDeg (default 90° downward).
 */
export function computeObserverBeamAngleDeg(
  beam: ObserverBeam,
  elapsedMs: number,
  centerAngleDeg = 90
): number {
  const safeElapsedSec = Math.max(0, elapsedMs) / 1000;
  const speed = beam.speedDegPerSec;
  const sweep = Math.abs(beam.sweepAngleDeg);

  if (sweep === 0 || speed === 0) {
    return centerAngleDeg;
  }

  if (sweep >= 360) {
    return (((centerAngleDeg + safeElapsedSec * speed) % 360) + 360) % 360;
  }

  const absSpeed = Math.abs(speed);
  const halfSweep = sweep / 2;
  const fullCycleTravel = sweep * 2;
  const traveled = (safeElapsedSec * absSpeed) % fullCycleTravel;
  const signedProgress = traveled <= sweep ? -halfSweep + traveled : halfSweep - (traveled - sweep);
  const directionSign = speed < 0 ? -1 : 1;

  return centerAngleDeg + signedProgress * directionSign;
}

export function isPointInObserverCone(px: number, py: number, cone: ObserverCone): boolean {
  const dx = px - cone.originX;
  const dy = py - cone.originY;
  const distSq = dx * dx + dy * dy;
  if (distSq > cone.range * cone.range) {
    return false;
  }
  if (distSq <= 1) {
    return true;
  }
  const pointAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const diff = Math.abs(normalizeAngleDiffDeg(pointAngleDeg, cone.angleDeg));
  return diff <= cone.halfAngleDeg;
}

export function isPointInRect(
  px: number,
  py: number,
  rect: SuperposedBounds,
  padding = 0
): boolean {
  return (
    px >= rect.x - padding &&
    px <= rect.x + rect.width + padding &&
    py >= rect.y - padding &&
    py <= rect.y + rect.height + padding
  );
}

/**
 * Tests whether a ray segment from origin along angleDeg with length range
 * intersects an axis-aligned rectangle (slab method).
 */
function doesRaySegmentIntersectRect(
  ox: number,
  oy: number,
  angleDeg: number,
  range: number,
  rect: SuperposedBounds
): boolean {
  const rad = (angleDeg * Math.PI) / 180;
  const dirX = Math.cos(rad) * range;
  const dirY = Math.sin(rad) * range;

  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dirX) < 1e-8) {
    if (ox < rect.x || ox > rect.x + rect.width) return false;
  } else {
    const invD = 1 / dirX;
    let t1 = (rect.x - ox) * invD;
    let t2 = (rect.x + rect.width - ox) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  if (Math.abs(dirY) < 1e-8) {
    if (oy < rect.y || oy > rect.y + rect.height) return false;
  } else {
    const invD = 1 / dirY;
    let t1 = (rect.y - oy) * invD;
    let t2 = (rect.y + rect.height - oy) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return tMax >= 0 && tMin <= 1;
}

/**
 * Pure geometric intersection test between an observation cone (active or passive beam)
 * and an axis-aligned rectangle.
 */
export function isRectIntersectingObserverCone(
  rect: SuperposedBounds,
  cone: ObserverCone
): boolean {
  // 1. Origin inside rect
  if (isPointInRect(cone.originX, cone.originY, rect)) {
    return true;
  }

  // 2. Sample key points of rect (center, 4 corners, edge midpoints) inside cone
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const samplePoints: ReadonlyArray<readonly [number, number]> = [
    [cx, cy],
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
    [cx, rect.y],
    [cx, rect.y + rect.height],
    [rect.x, cy],
    [rect.x + rect.width, cy]
  ];
  for (const [px, py] of samplePoints) {
    if (isPointInObserverCone(px, py, cone)) {
      return true;
    }
  }

  // 3. Center ray and cone boundary rays intersecting the rectangle
  if (doesRaySegmentIntersectRect(cone.originX, cone.originY, cone.angleDeg, cone.range, rect)) {
    return true;
  }
  if (
    doesRaySegmentIntersectRect(
      cone.originX,
      cone.originY,
      cone.angleDeg - cone.halfAngleDeg,
      cone.range,
      rect
    )
  ) {
    return true;
  }
  if (
    doesRaySegmentIntersectRect(
      cone.originX,
      cone.originY,
      cone.angleDeg + cone.halfAngleDeg,
      cone.range,
      rect
    )
  ) {
    return true;
  }

  return false;
}

export function isSuperposedObjectInCone(
  base: SuperposedBounds,
  config: SuperpositionConfig,
  cone: ObserverCone
): boolean {
  const rectA = getSuperposedRectForState(base, config, 'A');
  if (isRectIntersectingObserverCone(rectA, cone)) return true;
  const rectB = getSuperposedRectForState(base, config, 'B');
  return isRectIntersectingObserverCone(rectB, cone);
}

export function isSuperposedObjectAtPoint(
  base: SuperposedBounds,
  config: SuperpositionConfig,
  px: number,
  py: number,
  padding = 16
): boolean {
  const rectA = getSuperposedRectForState(base, config, 'A');
  if (isPointInRect(px, py, rectA, padding)) return true;
  const rectB = getSuperposedRectForState(base, config, 'B');
  return isPointInRect(px, py, rectB, padding);
}

/**
 * Deterministic pseudo-noise offset for quantum probability cloud particles
 * (zero Math.random).
 */
export function computeQuantumNoiseOffset(
  index: number,
  elapsedMs: number,
  amplitude = 5
): { dx: number; dy: number } {
  const t = elapsedMs * 0.004;
  return {
    dx: Math.sin(t * 1.7 + index * 2.39996) * amplitude,
    dy: Math.cos(t * 2.1 + index * 1.61803) * amplitude
  };
}
