import { PHYSICS } from '../physics/constants';
import type { Door, LevelData, Particle, Platform, Spike } from '../types';
import { assemblePacedLevel } from './chunkAssembler';
import { delta_y_max, isReachable, t_apex, t_land, x_reach } from './kinematics';
import { type SimulationResult, simulateFullLevel } from './simulator';

export interface GeneratorOptions {
  atom?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  seed?: number;
  width?: number;
  height?: number;
  mode?: 'dag' | 'paced';
}

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (seed ^ 0x9e3779b9) >>> 0;
    if (this.state === 0) this.state = 1;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  floatRange(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

import { getNarrativeForLevel } from '../data/cosmicNarrative';
import { SPECTROSCOPY_DATABASE, getElementSpectroscopy } from '../data/spectroscopy';

// Complete Periodic Table data derived from the 118-element spectroscopy database
export const PERIODIC_ELEMENTS: Record<
  number,
  { symbol: string; name: string; hue: string; antiHue: string }
> = Object.fromEntries(
  SPECTROSCOPY_DATABASE.map((el) => [
    el.z,
    { symbol: el.symbol, name: el.name, hue: el.hue, antiHue: el.antiHue }
  ])
);

export function getAlphaForDifficulty(
  atom: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): number {
  if (difficulty === 'easy') return 0.7;
  if (difficulty === 'medium') return 0.8;
  if (difficulty === 'hard') return 0.88;

  if (atom <= 4) return 0.7;
  if (atom <= 8) return 0.8;
  return 0.88;
}

/**
 * Checks if a candidate platform has sufficient vertical clearance from existing platforms.
 * Prevents vertical blocking where one platform is directly above another within jumping range.
 */
function hasPlatformClearance(candidate: Platform, existing: Platform[]): boolean {
  for (const p of existing) {
    const xOverlap =
      Math.min(candidate.x + candidate.width, p.x + p.width) - Math.max(candidate.x, p.x);
    if (xOverlap > 10) {
      const yDist = Math.abs(candidate.y - p.y);
      if (yDist < 140) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Solves graph of platforms using A* to find the optimal reachable sequence from start to goal.
 */
export function findPathAStar(
  platforms: Platform[],
  startIndex: number,
  goalIndex: number,
  alpha: number
): number[] | null {
  const n = platforms.length;
  const dist = new Array(n).fill(Number.POSITIVE_INFINITY);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);

  dist[startIndex] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let minF = Number.POSITIVE_INFINITY;

    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < Number.POSITIVE_INFINITY) {
        const h = Math.abs(platforms[i].y - platforms[goalIndex].y);
        const f = dist[i] + h;
        if (f < minF) {
          minF = f;
          u = i;
        }
      }
    }

    if (u === -1 || u === goalIndex) break;
    visited[u] = true;

    for (let v = 0; v < n; v++) {
      if (visited[v]) continue;
      if (isReachable(platforms[u], platforms[v], { toleranceAlpha: alpha })) {
        const cost = Math.hypot(platforms[u].x - platforms[v].x, platforms[u].y - platforms[v].y);
        if (dist[u] + cost < dist[v]) {
          dist[v] = dist[u] + cost;
          prev[v] = u;
        }
      }
    }
  }

  if (dist[goalIndex] === Number.POSITIVE_INFINITY) {
    return null;
  }

  const path: number[] = [];
  let curr = goalIndex;
  while (curr !== -1) {
    path.unshift(curr);
    curr = prev[curr];
  }
  return path;
}

/**
 * Generates platforms and validates them with the deterministic physics simulator.
 */
function attemptGeneration(
  atom: number,
  seed: number,
  difficulty: 'easy' | 'medium' | 'hard',
  width: number,
  height: number
): { levelData: LevelData; simulation: SimulationResult } | null {
  const alpha = getAlphaForDifficulty(atom, difficulty);
  const rng = new SeededRandom(seed);
  const elementInfo = getElementSpectroscopy(atom);

  const maxApex = delta_y_max(); // ~144.64 px
  const maxClimb = maxApex * alpha; // e.g. ~101 to 127 px

  // Root spawn platform
  const spawnWidth = 240;
  const spawnPlatform: Platform = {
    x: rng.range(200, 350),
    y: height - 120,
    width: spawnWidth,
    height: 20
  };

  const platforms: Platform[] = [spawnPlatform];
  const mainPathIndices: number[] = [0];

  let currentX = spawnPlatform.x;
  let currentY = spawnPlatform.y;
  let currentW = spawnPlatform.width;
  let direction = 1; // 1 = right, -1 = left

  const targetTopY = rng.range(220, 320);

  // Generate ascending platform spine
  let stepsCount = 0;
  while (currentY > targetTopY + 70 && stepsCount < 40) {
    stepsCount++;
    const climb = rng.floatRange(45, maxClimb * 0.9);
    const nextY = Math.round(currentY - climb);
    const deltaY = nextY - currentY;

    const maxReachX = x_reach(deltaY, alpha);
    const nextW = rng.range(160, 230);
    const gap = rng.floatRange(35, Math.max(45, maxReachX * 0.7));

    let nextX = direction === 1 ? currentX + currentW + gap : currentX - gap - nextW;

    const minX = 120;
    const maxX = width - 120 - nextW;

    if (nextX > maxX) {
      direction = -1;
      nextX = currentX - gap - nextW;
      if (nextX < minX) nextX = maxX;
    } else if (nextX < minX) {
      direction = 1;
      nextX = currentX + currentW + gap;
      if (nextX > maxX) nextX = minX;
    }

    const candidate: Platform = {
      x: Math.round(nextX),
      y: nextY,
      width: nextW,
      height: 20
    };

    if (hasPlatformClearance(candidate, platforms)) {
      platforms.push(candidate);
      mainPathIndices.push(platforms.length - 1);
      currentX = candidate.x;
      currentY = candidate.y;
      currentW = candidate.width;
    } else {
      // Adjust X slightly to clear vertically
      candidate.x =
        direction === 1 ? Math.min(maxX, candidate.x + 80) : Math.max(minX, candidate.x - 80);
      platforms.push(candidate);
      mainPathIndices.push(platforms.length - 1);
      currentX = candidate.x;
      currentY = candidate.y;
      currentW = candidate.width;
    }
  }

  const doorPlatformIndex = mainPathIndices[mainPathIndices.length - 1];
  const doorPlatform = platforms[doorPlatformIndex];
  const door: Door = {
    x: Math.round(doorPlatform.x + doorPlatform.width / 2),
    y: doorPlatform.y
  };

  const player = {
    position: {
      x: Math.round(spawnPlatform.x + 60),
      y: Math.round(spawnPlatform.y - PHYSICS.HERO_HEIGHT / 2)
    }
  };

  const spikes: Spike[] = [{ x: 0, y: height - 15, width, height: 15 }];

  const particles: Particle[] = [];
  for (let i = 1; i < mainPathIndices.length; i++) {
    const p = platforms[mainPathIndices[i]];
    particles.push({
      x: Math.round(p.x + p.width / 2),
      y: Math.round(p.y - 30),
      type: i === 3 ? 'speed' : 'duplicate'
    });
  }

  // A* Validation
  const verifiedPathIndices = findPathAStar(platforms, 0, doorPlatformIndex, alpha);
  if (!verifiedPathIndices) {
    return null;
  }

  const plannedPlatforms = verifiedPathIndices.map((idx) => platforms[idx]);

  // Deterministic 60Hz Physics Simulation Validation
  const world = {
    width,
    height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms,
    spikes,
    bounceWalls: true
  };

  const simulation = simulateFullLevel(world, player.position, door, plannedPlatforms);

  const levelData: LevelData = {
    id: String(atom),
    symbol: elementInfo.symbol,
    atom: elementInfo.name,
    uncertainty: atom,
    width,
    height,
    hue: elementInfo.hue,
    antiHue: elementInfo.antiHue,
    explanations: getNarrativeForLevel(atom),
    player,
    spikes,
    particles,
    platforms,
    door,
    authorGhost: simulation.authorGhost,
    authorTime: simulation.authorTime,
    meta: {
      seed,
      generatorVersion: '2.0.0',
      path: simulation.path
    }
  };

  return { levelData, simulation };
}

/**
 * Deterministically generates a quantum level conforming to LevelData and verified by physics simulation.
 * Supports standard DAG mode ('dag') and modular 4-phase chunk pacing mode ('paced').
 */
export function generateQuantumLevel(options: GeneratorOptions = {}): {
  levelData: LevelData;
  simulation: SimulationResult;
} {
  if (options.mode === 'paced') {
    const assembly = assemblePacedLevel(options);
    return {
      levelData: assembly.levelData,
      simulation: assembly.simulation
    };
  }

  const atom = options.atom ?? 7;
  const seed = options.seed ?? 42;
  const difficulty = options.difficulty ?? (atom <= 4 ? 'easy' : atom <= 8 ? 'medium' : 'hard');
  const width = options.width ?? 2600;
  const height = options.height ?? 1900;

  // Try up to 5 deterministic variations if simulation detects edge blockage
  for (let attempt = 0; attempt < 5; attempt++) {
    const currentSeed = attempt === 0 ? seed : (seed + attempt * 10007) >>> 0;
    const res = attemptGeneration(atom, currentSeed, difficulty, width, height);
    if (res?.simulation.success) {
      if (attempt !== 0 && res.levelData.meta) {
        res.levelData.meta.seed = seed; // preserve original requested seed in metadata
      }
      return res;
    }
  }

  // Fallback to first attempt if all had warnings
  const fallback = attemptGeneration(atom, seed, difficulty, width, height);
  if (!fallback) {
    throw new Error(`Failed to generate reachable level for atom ${atom} seed ${seed}`);
  }
  return fallback;
}
