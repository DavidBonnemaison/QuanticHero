import type { DiscoveryBoxConfig, LevelData } from '../types';
import rawMetadata from './levelMetadata.json';

export interface LevelMetadata {
  id: string;
  symbol: string;
  atom: string;
  uncertainty?: number;
  hue: string;
  antiHue: string;
  explanations?: string[];
  authorTime?: number;
  parJumps?: number;
  noblePlayground?: boolean;
  discoveryBox?: DiscoveryBoxConfig;
}

export const LEVEL_METADATA: Record<string, LevelMetadata> = rawMetadata as unknown as Record<
  string,
  LevelMetadata
>;

const levelModules = import.meta.glob<{ default: LevelData }>([
  './level*.json',
  '!./levelMetadata.json'
]);
const levelCache = new Map<string, LevelData>();
const pendingLoads = new Map<string, Promise<LevelData | undefined>>();

export function normalizeLevelKey(id: string | number): string {
  const str = String(id).trim();
  return str.startsWith('level') ? str : `level${str}`;
}

export function getLevelMetadata(id: string | number): LevelMetadata | undefined {
  return LEVEL_METADATA[normalizeLevelKey(id)];
}

export function getAllLevelMetadata(): LevelMetadata[] {
  return Object.values(LEVEL_METADATA).sort((a, b) => Number(a.id) - Number(b.id));
}

export function getCachedLevel(id: string | number): LevelData | undefined {
  return levelCache.get(normalizeLevelKey(id));
}

export async function loadLevel(id: string | number): Promise<LevelData | undefined> {
  const key = normalizeLevelKey(id);
  const cached = levelCache.get(key);
  if (cached) {
    return cached;
  }

  const inflight = pendingLoads.get(key);
  if (inflight) {
    return inflight;
  }

  const loader = levelModules[`./${key}.json`];
  if (!loader) {
    return undefined;
  }

  const promise = loader()
    .then((mod) => {
      const data = mod.default ?? (mod as unknown as LevelData);
      levelCache.set(key, data);
      return data;
    })
    .finally(() => {
      pendingLoads.delete(key);
    });

  pendingLoads.set(key, promise);
  return promise;
}

export function preloadLevel(id: string | number): void {
  void loadLevel(id);
}
