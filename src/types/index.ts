export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  movesTo?: {
    x?: number;
    y?: number;
    time?: number;
  };
}

export type ParticleType = 'duplicate' | 'speed' | 'lowGravity' | 'antiGravity';

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
  entanglement?: EntanglementConfig;
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
  routing?: any;
}
