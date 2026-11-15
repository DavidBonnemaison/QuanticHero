import { calculateCollapse } from '../mechanics/quantumMechanics';
import { PHYSICS } from '../physics/constants';
import { type GhostFrame, compressTrajectory } from '../tools/GhostRecorder';
import type {
  CollapseConfig,
  Door,
  Gate,
  Particle,
  Platform,
  PressurePlate,
  Spike
} from '../types';

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
  currentPhase?: 'cyan' | 'magenta';
  gravityMultiplier?: number;
  tunnelCharges?: number;
  isPauliCharged?: boolean;
  hasClone?: boolean;
  timeDilationUntilMs?: number;
  collapseOffsetY?: number;
  activeGates?: string[];
  triggeredPlates?: string[];
  collectedParticleIndices?: number[];
  decayContactTime?: Record<number, number>;
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
  particles?: Particle[];
  gates?: Gate[];
  pressurePlates?: PressurePlate[];
  collapse?: CollapseConfig;
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
    animState: 'idle',
    currentPhase: 'cyan',
    gravityMultiplier: 1,
    activeGates: [],
    triggeredPlates: [],
    isPauliCharged: false,
    collectedParticleIndices: [],
    decayContactTime: {}
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
    const isHighSpeed = Math.abs(next.vx) > PHYSICS.HERO_SPEED_X * mult;
    if (input.left) {
      if (next.touchingGround || !isHighSpeed) {
        next.vx = -PHYSICS.HERO_SPEED_X * mult;
      }
      next.flipX = true;
      if (next.touchingGround) {
        next.animState = 'left';
      }
    } else if (input.right) {
      if (next.touchingGround || !isHighSpeed) {
        next.vx = PHYSICS.HERO_SPEED_X * mult;
      }
      next.flipX = false;
      if (next.touchingGround) {
        next.animState = 'right';
      }
    } else {
      if (next.touchingGround) {
        next.vx = 0;
        next.animState = 'idle';
      } else {
        const drag = isHighSpeed ? 0.996 : PHYSICS.AIR_DRAG_X;
        next.vx *= drag;
      }
    }

    // Jump
    if (input.jump && next.touchingGround) {
      next.vy = PHYSICS.HERO_JUMP_V0 * next.upsideDown;
      next.touchingGround = false;
      next.animState = 'jump';

      // Phase Shift on jump if world has phase-enabled platforms
      if (world.platforms.some((p) => Boolean(p.phase))) {
        next.currentPhase = next.currentPhase === 'cyan' ? 'magenta' : 'cyan';
      }
    }
  }

  if (!next.touchingGround) {
    next.animState = 'jump';
  }

  // 2. Physics integration
  const dt = deltaMs / 1000;
  const gravityMultiplier = next.gravityMultiplier ?? 1;
  const gravity = (world.gravityY ?? PHYSICS.GRAVITY_Y) * gravityMultiplier * next.upsideDown;
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

  // Neon internal bounce walls (kind === 'wall')
  for (const p of world.platforms) {
    if (p.kind === 'wall') {
      const vOverlap = newY + halfH > p.y && newY - halfH < p.y + p.height;
      if (vOverlap) {
        const hOverlap = newX + halfW >= p.x && newX - halfW <= p.x + p.width;
        if (hOverlap) {
          const wallCenterX = p.x + p.width / 2;
          if (hero.x < wallCenterX) {
            newX = p.x - halfW;
            next.recoilVx = -PHYSICS.WALL_RECOIL_VX * mult;
            next.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
            next.vy = -400 * next.upsideDown;
          } else {
            newX = p.x + p.width + halfW;
            next.recoilVx = PHYSICS.WALL_RECOIL_VX * mult;
            next.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
            next.vy = -400 * next.upsideDown;
          }
        }
      }
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

  // 4. In-flight airborne particle collection
  if (world.particles && world.particles.length > 0) {
    const collected = new Set(next.collectedParticleIndices ?? []);
    for (let i = 0; i < world.particles.length; i++) {
      if (collected.has(i)) continue;
      const part = world.particles[i];
      const distX = Math.abs(newX - part.x);
      const distY = Math.abs(newY - part.y);

      if (distX < halfW + 18 && distY < halfH + 18) {
        collected.add(i);
        next.collectedParticleIndices = Array.from(collected);

        if (part.type === 'speed') {
          next.velocityMultiplier = PHYSICS.HERO_SPEED_BOOST;
        } else if (part.type === 'lowGravity') {
          next.gravityMultiplier = 0.5;
        } else if (part.type === 'antiGravity') {
          next.upsideDown = -next.upsideDown;
        } else if (part.type === 'tunnel') {
          next.tunnelCharges = 1;
        } else if (part.type === 'pauli') {
          next.isPauliCharged = true;
        } else if (part.type === 'duplicate') {
          next.hasClone = true;
        } else if (part.type === 'timeDilation') {
          next.timeDilationUntilMs = next.timeMs + 5000;
        }
      }
    }
  }

  // Update gravitational collapse offset (slowed during time dilation)
  if (world.collapse) {
    const timeDilationFactor =
      next.timeDilationUntilMs && next.timeMs < next.timeDilationUntilMs ? 0.25 : 1.0;
    const { active, stepY } = calculateCollapse(
      world.collapse,
      next.timeMs,
      deltaMs,
      timeDilationFactor
    );
    if (active && stepY > 0) {
      next.collapseOffsetY = (next.collapseOffsetY ?? 0) + stepY;
    }
  }

  // 5. Quantum Tunneling obstacle check
  if (next.tunnelCharges && next.tunnelCharges > 0) {
    for (const p of world.platforms) {
      if (p.width <= 80 && p.height >= 30) {
        const vOverlap = newY + halfH > p.y && newY - halfH < p.y + p.height;
        if (vOverlap) {
          if (next.vx > 0 && newX + halfW >= p.x && newX - halfW <= p.x + p.width) {
            newX = p.x + p.width + halfW + 6;
            next.tunnelCharges--;
            break;
          }
          if (next.vx < 0 && newX - halfW <= p.x + p.width && newX + halfW >= p.x) {
            newX = p.x - halfW - 6;
            next.tunnelCharges--;
            break;
          }
        }
      }
    }
  }

  // 5b. Pressure plates detection (supports requireLock when no clone is holding the plate)
  if (world.pressurePlates && world.pressurePlates.length > 0) {
    for (const pl of world.pressurePlates) {
      const heroLeft = newX - halfW;
      const heroRight = newX + halfW;
      const heroTop = newY - halfH;
      const heroBottom = newY + halfH;
      const isOnPlate =
        heroRight > pl.x &&
        heroLeft < pl.x + pl.width &&
        heroBottom >= pl.y - 8 &&
        heroTop <= pl.y + pl.height + 8;

      if (isOnPlate) {
        if (!next.activeGates?.includes(pl.targetGateId)) {
          next.activeGates = [...(next.activeGates ?? []), pl.targetGateId];
        }
        if (!next.triggeredPlates?.includes(pl.id)) {
          next.triggeredPlates = [...(next.triggeredPlates ?? []), pl.id];
        }
      } else if (pl.requireLock && !next.hasClone) {
        next.activeGates = (next.activeGates ?? []).filter((id) => id !== pl.targetGateId);
      }
    }
  }

  // 5c. Gates barrier collision (solid if not unlocked)
  if (world.gates && world.gates.length > 0) {
    for (const g of world.gates) {
      if (next.activeGates?.includes(g.id)) continue;
      const vOverlap = newY + halfH > g.y && newY - halfH < g.y + g.height;
      if (vOverlap) {
        const hOverlap = newX + halfW >= g.x && newX - halfW <= g.x + g.width;
        if (hOverlap) {
          if (hero.x < g.x + g.width / 2) {
            newX = g.x - halfW;
            next.vx = 0;
          } else {
            newX = g.x + g.width + halfW;
            next.vx = 0;
          }
        }
      }
    }
  }

  // 5d. Solid platform horizontal wall collision (e.g. ceiling-to-floor tunneling barriers)
  for (let idx = 0; idx < world.platforms.length; idx++) {
    const p = world.platforms[idx];
    if (p.kind === 'wall' || p.height < 60) continue;
    if (p.phase && next.currentPhase && p.phase !== next.currentPhase) continue;
    if (p.decayMs && p.decayMs > 0 && next.decayContactTime?.[idx] !== undefined) {
      if (next.timeMs - next.decayContactTime[idx] >= p.decayMs) continue;
    }
    const vOverlap = newY + halfH > p.y + 8 && newY - halfH < p.y + p.height - 8;
    if (vOverlap) {
      const hOverlap = newX + halfW > p.x && newX - halfW < p.x + p.width;
      if (hOverlap) {
        if (hero.x < p.x + p.width / 2) {
          newX = p.x - halfW;
          next.vx = 0;
        } else {
          newX = p.x + p.width + halfW;
          next.vx = 0;
        }
      }
    }
  }

  // 6. Platform landing & ground check
  let landed = false;
  if (next.upsideDown === 1) {
    const prevBottom = hero.y + halfH;
    const nextBottom = newY + halfH;

    for (let idx = 0; idx < world.platforms.length; idx++) {
      const p = world.platforms[idx];
      if (p.kind === 'wall') continue;

      // Phase Shift filter: non-active phase platforms are intangible
      if (p.phase && next.currentPhase && p.phase !== next.currentPhase) {
        continue;
      }

      // Half-life decay filter: platform collapsed after decayMs
      if (p.decayMs && p.decayMs > 0 && next.decayContactTime?.[idx] !== undefined) {
        const contactDuration = next.timeMs - next.decayContactTime[idx];
        if (contactDuration >= p.decayMs) {
          continue;
        }
      }

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

          // Record initial contact for decay platforms
          if (p.decayMs && p.decayMs > 0 && next.decayContactTime?.[idx] === undefined) {
            next.decayContactTime = {
              ...(next.decayContactTime ?? {}),
              [idx]: next.timeMs
            };
          }
          break;
        }
      }
    }
  } else {
    // upsideDown === -1: hero stands against underside of platform
    const prevTop = hero.y - halfH;
    const nextTop = newY - halfH;

    for (let idx = 0; idx < world.platforms.length; idx++) {
      const p = world.platforms[idx];
      if (p.kind === 'wall') continue;

      if (p.phase && next.currentPhase && p.phase !== next.currentPhase) {
        continue;
      }

      if (p.decayMs && p.decayMs > 0 && next.decayContactTime?.[idx] !== undefined) {
        const contactDuration = next.timeMs - next.decayContactTime[idx];
        if (contactDuration >= p.decayMs) {
          continue;
        }
      }

      const heroLeft = newX - halfW;
      const heroRight = newX + halfW;
      const pLeft = p.x;
      const pRight = p.x + p.width;

      if (heroRight > pLeft && heroLeft < pRight) {
        const pBottom = p.y + p.height;
        if (next.vy <= 0 && prevTop >= pBottom - 12 && nextTop <= pBottom + 2) {
          newY = pBottom + halfH;
          next.vy = 0;
          landed = true;
          if (p.decayMs && p.decayMs > 0 && next.decayContactTime?.[idx] === undefined) {
            next.decayContactTime = {
              ...(next.decayContactTime ?? {}),
              [idx]: next.timeMs
            };
          }
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
  const onY =
    hero.upsideDown === 1
      ? Math.abs(hero.y + halfH - platform.y) < 4
      : Math.abs(hero.y - halfH - (platform.y + platform.height)) < 4;
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
  const horizontalGap = isTargetRight
    ? toPlatform.x - (fromPlatform.x + fromPlatform.width)
    : fromPlatform.x - (toPlatform.x + toPlatform.width);
  let usedPauliChasm = false;

  const hasBounceWall = world.platforms.some((p) => p.kind === 'wall');
  const needsWallBounce = hasBounceWall && fromPlatform.y - toPlatform.y > 135;
  let wallBounced = false;
  let jumped = false;
  let settled = false;

  for (let step = 0; step < maxSteps; step++) {
    const input: SimInput = { left: false, right: false, jump: false };
    const halfW = PHYSICS.HERO_WIDTH / 2;
    const halfH = PHYSICS.HERO_HEIGHT / 2;

    if (current.recoilTimer > 0) {
      wallBounced = true;
    }

    if (!jumped) {
      // Phase 1: Move towards edge and trigger jump
      if (isTargetRight) {
        input.right = true;
        // Jump when approaching the right edge of fromPlatform or already past it
        const jumpTriggerX = fromPlatform.x + fromPlatform.width - halfW - 10;
        const pastEdge = current.x >= fromPlatform.x + fromPlatform.width - 4;
        if (
          (current.touchingGround &&
            (current.x >= jumpTriggerX || current.x >= targetCenterX - 20)) ||
          pastEdge
        ) {
          input.jump = true;
          jumped = true;
          if (horizontalGap > 350 && current.isPauliCharged && current.hasClone) {
            usedPauliChasm = true;
            current.touchingGround = false;
            current.vx = 580;
            current.vy = -600;
            input.jump = false;
            input.right = false;
          }
        }
      } else {
        input.left = true;
        // Jump when approaching the left edge of fromPlatform
        const jumpTriggerX = fromPlatform.x + halfW + 10;
        const pastEdge = current.x <= fromPlatform.x + 4;
        if (
          (current.touchingGround &&
            (current.x <= jumpTriggerX || current.x <= targetCenterX + 20)) ||
          pastEdge
        ) {
          input.jump = true;
          jumped = true;
          if (horizontalGap > 350 && current.isPauliCharged && current.hasClone) {
            usedPauliChasm = true;
            current.touchingGround = false;
            current.vx = -580;
            current.vy = -600;
            input.jump = false;
            input.left = false;
          }
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
      } else if (usedPauliChasm && !current.touchingGround) {
        // Ballistic Pauli arc: do not steer with arrow keys, let momentum carry hero across the chasm
        input.right = false;
        input.left = false;
      } else if (needsWallBounce && !wallBounced) {
        // Keep steering into the vertical wall to trigger the neon wall-jump
        if (isTargetRight) input.right = true;
        else input.left = true;
      } else {
        // In air: steer towards target
        const dist = targetCenterX - current.x;
        // If we are over the target platform and moving fast, brake
        const overTarget =
          current.x + halfW > toPlatform.x && current.x - halfW < toPlatform.x + toPlatform.width;
        if (overTarget) {
          const margin = needsWallBounce ? Math.max(38, toPlatform.width / 2) : 10;
          if (dist > margin) input.right = true;
          else if (dist < -margin) input.left = true;
        } else {
          if (dist > 5) input.right = true;
          else if (dist < -5) input.left = true;
        }
      }
    }

    // Reflexively jump over any spike directly ahead on the current platform
    if (current.touchingGround && world.spikes && world.spikes.length > 0) {
      const dir = input.right ? 1 : input.left ? -1 : 0;
      if (dir !== 0) {
        const spikeAhead = world.spikes.some((s) => {
          const sw = s.width ?? 32;
          const sh = s.height ?? 32;
          const vertOverlap = s.y < current.y + halfH && s.y + sh > current.y - halfH;
          if (!vertOverlap) return false;
          if (dir > 0) {
            const dist = s.x - (current.x + halfW);
            return dist > 0 && dist < 52;
          }
          const dist = current.x - halfW - (s.x + sw);
          return dist > 0 && dist < 52;
        });
        if (spikeAhead) {
          input.jump = true;
        }
      }
    }

    current = stepSimulation(current, input, world);
    history.push(current);

    if (settled && current.touchingGround && isHeroOnPlatform(current, toPlatform)) {
      return { success: true, history, finalState: current };
    }

    // Abort if hero falls below screen or dies in spikes/collapse
    if (current.y > world.height + 50) {
      return { success: false, history, finalState: current };
    }

    if (world.collapse) {
      const topSpikeBottom = 280 + (current.collapseOffsetY ?? 0);
      const bottomSpikeTop = world.height - 140 - (current.collapseOffsetY ?? 0);
      if (current.y - halfH <= topSpikeBottom || current.y + halfH >= bottomSpikeTop) {
        return { success: false, history, finalState: current };
      }
    }

    if (world.spikes && world.spikes.length > 0) {
      for (const s of world.spikes) {
        const sw = s.width ?? 32;
        const sh = s.height ?? 32;
        if (
          current.x + halfW > s.x &&
          current.x - halfW < s.x + sw &&
          current.y + halfH > s.y &&
          current.y - halfH < s.y + sh
        ) {
          return { success: false, history, finalState: current };
        }
      }
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
    const halfH = PHYSICS.HERO_HEIGHT / 2;
    for (let step = 0; step < 120; step++) {
      const dist = doorTargetX - hero.x;
      if (Math.abs(dist) < 15) {
        break;
      }
      const input: SimInput = { left: dist < 0, right: dist > 0, jump: false };
      hero = stepSimulation(hero, input, world);
      allStates.push(hero);

      if (world.collapse) {
        const topSpikeBottom = 280 + (hero.collapseOffsetY ?? 0);
        const bottomSpikeTop = world.height - 140 - (hero.collapseOffsetY ?? 0);
        if (hero.y - halfH <= topSpikeBottom || hero.y + halfH >= bottomSpikeTop) {
          success = false;
          failureReason = 'Crushed by gravitational collapse before reaching door';
          break;
        }
      }
    }
    if (success && Math.abs(doorTargetX - hero.x) >= 20) {
      success = false;
      failureReason = 'Blocked before reaching door';
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
