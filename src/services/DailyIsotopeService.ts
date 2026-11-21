import { SPECTROSCOPY_DATABASE } from '../data/spectroscopy';
import type { LevelData } from '../types';

export type DailyDifficulty = 'medium' | 'hard';

export interface DailyIsotopePreview {
  dateKey: string;
  z: number;
  symbol: string;
  atom: string;
  hue: string;
  antiHue: string;
  difficulty: DailyDifficulty;
  seed: number;
}

export interface DailyCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

const DAILY_MIN_Z = 3;
const DAILY_MAX_Z = 118;
const DAILY_Z_SPAN = DAILY_MAX_Z - DAILY_MIN_Z + 1; // 116 elements [3..118]
const SESSION_CACHE_PREFIX = 'quantic_daily_isotope_v1:';
const MAX_GENERATION_ATTEMPTS = 6;

const dailyLevelCache = new Map<string, LevelData>();

/**
 * Pure helper returning the UTC date key in 'YYYY-MM-DD' format.
 */
export function getDailyDateKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure helper returning the previous calendar day ('YYYY-MM-DD') in UTC.
 */
export function getPreviousDateKey(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return '';
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const prevUtc = new Date(Date.UTC(year, month - 1, day - 1));
  return getDailyDateKey(prevUtc);
}

/**
 * Deterministic 32-bit FNV-1a hash converting a 'YYYY-MM-DD' date key into an unsigned 32-bit seed.
 */
export function dateKeyToSeed(dateKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Pure Mulberry32 PRNG returning deterministic floats in [0, 1).
 */
export function createMulberry32(seed: number): () => number {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  if (state === 0) {
    state = 1;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synchronous, lightweight preview of the Daily Isotope for the Menu.
 * Reads only SPECTROSCOPY_DATABASE without importing the level generator or simulator.
 */
export function getDailyIsotopePreview(dateKey?: string): DailyIsotopePreview {
  const resolvedDateKey = dateKey ?? getDailyDateKey();
  const seed = dateKeyToSeed(resolvedDateKey);
  const rng = createMulberry32(seed);

  const z = DAILY_MIN_Z + Math.floor(rng() * DAILY_Z_SPAN);
  const difficulty: DailyDifficulty = rng() < 0.5 ? 'medium' : 'hard';

  const element =
    SPECTROSCOPY_DATABASE.find((el) => el.z === z) ?? SPECTROSCOPY_DATABASE[DAILY_MIN_Z - 1];

  return {
    dateKey: resolvedDateKey,
    z: element.z,
    symbol: element.symbol,
    atom: element.name,
    hue: element.hue,
    antiHue: element.antiHue,
    difficulty,
    seed
  };
}

/**
 * Computes remaining time until next UTC midnight.
 */
export function getTimeUntilNextDailyUtc(now: Date = new Date()): DailyCountdown {
  const nextMidnightMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  const remainingSec = Math.max(0, Math.floor((nextMidnightMs - now.getTime()) / 1000));
  const hours = Math.floor(remainingSec / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  const formatted = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');

  return { hours, minutes, seconds, formatted };
}

function readFromSessionCache(dateKey: string): LevelData | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${dateKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LevelData;
    if (parsed && parsed.id === `daily:${dateKey}` && Array.isArray(parsed.platforms)) {
      return parsed;
    }
  } catch {
    // Ignore storage errors (SSR, private mode, quota)
  }
  return null;
}

function writeToSessionCache(dateKey: string, levelData: LevelData): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${dateKey}`, JSON.stringify(levelData));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Deterministically generates, verifies, and caches the Daily Isotope level for a UTC date key.
 * Dynamically imports the generator and physics simulator to keep the initial Menu bundle small.
 */
export async function generateDailyIsotope(dateKey?: string): Promise<LevelData> {
  const preview = getDailyIsotopePreview(dateKey);
  const resolvedDateKey = preview.dateKey;

  const memCached = dailyLevelCache.get(resolvedDateKey);
  if (memCached) {
    return memCached;
  }

  const sessionCached = readFromSessionCache(resolvedDateKey);
  if (sessionCached) {
    dailyLevelCache.set(resolvedDateKey, sessionCached);
    return sessionCached;
  }

  const [
    { generateQuantumLevel },
    { simulateLevelData },
    { countJumpsInTrajectory },
    { decompressTrajectory }
  ] = await Promise.all([
    import('../generator/dagGenerator'),
    import('../generator/simulator'),
    import('./MedalService'),
    import('../tools/GhostRecorder')
  ]);

  let chosenLevel: LevelData | null = null;
  let fallbackLevel: LevelData | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const attemptSeed = attempt === 0 ? preview.seed : (preview.seed + attempt * 10007) >>> 0;
    const result = generateQuantumLevel({
      atom: preview.z,
      difficulty: preview.difficulty,
      seed: attemptSeed,
      mode: 'paced'
    });

    if (!fallbackLevel) {
      fallbackLevel = result.levelData;
    }

    const isVerified = result.simulation.success || simulateLevelData(result.levelData).success;

    if (isVerified) {
      chosenLevel = result.levelData;
      break;
    }
  }

  const baseLevel = chosenLevel ?? fallbackLevel;
  if (!baseLevel) {
    throw new Error(`Failed to generate Daily Isotope for ${resolvedDateKey}`);
  }

  const rawAuthorTime = baseLevel.authorTime;
  const parTimeMs =
    typeof rawAuthorTime === 'number' && rawAuthorTime > 0
      ? Math.max(3000, Math.round(rawAuthorTime * 1.15))
      : 15000;

  let parJumps = Math.max(4, baseLevel.platforms.length);
  if (baseLevel.authorGhost) {
    const frames = decompressTrajectory(baseLevel.authorGhost);
    const counted = countJumpsInTrajectory(frames);
    if (counted > 0) {
      parJumps = counted;
    }
  }

  const dailyLevel: LevelData = {
    ...baseLevel,
    id: `daily:${resolvedDateKey}`,
    symbol: preview.symbol,
    atom: preview.atom,
    hue: preview.hue,
    antiHue: preview.antiHue,
    parTimeMs,
    parJumps,
    meta: {
      ...baseLevel.meta,
      seed: preview.seed,
      generatorVersion: baseLevel.meta?.generatorVersion ?? '2.0.0'
    }
  };

  dailyLevelCache.set(resolvedDateKey, dailyLevel);
  writeToSessionCache(resolvedDateKey, dailyLevel);

  return dailyLevel;
}

/**
 * Clears in-memory and sessionStorage Daily Isotope caches (useful for tests).
 */
export function clearDailyIsotopeCache(): void {
  dailyLevelCache.clear();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key?.startsWith(SESSION_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}
