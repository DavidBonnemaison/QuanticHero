import {
  type DecayPlatformState,
  calculateCollapse,
  checkPauliRepulsion,
  checkTunnelObstacle,
  updateDecayPlatform
} from '../mechanics/quantumMechanics';
import { PHYSICS } from '../physics/constants';
import {
  type MovingPlatformSimState,
  applyLowGravity,
  clampFallVelocity,
  createMovingPlatformState,
  getAsymmetricGravityMultiplier,
  getCollapseBounds,
  isHeroOnPressurePlate,
  stepHeroControl,
  stepMovingPlatform
} from '../physics/stepHeroPhysics';
import { type GhostFrame, compressTrajectory, decompressTrajectory } from '../tools/GhostRecorder';
import type {
  CollapseConfig,
  Door,
  Gate,
  LevelData,
  Particle,
  Platform,
  PressurePlate,
  Spike,
  Wormhole
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
  decayStates?: Record<number, DecayPlatformState>;
  movingPlatforms?: Record<number, MovingPlatformSimState>;
  pauliGraceUntil?: number;
  groundedPlatformIndex?: number;
  lastGroundedTimeMs?: number;
  lastJumpPressedTimeMs?: number;
  hasJumpedSinceGrounded?: boolean;
  prevJumpPressed?: boolean;
  jumpCutApplied?: boolean;
  isDiving?: boolean;
  lastDiveEndTimeMs?: number;
  waveDashUntilMs?: number;
}

export interface SimInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  dive?: boolean;
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
  wormholes?: Wormhole[];
  screenWrap?: boolean | 'horizontal' | 'vertical' | 'both';
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
    pauliGraceUntil: 0,
    collectedParticleIndices: [],
    decayStates: {},
    movingPlatforms: {}
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
  const timeDilationFactor =
    next.timeDilationUntilMs && next.timeMs < next.timeDilationUntilMs ? 0.25 : 1.0;

  // 0a. Step moving platforms
  const nextMovingPlatforms: Record<number, MovingPlatformSimState> = {
    ...(hero.movingPlatforms ?? {})
  };
  for (let idx = 0; idx < world.platforms.length; idx++) {
    const p = world.platforms[idx];
    if (p.movesTo) {
      const prevMp = nextMovingPlatforms[idx] ?? createMovingPlatformState(p, idx);
      nextMovingPlatforms[idx] = stepMovingPlatform(prevMp, deltaMs, timeDilationFactor);
    }
  }
  next.movingPlatforms = nextMovingPlatforms;

  // 0b. Step radioactive decay platforms via shared updateDecayPlatform
  const nextDecayStates: Record<number, DecayPlatformState> = {};
  if (hero.decayStates) {
    for (const [key, st] of Object.entries(hero.decayStates)) {
      nextDecayStates[Number(key)] = { ...st };
    }
  }
  for (let idx = 0; idx < world.platforms.length; idx++) {
    const p = world.platforms[idx];
    if (p.decayMs && p.decayMs > 0) {
      const ds: DecayPlatformState = nextDecayStates[idx] ?? {
        timerMs: 0,
        decayMs: p.decayMs,
        triggered: false,
        collapsed: false,
        respawnTimerMs: 0
      };
      updateDecayPlatform(ds, deltaMs, timeDilationFactor);
      nextDecayStates[idx] = ds;
    }
  }
  next.decayStates = nextDecayStates;

  const getEffectivePlatform = (p: Platform, idx: number): Platform => {
    const mp = nextMovingPlatforms[idx];
    return mp ? { ...p, x: mp.x, y: mp.y } : p;
  };

  // 1. Recoil timer & control update (shared framerate-independent physics core)
  if (next.touchingGround) {
    next.lastGroundedTimeMs = next.timeMs;
    next.hasJumpedSinceGrounded = false;
    next.jumpCutApplied = false;
    if (next.isDiving) {
      next.isDiving = false;
      next.lastDiveEndTimeMs = next.timeMs;
    }
  }

  const ctrl = stepHeroControl(
    {
      vx: next.vx,
      vy: next.vy,
      touchingGround: next.touchingGround,
      recoilTimer: next.recoilTimer,
      recoilVx: next.recoilVx,
      velocityMultiplier: mult,
      upsideDown: next.upsideDown,
      flipX: next.flipX,
      animState: next.animState,
      isActive: true,
      nowMs: next.timeMs,
      lastGroundedTimeMs: next.lastGroundedTimeMs,
      lastJumpPressedTimeMs: next.lastJumpPressedTimeMs,
      hasJumpedSinceGrounded: next.hasJumpedSinceGrounded,
      prevJumpPressed: next.prevJumpPressed,
      jumpCutApplied: next.jumpCutApplied,
      isDiving: next.isDiving,
      lastDiveEndTimeMs: next.lastDiveEndTimeMs,
      waveDashUntilMs: next.waveDashUntilMs
    },
    input,
    deltaMs
  );
  next.vx = ctrl.vx;
  next.vy = ctrl.vy;
  next.recoilTimer = ctrl.recoilTimer;
  next.recoilVx = ctrl.recoilVx;
  next.flipX = ctrl.flipX;
  next.animState = ctrl.animState;

  if (ctrl.jumped) {
    next.touchingGround = false;
    next.hasJumpedSinceGrounded = true;
    next.jumpCutApplied = false;
    next.lastJumpPressedTimeMs = Number.NEGATIVE_INFINITY;
    next.lastGroundedTimeMs = Number.NEGATIVE_INFINITY;
    next.isDiving = false;
    if (ctrl.waveDashed) {
      next.waveDashUntilMs = next.timeMs + PHYSICS.WAVE_DASH_DURATION_MS;
      next.lastDiveEndTimeMs = Number.NEGATIVE_INFINITY;
    }
    if (world.platforms.some((p) => Boolean(p.phase))) {
      next.currentPhase = next.currentPhase === 'cyan' ? 'magenta' : 'cyan';
    }
  } else {
    if (ctrl.dived) {
      next.isDiving = true;
    }
    if (ctrl.jumpCut) {
      next.jumpCutApplied = true;
    }
    const jumpJustPressed = input.jump && !(next.prevJumpPressed ?? false);
    if (!next.touchingGround && jumpJustPressed) {
      next.lastJumpPressedTimeMs = next.timeMs;
    }
  }
  next.prevJumpPressed = input.jump;

  // 2. Physics integration (asymmetric gravity + apex hang-time + terminal velocity)
  const dt = deltaMs / 1000;
  const gravityMultiplier = next.gravityMultiplier ?? 1;
  const asymFactor = getAsymmetricGravityMultiplier(next.vy, next.upsideDown, next.touchingGround);
  const gravity =
    (world.gravityY ?? PHYSICS.GRAVITY_Y) * gravityMultiplier * asymFactor * next.upsideDown;
  next.vy = clampFallVelocity(next.vy + gravity * dt, next.upsideDown, Boolean(next.isDiving));

  let carryDx = 0;
  if (hero.touchingGround && hero.groundedPlatformIndex !== undefined) {
    const groundedMp = nextMovingPlatforms[hero.groundedPlatformIndex];
    if (groundedMp) {
      carryDx = groundedMp.dx;
    }
  }

  let newX = next.x + next.vx * dt + carryDx;
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
          next.gravityMultiplier = applyLowGravity(next.gravityMultiplier ?? 1);
        } else if (part.type === 'antiGravity') {
          next.upsideDown = -next.upsideDown;
        } else if (part.type === 'tunnel') {
          next.tunnelCharges = 1;
        } else if (part.type === 'pauli') {
          next.isPauliCharged = true;
          next.pauliGraceUntil = next.timeMs + 500;
        } else if (part.type === 'duplicate') {
          next.hasClone = true;
        } else if (part.type === 'timeDilation') {
          next.timeDilationUntilMs = next.timeMs + PHYSICS.TIME_DILATION_DURATION_MS;
        }
      }
    }
  }

  // Update gravitational collapse offset (slowed during time dilation)
  if (world.collapse) {
    const activeDilation =
      next.timeDilationUntilMs && next.timeMs < next.timeDilationUntilMs ? 0.25 : 1.0;
    const { active, stepY } = calculateCollapse(
      world.collapse,
      next.timeMs,
      deltaMs,
      activeDilation
    );
    if (active && stepY > 0) {
      next.collapseOffsetY = (next.collapseOffsetY ?? 0) + stepY;
    }
  }

  // 5. Quantum Tunneling obstacle check (shared checkTunnelObstacle)
  let tunneledPlatformIdx = -1;
  if (next.tunnelCharges && next.tunnelCharges > 0) {
    const dir = input.left
      ? 'left'
      : input.right
        ? 'right'
        : next.vx > 0
          ? 'right'
          : next.vx < 0
            ? 'left'
            : null;
    if (dir) {
      for (let idx = 0; idx < world.platforms.length; idx++) {
        const effP = getEffectivePlatform(world.platforms[idx], idx);
        const result = checkTunnelObstacle(newX, newY, 40, 40, dir, effP);
        if (result?.canTunnel) {
          newX = result.exitX;
          next.tunnelCharges--;
          tunneledPlatformIdx = idx;
          break;
        }
      }
    }
  }

  // 5b. Pressure plates detection (shared 16x20 hitbox via isHeroOnPressurePlate)
  if (world.pressurePlates && world.pressurePlates.length > 0) {
    for (const pl of world.pressurePlates) {
      const isOnPlate = isHeroOnPressurePlate(newX, newY, pl);

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
    if (idx === tunneledPlatformIdx) continue;
    const p = getEffectivePlatform(world.platforms[idx], idx);
    if (p.kind === 'wall' || p.height < 60) continue;
    if (p.phase && next.currentPhase && p.phase !== next.currentPhase) continue;
    if (p.decayMs && p.decayMs > 0 && nextDecayStates[idx]?.collapsed) continue;
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
  let landedPlatformIndex: number | undefined;
  if (next.upsideDown === 1) {
    const prevBottom = hero.y + halfH;
    const nextBottom = newY + halfH;

    for (let idx = 0; idx < world.platforms.length; idx++) {
      const p = getEffectivePlatform(world.platforms[idx], idx);
      if (p.kind === 'wall') continue;

      // Phase Shift filter: non-active phase platforms are intangible
      if (p.phase && next.currentPhase && p.phase !== next.currentPhase) {
        continue;
      }

      // Half-life decay filter: platform collapsed after decayMs
      if (p.decayMs && p.decayMs > 0 && nextDecayStates[idx]?.collapsed) {
        continue;
      }

      // Horizontal overlap check with body width
      const heroLeft = newX - halfW;
      const heroRight = newX + halfW;
      const pLeft = p.x;
      const pRight = p.x + p.width;

      if (heroRight > pLeft && heroLeft < pRight) {
        // Landing from above or already standing
        const mpDy = nextMovingPlatforms[idx]?.dy ?? 0;
        if (
          next.vy >= 0 &&
          prevBottom <= p.y + 12 + Math.abs(mpDy) &&
          nextBottom >= p.y - 2 - Math.abs(mpDy)
        ) {
          newY = p.y - halfH;
          next.vy = 0;
          landed = true;
          landedPlatformIndex = idx;

          // Trigger decay platform on contact
          if (
            p.decayMs &&
            p.decayMs > 0 &&
            nextDecayStates[idx] &&
            !nextDecayStates[idx].triggered
          ) {
            nextDecayStates[idx] = { ...nextDecayStates[idx], triggered: true };
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
      const p = getEffectivePlatform(world.platforms[idx], idx);
      if (p.kind === 'wall') continue;

      if (p.phase && next.currentPhase && p.phase !== next.currentPhase) {
        continue;
      }

      if (p.decayMs && p.decayMs > 0 && nextDecayStates[idx]?.collapsed) {
        continue;
      }

      const heroLeft = newX - halfW;
      const heroRight = newX + halfW;
      const pLeft = p.x;
      const pRight = p.x + p.width;

      if (heroRight > pLeft && heroLeft < pRight) {
        const pBottom = p.y + p.height;
        const mpDy = nextMovingPlatforms[idx]?.dy ?? 0;
        if (
          next.vy <= 0 &&
          prevTop >= pBottom - 12 - Math.abs(mpDy) &&
          nextTop <= pBottom + 2 + Math.abs(mpDy)
        ) {
          newY = pBottom + halfH;
          next.vy = 0;
          landed = true;
          landedPlatformIndex = idx;
          if (
            p.decayMs &&
            p.decayMs > 0 &&
            nextDecayStates[idx] &&
            !nextDecayStates[idx].triggered
          ) {
            nextDecayStates[idx] = { ...nextDecayStates[idx], triggered: true };
          }
          break;
        }
      }
    }
  }

  next.x = newX;
  next.y = newY;
  next.touchingGround = landed;
  next.groundedPlatformIndex = landedPlatformIndex;

  return next;
}

/**
 * Checks if hero is safely grounded on a specific platform.
 */
export function isHeroOnPlatform(hero: SimHeroState, platform: Platform): boolean {
  if (!hero.touchingGround) return false;
  let effectivePlatform = platform;
  if (platform.movesTo && hero.movingPlatforms) {
    const mp = Object.values(hero.movingPlatforms).find(
      (m) => m.startX === platform.x && m.startY === platform.y
    );
    if (mp) {
      effectivePlatform = { ...platform, x: mp.x, y: mp.y };
    }
  }
  const halfW = PHYSICS.HERO_WIDTH / 2;
  const halfH = PHYSICS.HERO_HEIGHT / 2;
  const onY =
    hero.upsideDown === 1
      ? Math.abs(hero.y + halfH - effectivePlatform.y) < 4
      : Math.abs(hero.y - halfH - (effectivePlatform.y + effectivePlatform.height)) < 4;
  const onX =
    hero.x + halfW > effectivePlatform.x &&
    hero.x - halfW < effectivePlatform.x + effectivePlatform.width;
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

    const getLivePlatform = (plat: Platform): Platform => {
      if (plat.movesTo && current.movingPlatforms) {
        const mp = Object.values(current.movingPlatforms).find(
          (m) => m.startX === plat.x && m.startY === plat.y
        );
        if (mp) return { ...plat, x: mp.x, y: mp.y };
      }
      return plat;
    };
    const liveFrom = getLivePlatform(fromPlatform);
    const liveTo = getLivePlatform(toPlatform);
    const liveTargetCenterX = liveTo.x + liveTo.width / 2;

    if (current.recoilTimer > 0) {
      wallBounced = true;
    }

    if (!jumped) {
      // Phase 1: Move towards edge and trigger jump
      if (isTargetRight) {
        input.right = true;
        // Jump when approaching the right edge of fromPlatform or already past it
        const jumpTriggerX = liveFrom.x + liveFrom.width - halfW - 10;
        const pastEdge = current.x >= liveFrom.x + liveFrom.width - 4;
        if (
          (current.touchingGround &&
            (current.x >= jumpTriggerX || current.x >= liveTargetCenterX - 20)) ||
          pastEdge
        ) {
          input.jump = true;
          jumped = true;
          if (horizontalGap > 350 && current.isPauliCharged && current.hasClone) {
            const events = checkPauliRepulsion(
              [
                {
                  id: 1,
                  x: current.x,
                  y: current.y,
                  pauliGraceUntil: 0,
                  upsideDown: current.upsideDown
                },
                {
                  id: 2,
                  x: current.x - 10,
                  y: current.y,
                  pauliGraceUntil: 0,
                  upsideDown: current.upsideDown
                }
              ],
              current.timeMs
            );
            if (events.length > 0) {
              usedPauliChasm = true;
              current.touchingGround = false;
              current.vx = events[0].impulseA.vx;
              current.vy = events[0].impulseA.vy;
              current.pauliGraceUntil = events[0].newGraceUntil;
              input.jump = false;
              input.right = false;
            }
          }
        }
      } else {
        input.left = true;
        // Jump when approaching the left edge of fromPlatform
        const jumpTriggerX = liveFrom.x + halfW + 10;
        const pastEdge = current.x <= liveFrom.x + 4;
        if (
          (current.touchingGround &&
            (current.x <= jumpTriggerX || current.x <= liveTargetCenterX + 20)) ||
          pastEdge
        ) {
          input.jump = true;
          jumped = true;
          if (horizontalGap > 350 && current.isPauliCharged && current.hasClone) {
            const events = checkPauliRepulsion(
              [
                {
                  id: 1,
                  x: current.x,
                  y: current.y,
                  pauliGraceUntil: 0,
                  upsideDown: current.upsideDown
                },
                {
                  id: 2,
                  x: current.x + 10,
                  y: current.y,
                  pauliGraceUntil: 0,
                  upsideDown: current.upsideDown
                }
              ],
              current.timeMs
            );
            if (events.length > 0) {
              usedPauliChasm = true;
              current.touchingGround = false;
              current.vx = events[0].impulseA.vx;
              current.vy = events[0].impulseA.vy;
              current.pauliGraceUntil = events[0].newGraceUntil;
              input.jump = false;
              input.left = false;
            }
          }
        }
      }
    } else {
      // Phase 2: In-flight steering towards target
      if (current.touchingGround && isHeroOnPlatform(current, toPlatform)) {
        // Landed on target platform! Settle towards its center
        const distToCenter = liveTargetCenterX - current.x;
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
        const dist = liveTargetCenterX - current.x;
        // If we are over the target platform and moving fast, brake
        const overTarget =
          current.x + halfW > liveTo.x && current.x - halfW < liveTo.x + liveTo.width;
        if (overTarget) {
          const margin = needsWallBounce ? Math.max(38, liveTo.width / 2) : 10;
          if (dist > margin) input.right = true;
          else if (dist < -margin) input.left = true;
        } else {
          if (dist > 5) input.right = true;
          else if (dist < -5) input.left = true;
        }
      }
    }

    // Keep jump held while ascending so Variable Jump Cut does not shorten full bot jumps
    if (!current.touchingGround && current.vy * current.upsideDown < 0 && !usedPauliChasm) {
      input.jump = true;
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
      const { topSpikeBottom, bottomSpikeTop } = getCollapseBounds(
        world.height,
        current.collapseOffsetY ?? 0
      );
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
        const { topSpikeBottom, bottomSpikeTop } = getCollapseBounds(
          world.height,
          hero.collapseOffsetY ?? 0
        );
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

export interface GhostValidationResult {
  valid: boolean;
  frameCount: number;
  durationMs: number;
  reason?: string;
}

/**
 * Validates that a LevelData has a well-formed, decodable v1| authorGhost synchronized with authorTime.
 */
export function validateAuthorGhost(levelData: LevelData): GhostValidationResult {
  if (!levelData.authorGhost || !levelData.authorGhost.startsWith('v1|')) {
    return { valid: false, frameCount: 0, durationMs: 0, reason: 'Missing or non-v1 authorGhost' };
  }
  const frames = decompressTrajectory(levelData.authorGhost);
  if (frames.length < 2) {
    return {
      valid: false,
      frameCount: frames.length,
      durationMs: 0,
      reason: 'authorGhost has fewer than 2 frames'
    };
  }
  const durationMs = frames[frames.length - 1].timeMs;
  if (!levelData.authorTime || levelData.authorTime <= 0) {
    return {
      valid: false,
      frameCount: frames.length,
      durationMs,
      reason: 'Missing or non-positive authorTime'
    };
  }
  return {
    valid: true,
    frameCount: frames.length,
    durationMs
  };
}

/**
 * Simulates an arbitrary LevelData (campaign JSON or secret molecule) from player.position to door.
 */
export function simulateLevelData(levelData: LevelData): SimulationResult {
  const world: SimWorld = {
    width: levelData.width,
    height: levelData.height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms: levelData.platforms,
    spikes: levelData.spikes,
    particles: levelData.particles,
    gates: levelData.gates,
    pressurePlates: levelData.pressurePlates,
    collapse: levelData.collapse,
    wormholes: levelData.wormholes,
    screenWrap: levelData.screenWrap,
    bounceWalls: true
  };

  const walkable = levelData.platforms.filter(
    (p) => p.kind !== 'wall' && !(p.width <= 40 && p.height >= 100)
  );
  const startX = levelData.player.position.x;
  const startY = levelData.player.position.y;
  const doorX = levelData.door.x;
  const doorY = levelData.door.y;

  // Pick starting platform closest to player.position
  const sortedByStart = [...walkable].sort((a, b) => {
    const da = Math.hypot(startX - (a.x + a.width / 2), startY - a.y);
    const db = Math.hypot(startX - (b.x + b.width / 2), startY - b.y);
    return da - db;
  });

  const startPlat = sortedByStart[0];
  const doorPlat = [...walkable].sort((a, b) => {
    const da = Math.hypot(doorX - (a.x + a.width / 2), doorY - a.y);
    const db = Math.hypot(doorX - (b.x + b.width / 2), doorY - b.y);
    return da - db;
  })[0];

  const pathPlatforms: Platform[] = [];
  if (startPlat) {
    pathPlatforms.push(startPlat);
    const dir = doorX >= startX ? 1 : -1;
    const middle = walkable
      .filter((p) => p !== startPlat && p !== doorPlat)
      .filter((p) => {
        const cx = p.x + p.width / 2;
        return dir > 0 ? cx > startX && cx < doorX : cx < startX && cx > doorX;
      })
      .sort((a, b) => (dir > 0 ? a.x - b.x : b.x - a.x));
    pathPlatforms.push(...middle);
    if (doorPlat && doorPlat !== startPlat) {
      pathPlatforms.push(doorPlat);
    }
  }

  return simulateFullLevel(world, levelData.player.position, levelData.door, pathPlatforms);
}
