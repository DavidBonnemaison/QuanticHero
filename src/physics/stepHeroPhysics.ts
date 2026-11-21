import type { Platform, PressurePlate } from '../types';
import { PHYSICS } from './constants';

export interface HeroControlState {
  vx: number;
  vy: number;
  touchingGround: boolean;
  recoilTimer: number;
  recoilVx: number;
  velocityMultiplier: number;
  upsideDown: number;
  flipX: boolean;
  animState: 'idle' | 'left' | 'right' | 'jump';
  isActive?: boolean;
  nowMs?: number;
  lastGroundedTimeMs?: number;
  lastJumpPressedTimeMs?: number;
  hasJumpedSinceGrounded?: boolean;
  prevJumpPressed?: boolean;
  jumpCutApplied?: boolean;
  isDiving?: boolean;
  lastDiveEndTimeMs?: number;
  waveDashUntilMs?: number;
  jumpMultiplier?: number;
  onCryo?: boolean;
}

export interface HeroControlInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  dive?: boolean;
}

export interface HeroControlResult {
  vx: number;
  vy: number;
  recoilTimer: number;
  recoilVx: number;
  flipX: boolean;
  animState: 'idle' | 'left' | 'right' | 'jump';
  jumped: boolean;
  dived: boolean;
  jumpCut: boolean;
  waveDashed: boolean;
}

/**
 * Applies exponential damping independent of framerate.
 * At deltaMs === PHYSICS.DELTA_FIXED_MS (16.666 ms), frameRatio === 1.
 */
export function applyFramerateIndependentDrag(
  velocity: number,
  baseDrag: number,
  deltaMs: number
): number {
  if (deltaMs <= 0) return velocity;
  const frameRatio = deltaMs / PHYSICS.DELTA_FIXED_MS;
  return velocity * baseDrag ** frameRatio;
}

/**
 * Returns the Spec-04 asymmetric gravity multiplier:
 * - Apex Hang-Time: |vy| < 45 px/s -> 0.6 (40% reduced gravity)
 * - Fast Fall: vy * upsideDown > 45 px/s -> 1.35
 * - Normal ascent / grounded -> 1.0
 */
export function getAsymmetricGravityMultiplier(
  vy: number,
  upsideDown: number,
  touchingGround: boolean
): number {
  if (touchingGround) return 1;
  if (Math.abs(vy) < PHYSICS.APEX_VY_THRESHOLD) {
    return PHYSICS.APEX_GRAVITY_MULT;
  }
  if (vy * upsideDown > PHYSICS.APEX_VY_THRESHOLD) {
    return PHYSICS.FALL_GRAVITY_MULT;
  }
  return 1;
}

/**
 * Clamps downward vertical velocity to PHYSICS.MAX_FALL_VY (680 px/s),
 * or PHYSICS.MAX_DIVE_VY (560 px/s) when diving to prevent platform tunneling.
 */
export function clampFallVelocity(vy: number, upsideDown: number, isDiving: boolean): number {
  const maxVy = isDiving ? PHYSICS.MAX_DIVE_VY : PHYSICS.MAX_FALL_VY;
  if (vy * upsideDown > maxVy) {
    return maxVy * upsideDown;
  }
  return vy;
}

/**
 * Computes Spec-04 predictive camera Look-Ahead followOffset.
 */
export function computeLookAheadOffset(vx: number, vy: number): { x: number; y: number } {
  return {
    x: Math.max(-70, Math.min(70, -vx * 0.18)),
    y: Math.max(-55, Math.min(55, -vy * 0.12))
  };
}

/**
 * Pure, Phaser-free horizontal control, wall-recoil damping, air drag, and jump step.
 * Shared by Hero.ts (Phaser runtime) and simulator.ts (Node DAG solver).
 */
export function stepHeroControl(
  state: HeroControlState,
  input: HeroControlInput,
  deltaMs: number = PHYSICS.DELTA_FIXED_MS
): HeroControlResult {
  const nowMs = state.nowMs;
  const hasTime = nowMs !== undefined;
  const isActive = state.isActive ?? true;

  const jumpJustPressed = hasTime ? input.jump && !(state.prevJumpPressed ?? false) : input.jump;
  const jumpReleased = hasTime ? !input.jump && (state.prevJumpPressed ?? false) : false;

  const canCoyoteJump =
    hasTime &&
    !state.touchingGround &&
    !(state.hasJumpedSinceGrounded ?? false) &&
    nowMs - (state.lastGroundedTimeMs ?? Number.NEGATIVE_INFINITY) <= PHYSICS.COYOTE_TIME_MS;

  const hasBufferedJump =
    hasTime &&
    state.touchingGround &&
    nowMs - (state.lastJumpPressedTimeMs ?? Number.NEGATIVE_INFINITY) <= PHYSICS.JUMP_BUFFER_MS;

  const willJump =
    isActive &&
    state.recoilTimer <= 0 &&
    ((state.touchingGround && (input.jump || hasBufferedJump)) ||
      (jumpJustPressed && canCoyoteJump));

  const waveDashTriggered =
    willJump &&
    hasTime &&
    nowMs - (state.lastDiveEndTimeMs ?? Number.NEGATIVE_INFINITY) <= PHYSICS.WAVE_DASH_WINDOW_MS;

  const isWaveDashActive =
    waveDashTriggered || (hasTime && nowMs < (state.waveDashUntilMs ?? Number.NEGATIVE_INFINITY));

  const mult = state.velocityMultiplier * (isWaveDashActive ? PHYSICS.WAVE_DASH_MULTIPLIER : 1);

  let vx = state.vx;
  let vy = state.vy;
  let recoilTimer = state.recoilTimer;
  let recoilVx = state.recoilVx;
  let flipX = state.flipX;
  let animState = state.animState;
  let jumped = false;
  let dived = false;
  let jumpCut = false;

  if (recoilTimer > 0) {
    recoilTimer -= deltaMs;
    vx = recoilVx;
    recoilVx = applyFramerateIndependentDrag(recoilVx, PHYSICS.WALL_RECOIL_DRAG_X, deltaMs);

    // Allow cancelling recoil early if player steers in the bounce direction
    if (recoilVx > 0 && input.right) {
      recoilTimer = 0;
      vx = PHYSICS.HERO_SPEED_X * mult;
    } else if (recoilVx < 0 && input.left) {
      recoilTimer = 0;
      vx = -PHYSICS.HERO_SPEED_X * mult;
    }

    animState = 'jump';
    flipX = recoilVx < 0;
    return {
      vx,
      vy,
      recoilTimer,
      recoilVx,
      flipX,
      animState,
      jumped,
      dived,
      jumpCut,
      waveDashed: false
    };
  }

  if (isActive) {
    const isHighSpeed = Math.abs(vx) > PHYSICS.HERO_SPEED_X * mult;
    if (input.left) {
      if ((state.touchingGround && !state.onCryo) || !isHighSpeed || vx > 0) {
        vx = -PHYSICS.HERO_SPEED_X * mult;
      }
      flipX = true;
      if (state.touchingGround) {
        animState = 'left';
      }
    } else if (input.right) {
      if ((state.touchingGround && !state.onCryo) || !isHighSpeed || vx < 0) {
        vx = PHYSICS.HERO_SPEED_X * mult;
      }
      flipX = false;
      if (state.touchingGround) {
        animState = 'right';
      }
    } else {
      if (state.touchingGround) {
        if (state.onCryo) {
          vx = applyFramerateIndependentDrag(vx, PHYSICS.CRYO_GROUND_DRAG, deltaMs);
          animState = Math.abs(vx) > 5 ? (vx < 0 ? 'left' : 'right') : 'idle';
        } else {
          vx = 0;
          animState = 'idle';
        }
      } else {
        const baseDrag = isHighSpeed ? PHYSICS.HIGH_SPEED_AIR_DRAG_X : PHYSICS.AIR_DRAG_X;
        vx = applyFramerateIndependentDrag(vx, baseDrag, deltaMs);
      }
    }

    if (willJump) {
      vy = PHYSICS.HERO_JUMP_V0 * state.upsideDown * (state.jumpMultiplier ?? 1);
      animState = 'jump';
      jumped = true;
    } else if (input.dive && !state.touchingGround && vy * state.upsideDown < PHYSICS.DIVE_VY) {
      vx *= 0.5;
      vy = PHYSICS.DIVE_VY * state.upsideDown;
      animState = 'jump';
      dived = true;
    } else if (
      hasTime &&
      !state.touchingGround &&
      !(state.jumpCutApplied ?? false) &&
      jumpReleased &&
      vy * state.upsideDown < 0
    ) {
      vy *= PHYSICS.JUMP_CUT_MULTIPLIER;
      jumpCut = true;
    }
  } else if (state.touchingGround) {
    if (state.onCryo) {
      vx = applyFramerateIndependentDrag(vx, PHYSICS.CRYO_GROUND_DRAG, deltaMs);
      animState = Math.abs(vx) > 5 ? (vx < 0 ? 'left' : 'right') : 'idle';
    } else {
      vx = 0;
      animState = 'idle';
    }
  }

  if (!state.touchingGround || jumped) {
    animState = 'jump';
  }

  return {
    vx,
    vy,
    recoilTimer,
    recoilVx,
    flipX,
    animState,
    jumped,
    dived,
    jumpCut,
    waveDashed: waveDashTriggered
  };
}

/**
 * Cumulative low-gravity multiplier capped at PHYSICS.LOW_GRAVITY_MIN_MULTIPLIER (0.25).
 */
export function applyLowGravity(currentMultiplier: number): number {
  return Math.max(PHYSICS.LOW_GRAVITY_MIN_MULTIPLIER, currentMultiplier * 0.5);
}

/**
 * Unified pressure plate overlap check using PHYSICS.HERO_HITBOX_HALF_W (16)
 * and PHYSICS.HERO_HITBOX_HALF_H (20).
 */
export function isHeroOnPressurePlate(
  heroX: number,
  heroY: number,
  plate: Pick<PressurePlate, 'x' | 'y' | 'width' | 'height'>,
  toleranceY = 6
): boolean {
  const hLeft = heroX - PHYSICS.HERO_HITBOX_HALF_W;
  const hRight = heroX + PHYSICS.HERO_HITBOX_HALF_W;
  const hTop = heroY - PHYSICS.HERO_HITBOX_HALF_H;
  const hBottom = heroY + PHYSICS.HERO_HITBOX_HALF_H;

  const pLeft = plate.x;
  const pRight = plate.x + plate.width;
  const pTop = plate.y - toleranceY;
  const pBottom = plate.y + plate.height + toleranceY;

  return hRight > pLeft && hLeft < pRight && hBottom >= pTop && hTop <= pBottom;
}

/**
 * Unified gravitational collapse spike boundary positions.
 */
export function getCollapseBounds(
  worldHeight: number,
  collapseOffsetY = 0
): { topSpikeBottom: number; bottomSpikeTop: number } {
  return {
    topSpikeBottom: PHYSICS.COLLAPSE_TOP_START_Y + collapseOffsetY,
    bottomSpikeTop: worldHeight - PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y - collapseOffsetY
  };
}

export interface MovingPlatformSimState {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  movesTo: { x?: number; y?: number };
  direction: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
  dx: number;
  dy: number;
}

/**
 * Initializes moving platform simulation state from a Platform definition.
 */
export function createMovingPlatformState(
  platform: Platform,
  index: number
): MovingPlatformSimState {
  const movesTo = platform.movesTo ?? {};
  const dirX =
    movesTo.x !== undefined
      ? movesTo.x > platform.x
        ? 'right'
        : movesTo.x < platform.x
          ? 'left'
          : null
      : null;
  const dirY =
    movesTo.y !== undefined
      ? movesTo.y > platform.y
        ? 'bottom'
        : movesTo.y < platform.y
          ? 'top'
          : null
      : null;

  return {
    index,
    x: platform.x,
    y: platform.y,
    width: platform.width,
    height: platform.height,
    startX: platform.x,
    startY: platform.y,
    movesTo,
    direction: { x: dirX, y: dirY },
    dx: 0,
    dy: 0
  };
}

/**
 * Steps a moving platform by deltaMs using the exact same speeds and reversal bounds as GameScene.ts.
 */
export function stepMovingPlatform(
  mp: MovingPlatformSimState,
  deltaMs: number,
  timeDilationFactor = 1.0
): MovingPlatformSimState {
  const dt = deltaMs / 1000;
  const targetX = mp.movesTo.x !== undefined ? mp.movesTo.x : mp.startX;
  const targetY = mp.movesTo.y !== undefined ? mp.movesTo.y : mp.startY;
  const minX = Math.min(mp.startX, targetX);
  const maxX = Math.max(mp.startX, targetX);
  const minY = Math.min(mp.startY, targetY);
  const maxY = Math.max(mp.startY, targetY);

  let nextX = mp.x;
  let nextY = mp.y;
  let dirX = mp.direction.x;
  let dirY = mp.direction.y;

  if (dirX === 'right') {
    nextX += PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor * dt;
    if (nextX >= maxX) {
      dirX = 'left';
    }
  } else if (dirX === 'left') {
    nextX -= PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor * dt;
    if (nextX <= minX) {
      dirX = 'right';
    }
  }

  if (dirY === 'bottom') {
    nextY += PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor * dt;
    if (nextY >= maxY) {
      dirY = 'top';
    }
  } else if (dirY === 'top') {
    nextY -= PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor * dt;
    if (nextY <= minY) {
      dirY = 'bottom';
    }
  }

  return {
    ...mp,
    x: nextX,
    y: nextY,
    direction: { x: dirX, y: dirY },
    dx: nextX - mp.x,
    dy: nextY - mp.y
  };
}
