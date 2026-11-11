import { PHYSICS } from '../physics/constants';
import { type GhostFrame, compressTrajectory } from '../tools/GhostRecorder';
import type { Door, Platform, Spike } from '../types';

export interface SimHeroState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  touchingGround: boolean;
  recoilTimer: number;
  recoilVx: number;
  velocityMultiplier: number;
  upsideDown: number;
  timeMs: number;
  flipX: boolean;
  animState: 'idle' | 'left' | 'right' | 'jump';
}

export interface SimInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface SimWorld {
  width: number;
  height: number;
  gravityY?: number;
  platforms: Platform[];
  spikes?: Spike[];
  bounceWalls?: boolean;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export interface SimulationResult {
  success: boolean;
  totalTimeMs: number;
  frames: GhostFrame[];
  path: TrajectoryPoint[];
  authorGhost: string;
  authorTime: number;
  failureReason?: string;
  finalHeroState: SimHeroState;
}

/**
 * Creates initial hero state positioned on a platform or coordinates.
 */
export function createInitialHeroState(
  x: number,
  y: number,
  velocityMultiplier = 1,
  upsideDown = 1
): SimHeroState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    touchingGround: true,
    recoilTimer: 0,
    recoilVx: 0,
    velocityMultiplier,
    upsideDown,
    timeMs: 0,
    flipX: false,
    animState: 'idle'
  };
}

/**
 * Executes a single discrete physics frame (60 Hz / DELTA_FIXED_MS) replicating Hero.ts & GameScene.ts.
 */
export function stepSimulation(
  hero: SimHeroState,
  input: SimInput,
  world: SimWorld,
  deltaMs: number = PHYSICS.DELTA_FIXED_MS
): SimHeroState {
  const next: SimHeroState = { ...hero, timeMs: hero.timeMs + deltaMs };
  const mult = next.velocityMultiplier;

  // 1. Recoil timer & control update
  if (next.recoilTimer > 0) {
    next.recoilTimer -= deltaMs;
    next.vx = next.recoilVx;
    next.recoilVx *= PHYSICS.WALL_RECOIL_DRAG_X;

    // Early recoil cancel if steering in recoil direction
    if (next.recoilVx > 0 && input.right) {
      next.recoilTimer = 0;
      next.vx = PHYSICS.HERO_SPEED_X * mult;
    } else if (next.recoilVx < 0 && input.left) {
      next.recoilTimer = 0;
      next.vx = -PHYSICS.HERO_SPEED_X * mult;
    }

    next.animState = 'jump';
    next.flipX = next.recoilVx < 0;
  } else {
    // Normal directional controls
    if (input.left) {
      next.vx = -PHYSICS.HERO_SPEED_X * mult;
      next.flipX = true;
      if (next.touchingGround) {
        next.animState = 'left';
      }
    } else if (input.right) {
      next.vx = PHYSICS.HERO_SPEED_X * mult;
      next.flipX = false;
      if (next.touchingGround) {
        next.animState = 'right';
      }
    } else {
      if (next.touchingGround) {
        next.vx = 0;
        next.animState = 'idle';
      } else {
        next.vx *= PHYSICS.AIR_DRAG_X;
      }
    }

    // Jump
    if (input.jump && next.touchingGround) {
      next.vy = PHYSICS.HERO_JUMP_V0 * next.upsideDown;
      next.touchingGround = false;
      next.animState = 'jump';
    }
  }

  if (!next.touchingGround) {
    next.animState = 'jump';
  }

  // 2. Physics integration
  const dt = deltaMs / 1000;
  const gravity = (world.gravityY ?? PHYSICS.GRAVITY_Y) * next.upsideDown;
  next.vy += gravity * dt;

  let newX = next.x + next.vx * dt;
  let newY = next.y + next.vy * dt;

  // 3. Scene Boundary collisions (walls and ceiling)
  const halfW = PHYSICS.HERO_WIDTH / 2;
  const halfH = PHYSICS.HERO_HEIGHT / 2;

  // Left wall (x = 0)
  if (newX - halfW <= 0) {
    newX = halfW;
    if (world.bounceWalls !== false) {
      if (next.recoilVx <= 0) {
        next.recoilVx = PHYSICS.WALL_RECOIL_VX * mult;
        next.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
        if (next.touchingGround) {
          next.vy = PHYSICS.WALL_RECOIL_VY_JUMP * next.upsideDown;
        } else if (next.vy * next.upsideDown > -50) {
          next.vy = PHYSICS.WALL_RECOIL_VY * next.upsideDown;
        }
      }
    } else {
      next.vx = 0;
    }
  }

  // Right wall (x = world.width)
  if (newX + halfW >= world.width) {
    newX = world.width - halfW;
    if (world.bounceWalls !== false) {
      if (next.recoilVx >= 0) {
        next.recoilVx = -PHYSICS.WALL_RECOIL_VX * mult;
        next.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
        if (next.touchingGround) {
          next.vy = PHYSICS.WALL_RECOIL_VY_JUMP * next.upsideDown;
        } else if (next.vy * next.upsideDown > -50) {
          next.vy = PHYSICS.WALL_RECOIL_VY * next.upsideDown;
        }
      }
    } else {
      next.vx = 0;
    }
  }

  // Ceiling (y = 0)
  if (newY - halfH <= 0) {
    newY = halfH;
    if (next.upsideDown === 1 && next.vy < 50) {
      next.vy = PHYSICS.CEILING_BOUNCE_VY;
    } else if (next.upsideDown === -1 && next.vy > -50) {
      next.vy = -PHYSICS.CEILING_BOUNCE_VY;
    }
  }

  // 4. Platform landing & ground check
  let landed = false;
  if (next.upsideDown === 1) {
    const prevBottom = hero.y + halfH;
    const nextBottom = newY + halfH;

    for (const p of world.platforms) {
      // Horizontal overlap check with body width
      const heroLeft = newX - halfW;
      const heroRight = newX + halfW;
      const pLeft = p.x;
      const pRight = p.x + p.width;

      if (heroRight > pLeft && heroLeft < pRight) {
        // Landing from above or already standing
        if (next.vy >= 0 && prevBottom <= p.y + 12 && nextBottom >= p.y - 2) {
          newY = p.y - halfH;
          next.vy = 0;
          landed = true;
          break;
        }
      }
    }
  }

  next.x = newX;
  next.y = newY;
  next.touchingGround = landed;

  return next;
}

/**
 * Checks if hero is safely grounded on a specific platform.
 */
export function isHeroOnPlatform(hero: SimHeroState, platform: Platform): boolean {
  if (!hero.touchingGround) return false;
  const halfW = PHYSICS.HERO_WIDTH / 2;
  const halfH = PHYSICS.HERO_HEIGHT / 2;
  const onY = Math.abs(hero.y + halfH - platform.y) < 3;
  const onX = hero.x + halfW > platform.x && hero.x - halfW < platform.x + platform.width;
  return onY && onX;
}

/**
 * Simulates a single leg transition from current platform to target platform.
 */
export function simulatePlatformTransition(
  startState: SimHeroState,
  fromPlatform: Platform,
  toPlatform: Platform,
  world: SimWorld,
  maxSteps = 600
): { success: boolean; history: SimHeroState[]; finalState: SimHeroState } {
  let current = { ...startState };
  const history: SimHeroState[] = [current];

  // Target landing center
  const targetCenterX = toPlatform.x + toPlatform.width / 2;
  const isTargetRight = targetCenterX > current.x;

  let jumped = false;
  let settled = false;

  for (let step = 0; step < maxSteps; step++) {
    const input: SimInput = { left: false, right: false, jump: false };
    const halfW = PHYSICS.HERO_WIDTH / 2;

    if (!jumped) {
      // Phase 1: Move towards edge and trigger jump
      if (isTargetRight) {
        input.right = true;
        // Jump when approaching the right edge of fromPlatform or already past it
        const jumpTriggerX = fromPlatform.x + fromPlatform.width - halfW - 10;
        if (current.x >= jumpTriggerX || current.x >= targetCenterX - 20) {
          input.jump = true;
          jumped = true;
        }
      } else {
        input.left = true;
        // Jump when approaching the left edge of fromPlatform
        const jumpTriggerX = fromPlatform.x + halfW + 10;
        if (current.x <= jumpTriggerX || current.x <= targetCenterX + 20) {
          input.jump = true;
          jumped = true;
        }
      }
    } else {
      // Phase 2: In-flight steering towards target
      if (current.touchingGround && isHeroOnPlatform(current, toPlatform)) {
        // Landed on target platform! Settle towards its center
        const distToCenter = targetCenterX - current.x;
        if (Math.abs(distToCenter) > 25) {
          if (distToCenter > 0) input.right = true;
          else input.left = true;
        } else {
          settled = true;
        }
      } else {
        // In air: steer towards target
        const dist = targetCenterX - current.x;
        // If we are over the target platform and moving fast, brake
        const overTarget =
          current.x >= toPlatform.x && current.x <= toPlatform.x + toPlatform.width;
        if (overTarget) {
          if (dist > 10) input.right = true;
          else if (dist < -10) input.left = true;
        } else {
          if (dist > 5) input.right = true;
          else if (dist < -5) input.left = true;
        }
      }
    }

    current = stepSimulation(current, input, world);
    history.push(current);

    if (settled && current.touchingGround && isHeroOnPlatform(current, toPlatform)) {
      return { success: true, history, finalState: current };
    }

    // Abort if hero falls below screen or dies in spikes
    if (current.y > world.height + 50) {
      return { success: false, history, finalState: current };
    }
  }

  const success = isHeroOnPlatform(current, toPlatform);
  return { success, history, finalState: current };
}

/**
 * Simulates a full level playthrough from player start to the door across a DAG sequence of platforms.
 */
export function simulateFullLevel(
  world: SimWorld,
  startPos: { x: number; y: number },
  door: Door,
  platformPath: Platform[],
  velocityMultiplier = 1
): SimulationResult {
  let hero = createInitialHeroState(startPos.x, startPos.y, velocityMultiplier);

  const allStates: SimHeroState[] = [hero];
  let success = true;
  let failureReason: string | undefined;

  // Traverse through each platform leg in the planned path
  for (let i = 1; i < platformPath.length; i++) {
    const currentPlatform = platformPath[i - 1];
    const targetPlatform = platformPath[i];

    const legResult = simulatePlatformTransition(hero, currentPlatform, targetPlatform, world);
    if (!legResult.success) {
      success = false;
      failureReason = `Failed to transition from platform #${i - 1} to platform #${i}`;
      allStates.push(...legResult.history.slice(1));
      hero = legResult.finalState;
      break;
    }

    allStates.push(...legResult.history.slice(1));
    hero = legResult.finalState;
  }

  // Final step: Move to door if not already there
  if (success) {
    const doorTargetX = door.x;
    for (let step = 0; step < 120; step++) {
      const dist = doorTargetX - hero.x;
      if (Math.abs(dist) < 15) {
        break;
      }
      const input: SimInput = { left: dist < 0, right: dist > 0, jump: false };
      hero = stepSimulation(hero, input, world);
      allStates.push(hero);
    }
  }

  // Convert states to GhostFrames and path points
  const frames: GhostFrame[] = allStates.map((s) => ({
    timeMs: Math.round(s.timeMs),
    x: Math.round(s.x),
    y: Math.round(s.y),
    flipX: s.flipX,
    animState: s.animState
  }));

  const path: TrajectoryPoint[] = allStates
    .filter((_, idx) => idx % 6 === 0 || idx === allStates.length - 1)
    .map((s) => ({
      x: Math.round(s.x),
      y: Math.round(s.y),
      t: Math.round(s.timeMs)
    }));

  const totalTimeMs = Math.round(hero.timeMs);
  const authorGhost = compressTrajectory(frames);

  return {
    success,
    totalTimeMs,
    frames,
    path,
    authorGhost,
    authorTime: totalTimeMs,
    failureReason,
    finalHeroState: hero
  };
}
