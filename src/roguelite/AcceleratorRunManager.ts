import { getElementSpectroscopy } from '../data/spectroscopy';
import { simulateLevelData } from '../generator/simulator';
import { useGameStore } from '../store';
import type { LevelData, Particle, ParticleType, Platform, Spike } from '../types';
import {
  type AggregatedMutationModifiers,
  type MutationSynergy,
  type QuantumMutation,
  aggregateMutationModifiers,
  detectActiveSynergies,
  getMutationById,
  rollMutationChoices
} from './mutations';

export type AcceleratorRunStatus = 'idle' | 'playing' | 'choosing_mutation' | 'gameover';

export interface AcceleratorElementInfo {
  z: number;
  symbol: string;
  name: string;
  hue: string;
  antiHue: string;
}

export interface AcceleratorRunState {
  status: AcceleratorRunStatus;
  currentZ: number;
  element: AcceleratorElementInfo;
  lives: number;
  maxLives: number;
  activeMutations: string[];
  activeSynergies: MutationSynergy[];
  totalTimeMs: number;
  roomsCleared: number;
  seed: number;
  currentChamber: LevelData | null;
  pendingChoices: [QuantumMutation, QuantumMutation] | null;
  isNewRecord: boolean;
  lastFusionDelta: number;
}

const INITIAL_LIVES = 3;
const PERIOD_JUMP_INTERVAL = 5;

const SUPERHEAVY_SYMBOLS = ['Uue', 'Ubn', 'Ubu', 'Ubb', 'Ubt', 'Ubq', 'Ubp', 'Ubh', 'Ubs', 'Ubo'];
const SUPERHEAVY_HUES: Array<[string, string]> = [
  ['#0b1120', '#00f5d4'],
  ['#140b24', '#f472b6'],
  ['#091a24', '#38bdf8'],
  ['#1a1026', '#fbbf24']
];

export function resolveAcceleratorElement(z: number): AcceleratorElementInfo {
  const safeZ = Math.max(1, Math.floor(z));
  if (safeZ <= 118) {
    const spec = getElementSpectroscopy(safeZ);
    return {
      z: spec.z,
      symbol: spec.symbol,
      name: spec.name,
      hue: spec.hue,
      antiHue: spec.antiHue
    };
  }
  const offset = safeZ - 119;
  const symbol = offset < SUPERHEAVY_SYMBOLS.length ? SUPERHEAVY_SYMBOLS[offset] : `X${safeZ}`;
  const [hue, antiHue] = SUPERHEAVY_HUES[offset % SUPERHEAVY_HUES.length];
  return {
    z: safeZ,
    symbol,
    name: `Superheavy-${safeZ}`,
    hue,
    antiHue
  };
}

function createPrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

function buildFallbackChamber(z: number, seed: number): LevelData {
  const el = resolveAcceleratorElement(z);
  const width = 1040;
  const height = 600;

  return {
    id: `accelerator-${z}`,
    symbol: el.symbol,
    atom: el.name,
    width,
    height,
    hue: el.hue,
    antiHue: el.antiHue,
    archetype: 'accelerator_chamber',
    parTimeMs: 9500,
    parJumps: 5,
    player: { position: { x: 88, y: 484 } },
    door: { x: width - 40, y: 540 },
    platforms: [
      { x: 0, y: 540, width: 250, height: 60 },
      { x: 310, y: 470, width: 170, height: 24 },
      { x: 540, y: 410, width: 170, height: 24 },
      { x: 770, y: 480, width: 270, height: 120 }
    ],
    spikes: [{ x: 380, y: 454, width: 32, height: 16 }],
    particles: [{ x: 615, y: 360, type: 'speed' }],
    meta: {
      seed,
      generatorVersion: 'accelerator-fallback-v1'
    }
  };
}

function buildCandidateChamber(z: number, seed: number, attempt: number): LevelData {
  const el = resolveAcceleratorElement(z);
  const effectiveSeed = (seed * 1664525 + z * 1013904223 + attempt * 374761393) >>> 0;
  const rng = createPrng(effectiveSeed);

  // Difficulty tier scales smoothly from Z = 1 to Z = 118+
  const tier = z <= 3 ? 1 : z <= 10 ? 2 : z <= 25 ? 3 : 4;
  const segmentCount = Math.min(5, 3 + Math.floor(z / 8));
  const width = 940 + segmentCount * 70;
  const height = 600;

  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const particles: Particle[] = [];

  // Safe launch pad
  const startWidth = 210;
  platforms.push({ x: 0, y: 540, width: startWidth, height: 60 });

  let cursorX = startWidth;
  let cursorY = 540;

  const powerUpPool: ParticleType[] =
    tier === 1
      ? ['speed', 'lowGravity']
      : tier === 2
        ? ['speed', 'lowGravity', 'tunnel']
        : ['speed', 'lowGravity', 'tunnel', 'timeDilation', 'duplicate'];

  for (let i = 0; i < segmentCount; i++) {
    const gapX = randInt(rng, 68, Math.min(126, 86 + tier * 10));
    const deltaY = randInt(rng, -78, 56);
    const nextY = Math.max(250, Math.min(520, cursorY + deltaY));
    const platW = randInt(rng, Math.max(115, 165 - tier * 10), Math.max(150, 215 - tier * 10));
    const nextX = cursorX + gapX;

    if (nextX + platW > width - 220) {
      break;
    }

    const plat: Platform = {
      x: nextX,
      y: nextY,
      width: platW,
      height: 24
    };

    // Progressive mechanics injection
    const roll = rng();
    if (tier >= 2 && roll < 0.24 && platW >= 125) {
      // Gentle moving platform with safe travel range
      const shiftX = Math.min(50, Math.max(24, Math.floor(gapX * 0.4)));
      plat.movesTo = { x: nextX + shiftX, y: nextY };
    } else if (tier >= 3 && roll >= 0.24 && roll < 0.45) {
      // Half-life decay platform
      plat.decayMs = Math.max(850, 1450 - tier * 110);
    }

    platforms.push(plat);

    // Optional neon wall-bounce pillar on elevated segments (tier >= 2)
    if (tier >= 2 && i === 1 && rng() < 0.42 && nextY > 310) {
      platforms.push({
        x: nextX + platW - 20,
        y: nextY - 96,
        width: 20,
        height: 96,
        kind: 'wall'
      });
    }

    // Spikes placed with clear landing & takeoff margins
    if (platW >= 135 && !plat.movesTo && rng() < 0.35 + tier * 0.14) {
      const spikeW = tier >= 3 ? 36 : 28;
      const spikeX = nextX + Math.floor((platW - spikeW) * 0.52);
      spikes.push({
        x: spikeX,
        y: nextY - 16,
        width: spikeW,
        height: 16
      });
    }

    // Power-up particle above selected segments
    if ((i === 0 && rng() < 0.75) || (i === 2 && rng() < 0.6)) {
      const pType = powerUpPool[randInt(rng, 0, powerUpPool.length - 1)];
      particles.push({
        x: nextX + Math.floor(platW / 2),
        y: nextY - 56,
        type: pType
      });
    }

    cursorX = nextX + platW;
    cursorY = nextY;
  }

  // Exit platform reaching the right edge with comfortable landing zone
  const exitGap = Math.min(110, Math.max(60, width - 220 - cursorX));
  const exitX = Math.max(cursorX + Math.min(exitGap, 96), width - 240);
  const exitY = Math.max(280, Math.min(520, cursorY + randInt(rng, -40, 40)));
  const exitW = Math.max(180, width - exitX);

  platforms.push({
    x: exitX,
    y: exitY,
    width: exitW,
    height: height - exitY
  });

  // Always guarantee at least 1 particle in the chamber for Particle Magnet / Arcade feel
  if (particles.length === 0) {
    particles.push({
      x: Math.min(width - 140, Math.max(180, exitX - 60)),
      y: Math.max(120, exitY - 64),
      type: powerUpPool[0]
    });
  }

  return {
    id: `accelerator-${z}`,
    symbol: el.symbol,
    atom: el.name,
    width,
    height,
    hue: el.hue,
    antiHue: el.antiHue,
    archetype: 'accelerator_chamber',
    parTimeMs: Math.round(7500 + segmentCount * 1400),
    parJumps: segmentCount + 2,
    player: { position: { x: 88, y: 484 } },
    door: { x: width - 40, y: exitY },
    platforms,
    spikes,
    particles,
    meta: {
      seed: effectiveSeed,
      generatorVersion: 'accelerator-v1'
    }
  };
}

/**
 * Generates a short, punchy accelerator chamber for atomic number Z,
 * verified for solvability by simulateLevelData with a guaranteed solvable fallback.
 */
export function generateChamber(z: number, seed: number): LevelData {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = buildCandidateChamber(z, seed, attempt);
    const sim = simulateLevelData(candidate);
    if (sim.success) {
      return candidate;
    }
  }
  return buildFallbackChamber(z, seed);
}

export type AcceleratorRunListener = (state: AcceleratorRunState) => void;

export class AcceleratorRunManager {
  private state: AcceleratorRunState;
  private listeners: Set<AcceleratorRunListener> = new Set();

  constructor(initialSeed?: number) {
    const seed = initialSeed ?? Math.floor(Date.now() % 2147483647);
    this.state = {
      status: 'idle',
      currentZ: 1,
      element: resolveAcceleratorElement(1),
      lives: INITIAL_LIVES,
      maxLives: INITIAL_LIVES,
      activeMutations: [],
      activeSynergies: [],
      totalTimeMs: 0,
      roomsCleared: 0,
      seed,
      currentChamber: null,
      pendingChoices: null,
      isNewRecord: false,
      lastFusionDelta: 1
    };
  }

  public getState(): AcceleratorRunState {
    return {
      ...this.state,
      activeMutations: [...this.state.activeMutations],
      activeSynergies: [...this.state.activeSynergies],
      pendingChoices: this.state.pendingChoices
        ? [this.state.pendingChoices[0], this.state.pendingChoices[1]]
        : null
    };
  }

  public getAggregatedModifiers(): AggregatedMutationModifiers {
    return aggregateMutationModifiers(this.state.activeMutations);
  }

  public subscribe(listener: AcceleratorRunListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of Array.from(this.listeners)) {
      listener(snapshot);
    }
  }

  public startRun(seedOverride?: number): AcceleratorRunState {
    const seed =
      seedOverride !== undefined
        ? Math.abs(Math.floor(seedOverride)) || 1
        : Math.floor(Date.now() % 2147483647) || 1;
    const firstChamber = generateChamber(1, seed);
    this.state = {
      status: 'playing',
      currentZ: 1,
      element: resolveAcceleratorElement(1),
      lives: INITIAL_LIVES,
      maxLives: INITIAL_LIVES,
      activeMutations: [],
      activeSynergies: [],
      totalTimeMs: 0,
      roomsCleared: 0,
      seed,
      currentChamber: firstChamber,
      pendingChoices: null,
      isNewRecord: false,
      lastFusionDelta: 1
    };
    this.emit();
    return this.getState();
  }

  public completeRoom(roomElapsedMs: number): AcceleratorRunState {
    if (this.state.status !== 'playing') {
      return this.getState();
    }
    const safeElapsed = Number.isFinite(roomElapsedMs) && roomElapsedMs > 0 ? roomElapsedMs : 0;
    const nextRoomsCleared = this.state.roomsCleared + 1;
    const nextTotalTime = this.state.totalTimeMs + Math.round(safeElapsed);

    // Every 5th room triggers a +2 Fusion Surge period jump; otherwise Z -> Z + 1
    const fusionDelta = nextRoomsCleared % PERIOD_JUMP_INTERVAL === 0 ? 2 : 1;
    const nextZ = this.state.currentZ + fusionDelta;
    const choices = rollMutationChoices(
      this.state.activeMutations,
      this.state.seed,
      nextRoomsCleared
    );

    const isRecordNow = useGameStore.getState().recordAcceleratorRun({
      maxZ: nextZ,
      roomsCleared: nextRoomsCleared,
      totalTimeMs: nextTotalTime,
      mutations: this.state.activeMutations
    });

    this.state = {
      ...this.state,
      status: 'choosing_mutation',
      currentZ: nextZ,
      element: resolveAcceleratorElement(nextZ),
      totalTimeMs: nextTotalTime,
      roomsCleared: nextRoomsCleared,
      pendingChoices: choices,
      isNewRecord: this.state.isNewRecord || isRecordNow,
      lastFusionDelta: fusionDelta
    };

    this.emit();
    return this.getState();
  }

  public chooseMutation(choiceIndex: 0 | 1): AcceleratorRunState {
    if (this.state.status !== 'choosing_mutation' || !this.state.pendingChoices) {
      return this.getState();
    }
    const chosen = this.state.pendingChoices[choiceIndex] ?? this.state.pendingChoices[0];
    const nextMutations = [...this.state.activeMutations, chosen.id];
    const nextSynergies = detectActiveSynergies(nextMutations);

    const mutationDef = getMutationById(chosen.id);
    const extraMaxLives = mutationDef?.modifiers.extraMaxLives ?? 0;
    const healOnPick = mutationDef?.modifiers.healOnPick ?? 0;
    const nextMaxLives = Math.min(7, this.state.maxLives + extraMaxLives);
    const nextLives = Math.min(nextMaxLives, this.state.lives + healOnPick);

    const nextChamber = generateChamber(this.state.currentZ, this.state.seed);

    this.state = {
      ...this.state,
      status: 'playing',
      lives: nextLives,
      maxLives: nextMaxLives,
      activeMutations: nextMutations,
      activeSynergies: nextSynergies,
      currentChamber: nextChamber,
      pendingChoices: null
    };

    // Update best record mutations list if this run is currently the best
    useGameStore.getState().recordAcceleratorRun({
      maxZ: this.state.currentZ,
      roomsCleared: this.state.roomsCleared,
      totalTimeMs: this.state.totalTimeMs,
      mutations: nextMutations
    });

    this.emit();
    return this.getState();
  }

  public loseLife(): { state: AcceleratorRunState; gameOver: boolean } {
    if (this.state.status !== 'playing') {
      return { state: this.getState(), gameOver: this.state.status === 'gameover' };
    }

    const nextLives = Math.max(0, this.state.lives - 1);
    const gameOver = nextLives <= 0;

    let isNewRecord = this.state.isNewRecord;
    if (gameOver) {
      const recorded = useGameStore.getState().recordAcceleratorRun({
        maxZ: this.state.currentZ,
        roomsCleared: this.state.roomsCleared,
        totalTimeMs: this.state.totalTimeMs,
        mutations: this.state.activeMutations
      });
      isNewRecord = isNewRecord || recorded;
    }

    this.state = {
      ...this.state,
      lives: nextLives,
      status: gameOver ? 'gameover' : 'playing',
      isNewRecord
    };

    this.emit();
    return { state: this.getState(), gameOver };
  }
}
