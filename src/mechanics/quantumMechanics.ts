import type { CollapseConfig, Platform, PlatformPhase } from '../types';

export interface TunnelResult {
  canTunnel: boolean;
  exitX: number;
  thickness: number;
}

/**
 * Checks whether a hero pressing against a platform can quantum-tunnel through it.
 * Condition: platform thickness in movement direction must be <= 80 px.
 */
export function checkTunnelObstacle(
  heroX: number,
  heroY: number,
  heroWidth: number,
  heroHeight: number,
  dir: 'left' | 'right',
  platform: Platform
): TunnelResult | null {
  const heroLeft = heroX - heroWidth / 2;
  const heroRight = heroX + heroWidth / 2;
  const heroTop = heroY - heroHeight / 2;
  const heroBottom = heroY + heroHeight / 2;

  const platLeft = platform.x;
  const platRight = platform.x + platform.width;
  const platTop = platform.y;
  const platBottom = platform.y + platform.height;

  // Vertical overlap verification
  const verticalOverlap = heroBottom > platTop + 2 && heroTop < platBottom - 2;
  if (!verticalOverlap) {
    return null;
  }

  const thickness = platform.width;

  if (dir === 'right') {
    // Platform is in front to the right of the hero
    const isAdjacent = platLeft >= heroLeft && platLeft <= heroRight + 16;
    if (!isAdjacent) return null;

    if (thickness <= 80) {
      return {
        canTunnel: true,
        exitX: platRight + heroWidth / 2 + 4,
        thickness
      };
    }
    return {
      canTunnel: false,
      exitX: heroX,
      thickness
    };
  }

  // dir === 'left'
  // Platform is in front to the left of the hero
  const isAdjacent = platRight <= heroRight && platRight >= heroLeft - 16;
  if (!isAdjacent) return null;

  if (thickness <= 80) {
    return {
      canTunnel: true,
      exitX: platLeft - heroWidth / 2 - 4,
      thickness
    };
  }
  return {
    canTunnel: false,
    exitX: heroX,
    thickness
  };
}

export interface PauliHeroCandidate {
  id: number;
  x: number;
  y: number;
  pauliGraceUntil?: number;
  upsideDown?: number;
}

export interface PauliRepulsionEvent {
  heroAId: number;
  heroBId: number;
  impulseA: { vx: number; vy: number };
  impulseB: { vx: number; vy: number };
  newGraceUntil: number;
}

/**
 * Evaluates Pauli Exclusion repulsion between all active hero clones.
 * Threshold: distance < 60 px.
 * Ejection impulse: +/- 450 px/s on X and -200 px/s on Y (multiplied by upsideDown).
 * Grace period: 500 ms.
 */
export function checkPauliRepulsion(
  heroes: PauliHeroCandidate[],
  currentTime: number,
  minDistance = 60,
  graceMs = 500
): PauliRepulsionEvent[] {
  const events: PauliRepulsionEvent[] = [];

  for (let i = 0; i < heroes.length; i++) {
    for (let j = i + 1; j < heroes.length; j++) {
      const heroA = heroes[i];
      const heroB = heroes[j];

      if (
        (heroA.pauliGraceUntil !== undefined && currentTime < heroA.pauliGraceUntil) ||
        (heroB.pauliGraceUntil !== undefined && currentTime < heroB.pauliGraceUntil)
      ) {
        continue;
      }

      const dx = heroB.x - heroA.x;
      const dy = heroB.y - heroA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        const signX = dx >= 0 ? 1 : -1;
        const upA = heroA.upsideDown ?? 1;
        const upB = heroB.upsideDown ?? 1;

        events.push({
          heroAId: heroA.id,
          heroBId: heroB.id,
          impulseA: {
            vx: -450 * signX,
            vy: -200 * upA
          },
          impulseB: {
            vx: 450 * signX,
            vy: -200 * upB
          },
          newGraceUntil: currentTime + graceMs
        });
      }
    }
  }

  return events;
}

/**
 * Toggles phase between cyan and magenta.
 */
export function togglePhase(currentPhase: PlatformPhase): PlatformPhase {
  return currentPhase === 'cyan' ? 'magenta' : 'cyan';
}

export interface DecayPlatformState {
  timerMs: number;
  decayMs: number;
  triggered: boolean;
  collapsed: boolean;
  respawnTimerMs?: number;
}

export interface DecayPlatformUpdate {
  collapsed: boolean;
  alpha: number;
  solid: boolean;
  shaking: boolean;
}

/**
 * Updates radioactive half-life decay platform state.
 * Under time dilation, effective timer advances at 25% speed.
 */
export function updateDecayPlatform(
  state: DecayPlatformState,
  deltaMs: number,
  timeDilationFactor = 1.0
): DecayPlatformUpdate {
  if (!state.triggered) {
    return { collapsed: false, alpha: 1.0, solid: true, shaking: false };
  }

  if (state.triggered && !state.collapsed) {
    state.timerMs += deltaMs * timeDilationFactor;
    if (state.timerMs >= state.decayMs) {
      state.collapsed = true;
      return { collapsed: true, alpha: 0, solid: false, shaking: false };
    }
    // Trembling / blinking phase
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(state.timerMs * 0.04));
    return { collapsed: false, alpha, solid: true, shaking: true };
  }

  // Already collapsed - check respawn if enabled
  if (state.respawnTimerMs !== undefined) {
    state.respawnTimerMs += deltaMs * timeDilationFactor;
    if (state.respawnTimerMs >= 2500) {
      state.collapsed = false;
      state.triggered = false;
      state.timerMs = 0;
      state.respawnTimerMs = 0;
      return { collapsed: false, alpha: 1.0, solid: true, shaking: false };
    }
  }

  return { collapsed: true, alpha: 0, solid: false, shaking: false };
}

/**
 * Calculates gravitational collapse step (narrowing spike bars).
 * Divides speed by 4 under time dilation.
 */
export function calculateCollapse(
  collapse: CollapseConfig,
  elapsedMs: number,
  deltaMs: number,
  timeDilationFactor = 1.0
): { active: boolean; stepY: number } {
  if (elapsedMs <= collapse.delayMs) {
    return { active: false, stepY: 0 };
  }
  const effectiveSpeed = collapse.speedY * timeDilationFactor;
  const stepY = effectiveSpeed * (deltaMs / 1000);
  return { active: true, stepY };
}
