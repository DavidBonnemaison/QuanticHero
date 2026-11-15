export type PlatformKind = 'standard' | 'wall';
export type PlatformPhase = 'cyan' | 'magenta';

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: PlatformKind; // 'wall' = vertical neon wall bounce surface
  phase?: PlatformPhase; // 'cyan' | 'magenta' = active according to global phase
  decayMs?: number; // Half-life decay platform: collapses N ms after initial contact
  movesTo?: {
    x?: number;
    y?: number;
    time?: number;
  };
}

export type ParticleType =
  | 'duplicate'
  | 'speed'
  | 'lowGravity'
  | 'antiGravity'
  | 'tunnel'
  | 'pauli'
  | 'timeDilation';

export interface Particle {
  x: number;
  y: number;
  type: ParticleType;
}

export interface Spike {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface Door {
  x: number;
  y: number;
}

export interface PlayerPosition {
  x: number;
  y: number;
}

export interface Player {
  position: PlayerPosition;
}

export type EntanglementMode = 'mirror_x' | 'inverted_gravity' | 'mirror_and_gravity';

export interface EntanglementConfig {
  mode: EntanglementMode;
  betaSpawn?: { x: number; y: number };
  portalMode?: 'single' | 'dual';
  betaDoor?: { x: number; y: number };
}

export interface LevelMeta {
  seed: number;
  generatorVersion: string;
  path: { x: number; y: number; t: number }[];
}

export interface CollapseConfig {
  speedY: number; // Speed of narrowing ceiling/floor spikes (px/s)
  delayMs: number; // Delay before collapse starts
}

export interface Gate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetGateId: string;
  requireLock?: boolean; // quand un héros se place dessus, la barrière s'ouvre
}

export interface LevelData {
  id: string;
  symbol: string;
  atom: string;
  uncertainty?: number;
  width: number;
  height: number;
  hue: string;
  antiHue: string;
  explanations?: string[];
  player: Player;
  spikes: Spike[];
  particles: Particle[];
  platforms: Platform[];
  door: Door;
  gates?: Gate[];
  pressurePlates?: PressurePlate[];
  entanglement?: EntanglementConfig;
  collapse?: CollapseConfig;
  authorGhost?: string;
  authorTime?: number;
  meta?: LevelMeta;
}

export type LevelsMap = Record<string, LevelData>;

export interface GameState {
  maxLevel: number;
  currentLevel: number;
}

export interface ScoreItem {
  best: number;
  last: number;
  ghostTrajectory?: string;
}

export type ScoreState = Record<number, ScoreItem>;

export interface RootState {
  game: GameState;
  levels: LevelsMap | null;
  score: ScoreState;
  routing?: unknown;
}

export type GhostMode = 'off' | 'optimal' | 'best';
