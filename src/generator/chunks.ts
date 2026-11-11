import type { Particle, ParticleType, Platform, PlatformPhase, Spike } from '../types';

export type ChunkArchetype =
  | 'gravity_well'
  | 'speedrun_highway'
  | 'electron_chasm'
  | 'superposition_chamber'
  | 'decay_zone'
  | 'spawn'
  | 'resolution';

export interface ChunkBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ChunkPoint {
  x: number;
  y: number;
}

export interface Chunk {
  id: string;
  name: string;
  archetype: ChunkArchetype;
  entry: ChunkPoint;
  exit: ChunkPoint;
  platforms: Platform[];
  spikes: Spike[];
  particles: Particle[];
  bounds: ChunkBounds;
  pathPlatforms: Platform[];
}

export interface BaseChunkOptions {
  id?: string;
  originX?: number;
  originY?: number;
}

export interface GravityWellOptions extends BaseChunkOptions {
  wellWidth?: number; // 320 to 420 px
  height?: number; // Well depth in px
  steps?: number; // Intermediate zigzag resting ledges (3 to 5)
  exitDirection?: 'right' | 'left';
}

export interface SpeedrunHighwayOptions extends BaseChunkOptions {
  steps?: number; // 3 to 5 descending steps
  horizontalSpacing?: number; // ~220 px
  verticalDrop?: number; // ~40-60 px
  platformWidth?: number; // ~180-220 px
  speedBoostParticle?: boolean;
}

export interface ElectronChasmOptions extends BaseChunkOptions {
  chasmWidth?: number; // 500 to 700 px
  powerType?: 'lowGravity' | 'speed' | 'tunnel';
  startWidth?: number;
  landingWidth?: number;
  verticalDrop?: number;
}

export interface SuperpositionChamberOptions extends BaseChunkOptions {
  steps?: number; // 4 to 6 alternating platforms
  stepSpacing?: number; // 160-200 px
  verticalStep?: number;
  platformWidth?: number;
  initialPhase?: PlatformPhase;
}

export interface DecayZoneOptions extends BaseChunkOptions {
  steps?: number; // 3 to 5 decaying platforms
  decayMs?: number; // 600 to 900 ms
  stepSpacing?: number;
  platformWidth?: number;
  verticalDelta?: number;
  includeStableExit?: boolean;
}

export interface SpawnChunkOptions extends BaseChunkOptions {
  width?: number;
}

export interface ResolutionChunkOptions extends BaseChunkOptions {
  width?: number;
}

/**
 * Calculates absolute AABB bounding box enclosing all platforms, spikes and particles of a chunk.
 */
export function computeChunkBounds(
  platforms: Platform[],
  spikes: Spike[] = [],
  particles: Particle[] = []
): ChunkBounds {
  if (platforms.length === 0 && spikes.length === 0 && particles.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const p of platforms) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }

  for (const s of spikes) {
    const sw = s.width ?? 32;
    const sh = s.height ?? 32;
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + sw);
    maxY = Math.max(maxY, s.y + sh);
  }

  for (const part of particles) {
    minX = Math.min(minX, part.x - 16);
    minY = Math.min(minY, part.y - 16);
    maxX = Math.max(maxX, part.x + 16);
    maxY = Math.max(maxY, part.y + 16);
  }

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY)
  };
}

/**
 * Translates an existing chunk by (dx, dy).
 */
export function translateChunk(chunk: Chunk, dx: number, dy: number): Chunk {
  const platforms: Platform[] = chunk.platforms.map((p) => ({
    ...p,
    x: Math.round(p.x + dx),
    y: Math.round(p.y + dy)
  }));

  const pathPlatforms: Platform[] = chunk.pathPlatforms.map((p) => ({
    ...p,
    x: Math.round(p.x + dx),
    y: Math.round(p.y + dy)
  }));

  const spikes: Spike[] = chunk.spikes.map((s) => ({
    ...s,
    x: Math.round(s.x + dx),
    y: Math.round(s.y + dy)
  }));

  const particles: Particle[] = chunk.particles.map((part) => ({
    ...part,
    x: Math.round(part.x + dx),
    y: Math.round(part.y + dy)
  }));

  const bounds: ChunkBounds = {
    minX: Math.round(chunk.bounds.minX + dx),
    minY: Math.round(chunk.bounds.minY + dy),
    maxX: Math.round(chunk.bounds.maxX + dx),
    maxY: Math.round(chunk.bounds.maxY + dy),
    width: chunk.bounds.width,
    height: chunk.bounds.height
  };

  return {
    ...chunk,
    entry: { x: Math.round(chunk.entry.x + dx), y: Math.round(chunk.entry.y + dy) },
    exit: { x: Math.round(chunk.exit.x + dx), y: Math.round(chunk.exit.y + dy) },
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * Checks whether two chunks overlap with an optional tolerance padding.
 */
export function checkChunksOverlap(chunkA: Chunk, chunkB: Chunk, padding = 10): boolean {
  const a = chunkA.bounds;
  const b = chunkB.bounds;

  const noOverlap =
    a.maxX + padding <= b.minX ||
    b.maxX + padding <= a.minX ||
    a.maxY + padding <= b.minY ||
    b.maxY + padding <= a.minY;

  return !noOverlap;
}

/**
 * 1. Le Puits Gravitationnel (Vertical Ascent)
 * - Vertical shaft (width 320–420 px).
 * - Vertical neon rebound walls (kind: 'wall').
 * - Zigzag climbing rhythmic ascent with wall recoil and intermediate resting ledges.
 * - Hazard spikes at the bottom pit.
 */
export function createGravityWellChunk(options: GravityWellOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const wellWidth = Math.max(320, Math.min(420, options.wellWidth ?? 360));
  const height = options.height ?? 460;
  const steps = options.steps ?? 4;
  const wallThickness = 24;

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];
  const pathPlatforms: Platform[] = [];

  // Left neon vertical wall (leaves entrance opening at bottom)
  platforms.push({
    x: originX,
    y: originY,
    width: wallThickness,
    height: Math.max(120, height - 160),
    kind: 'wall'
  });

  // Right neon vertical wall (leaves exit opening at top)
  platforms.push({
    x: originX + wellWidth - wallThickness,
    y: originY + 70,
    width: wallThickness,
    height: Math.max(120, height - 70),
    kind: 'wall'
  });

  // Hazard spikes at the bottom pit
  spikes.push({
    x: originX + wallThickness,
    y: originY + height - 16,
    width: wellWidth - wallThickness * 2,
    height: 16
  });

  // Entry platform (base launch ledge at bottom-left)
  const entryLedge: Platform = {
    x: originX + wallThickness + 10,
    y: originY + height - 50,
    width: 100,
    height: 20
  };
  platforms.push(entryLedge);
  pathPlatforms.push(entryLedge);

  // Intermediate zigzag climbing ledges
  const topY = originY + 80;
  const bottomY = originY + height - 50;
  const stepYGap = (bottomY - topY) / (steps + 1);

  for (let i = 1; i <= steps; i++) {
    const ledgeY = Math.round(bottomY - i * stepYGap);
    const isRight = i % 2 === 1;
    const ledgeWidth = 90;
    const ledgeClearance = 12;
    const ledgeX = isRight
      ? originX + wellWidth - wallThickness - ledgeWidth - ledgeClearance
      : originX + wallThickness + ledgeClearance;

    const ledge: Platform = {
      x: ledgeX,
      y: ledgeY,
      width: ledgeWidth,
      height: 20
    };
    platforms.push(ledge);
    pathPlatforms.push(ledge);
  }

  // Exit platform at the top of the well
  const exitLedgeWidth = 110;
  const exitLedge: Platform = {
    x: originX + wellWidth - wallThickness - exitLedgeWidth - 10,
    y: topY,
    width: exitLedgeWidth,
    height: 20
  };
  platforms.push(exitLedge);
  pathPlatforms.push(exitLedge);

  const entry: ChunkPoint = {
    x: entryLedge.x + entryLedge.width / 2,
    y: entryLedge.y
  };

  const exit: ChunkPoint = {
    x: exitLedge.x + exitLedge.width / 2,
    y: exitLedge.y
  };

  const bounds = computeChunkBounds(platforms, spikes, particles);

  return {
    id: options.id ?? 'chunk_gravity_well',
    name: 'Le Puits Gravitationnel',
    archetype: 'gravity_well',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * 2. L'Autoroute Quantique (Speedrun Highway)
 * - 3 to 5 smooth descending tiers (horizontal spacing ~220 px, vertical drop ~40-60 px).
 * - Full-speed sprinting without releasing direction.
 * - Optional mid-way speed particle for ghost run pacing.
 */
export function createSpeedrunHighwayChunk(options: SpeedrunHighwayOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const steps = Math.max(3, Math.min(5, options.steps ?? 4));
  const hSpacing = options.horizontalSpacing ?? 220;
  const vDrop = Math.max(40, Math.min(60, options.verticalDrop ?? 48));
  const pWidth = options.platformWidth ?? 200;
  const speedBoost = options.speedBoostParticle ?? true;

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];
  const pathPlatforms: Platform[] = [];

  for (let i = 0; i < steps; i++) {
    const platX = originX + i * hSpacing;
    const platY = originY + i * vDrop;
    const plat: Platform = {
      x: platX,
      y: platY,
      width: pWidth,
      height: 20
    };
    platforms.push(plat);
    pathPlatforms.push(plat);

    // Place speed particle on 2nd platform
    if (speedBoost && i === 1) {
      particles.push({
        x: Math.round(platX + pWidth / 2),
        y: Math.round(platY - 30),
        type: 'speed'
      });
    }
  }

  const first = platforms[0];
  const last = platforms[platforms.length - 1];

  const entry: ChunkPoint = {
    x: first.x + 50,
    y: first.y
  };

  const exit: ChunkPoint = {
    x: last.x + last.width - 50,
    y: last.y
  };

  const bounds = computeChunkBounds(platforms, spikes, particles);

  return {
    id: options.id ?? 'chunk_speedrun_highway',
    name: "L'Autoroute Quantique",
    archetype: 'speedrun_highway',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * 3. Le Gouffre à Électrons (Mid-Air Power Catch)
 * - Large horizontal gap (500–700 px).
 * - Suspended particle in mid-air ('lowGravity', 'speed' or 'tunnel').
 * - Mandatory airborne catch to extend jump trajectory and reach opposite cliff.
 * - Hazard spikes at the chasm bottom.
 */
export function createElectronChasmChunk(options: ElectronChasmOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const chasmWidth = Math.max(500, Math.min(700, options.chasmWidth ?? 580));
  const powerType: ParticleType = options.powerType ?? 'lowGravity';
  const startWidth = options.startWidth ?? 180;
  const landingWidth = options.landingWidth ?? 200;
  const verticalDrop = options.verticalDrop ?? 30; // Mild descending angle

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];
  const pathPlatforms: Platform[] = [];

  // Launch ledge
  const startLedge: Platform = {
    x: originX,
    y: originY,
    width: startWidth,
    height: 20
  };
  platforms.push(startLedge);
  pathPlatforms.push(startLedge);

  // Mid-air particle suspended in the apex arc
  const midX = originX + startWidth + Math.round(chasmWidth * 0.42);
  const midY = originY - 110; // Apex arc altitude
  particles.push({
    x: midX,
    y: midY,
    type: powerType
  });

  // Landing ledge across the chasm
  const landingLedge: Platform = {
    x: originX + startWidth + chasmWidth,
    y: originY + verticalDrop,
    width: landingWidth,
    height: 20
  };
  platforms.push(landingLedge);
  pathPlatforms.push(landingLedge);

  // Bottom pit spikes
  spikes.push({
    x: originX + startWidth,
    y: originY + 280,
    width: chasmWidth,
    height: 20
  });

  const entry: ChunkPoint = {
    x: startLedge.x + 50,
    y: startLedge.y
  };

  const exit: ChunkPoint = {
    x: landingLedge.x + 60,
    y: landingLedge.y
  };

  const bounds = computeChunkBounds(platforms, spikes, particles);

  return {
    id: options.id ?? 'chunk_electron_chasm',
    name: 'Le Gouffre à Électrons',
    archetype: 'electron_chasm',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * 4. La Chambre de Superposition (Phase Shift Labyrinth)
 * - Alternating grid or stairway of 'cyan' and 'magenta' platforms.
 * - Spikes hazard zone underneath.
 * - Rhythmic jumping enforcing global phase toggling.
 */
export function createSuperpositionChamberChunk(options: SuperpositionChamberOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const steps = Math.max(4, Math.min(6, options.steps ?? 4));
  const stepSpacing = options.stepSpacing ?? 185;
  const pWidth = options.platformWidth ?? 160;
  const verticalStep = options.verticalStep ?? -25;
  const initialPhase: PlatformPhase = options.initialPhase ?? 'cyan';

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];
  const pathPlatforms: Platform[] = [];

  for (let i = 0; i < steps; i++) {
    const isEven = i % 2 === 0;
    const phase: PlatformPhase = isEven
      ? initialPhase
      : initialPhase === 'cyan'
        ? 'magenta'
        : 'cyan';

    const platX = originX + i * stepSpacing;
    const platY = originY + i * verticalStep;

    const plat: Platform = {
      x: platX,
      y: platY,
      width: pWidth,
      height: 20,
      phase
    };
    platforms.push(plat);
    pathPlatforms.push(plat);
  }

  // Bottom hazard spikes
  const totalWidth = steps * stepSpacing + pWidth;
  spikes.push({
    x: originX,
    y: originY + 240,
    width: totalWidth,
    height: 20
  });

  const first = platforms[0];
  const last = platforms[platforms.length - 1];

  const entry: ChunkPoint = {
    x: first.x + 50,
    y: first.y
  };

  const exit: ChunkPoint = {
    x: last.x + last.width - 50,
    y: last.y
  };

  const bounds = computeChunkBounds(platforms, spikes, particles);

  return {
    id: options.id ?? 'chunk_superposition_chamber',
    name: 'La Chambre de Superposition',
    archetype: 'superposition_chamber',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * 5. La Zone de Demi-Vie (Decay Platforms)
 * - Traversal across 3 to 5 unstable platforms with decayMs (600–900 ms).
 * - Temporal urgency: pacing must remain continuous without hesitation.
 * - Hazard spikes beneath.
 */
export function createDecayZoneChunk(options: DecayZoneOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const steps = Math.max(3, Math.min(5, options.steps ?? 4));
  const decayMs = Math.max(600, Math.min(900, options.decayMs ?? 750));
  const stepSpacing = options.stepSpacing ?? 170;
  const pWidth = options.platformWidth ?? 150;
  const vDelta = options.verticalDelta ?? -20;
  const includeStableExit = options.includeStableExit ?? true;

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];
  const pathPlatforms: Platform[] = [];

  for (let i = 0; i < steps; i++) {
    const platX = originX + i * stepSpacing;
    const platY = originY + i * vDelta;

    const plat: Platform = {
      x: platX,
      y: platY,
      width: pWidth,
      height: 20,
      decayMs
    };
    platforms.push(plat);
    pathPlatforms.push(plat);
  }

  // Stable exit ledge so the hero can land safely after clearing the decay run
  let exitLedge = platforms[platforms.length - 1];
  if (includeStableExit) {
    const stableX = originX + steps * stepSpacing;
    const stableY = originY + steps * vDelta;
    exitLedge = {
      x: stableX,
      y: stableY,
      width: 180,
      height: 20
    };
    platforms.push(exitLedge);
    pathPlatforms.push(exitLedge);
  }

  // Pit spikes under the decay zone
  const totalW = (steps + 1) * stepSpacing + pWidth;
  spikes.push({
    x: originX,
    y: originY + 220,
    width: totalW,
    height: 20
  });

  const first = platforms[0];

  const entry: ChunkPoint = {
    x: first.x + 40,
    y: first.y
  };

  const exit: ChunkPoint = {
    x: exitLedge.x + exitLedge.width / 2,
    y: exitLedge.y
  };

  const bounds = computeChunkBounds(platforms, spikes, particles);

  return {
    id: options.id ?? 'chunk_decay_zone',
    name: 'La Zone de Demi-Vie',
    archetype: 'decay_zone',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes,
    particles,
    bounds
  };
}

/**
 * 0. Phase 1: Éveil (Spawn Chunk)
 * - Safe large spawn platform (15% pacing).
 */
export function createSpawnChunk(options: SpawnChunkOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const width = options.width ?? 280;

  const spawnPlatform: Platform = {
    x: originX,
    y: originY,
    width,
    height: 20
  };

  const platforms = [spawnPlatform];
  const pathPlatforms = [spawnPlatform];

  const entry: ChunkPoint = {
    x: originX + 60,
    y: originY
  };

  const exit: ChunkPoint = {
    x: originX + width - 40,
    y: originY
  };

  const bounds = computeChunkBounds(platforms);

  return {
    id: options.id ?? 'chunk_spawn',
    name: "Zone d'Éveil",
    archetype: 'spawn',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes: [],
    particles: [],
    bounds
  };
}

/**
 * 4. Phase 4: Résolution (Resolution Chunk)
 * - Safe landing platform and quantum exit portal (15% pacing).
 */
export function createResolutionChunk(options: ResolutionChunkOptions = {}): Chunk {
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const width = options.width ?? 260;

  const resolutionPlatform: Platform = {
    x: originX,
    y: originY,
    width,
    height: 20
  };

  const platforms = [resolutionPlatform];
  const pathPlatforms = [resolutionPlatform];

  const entry: ChunkPoint = {
    x: originX + 50,
    y: originY
  };

  const exit: ChunkPoint = {
    x: originX + width / 2,
    y: originY
  };

  const bounds = computeChunkBounds(platforms);

  return {
    id: options.id ?? 'chunk_resolution',
    name: 'Zone de Résolution',
    archetype: 'resolution',
    entry,
    exit,
    platforms,
    pathPlatforms,
    spikes: [],
    particles: [],
    bounds
  };
}
