import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getCachedLevel } from '../data/levels';
import type { Locale } from '../i18n/strings';
import { getPreviousDateKey } from '../services/DailyIsotopeService';
import { bestMedal } from '../services/MedalService';
import {
  ENTANGLEMENT_LEVEL_MAX,
  getNextLevelId,
  isEntanglementLevelId
} from '../tools/levelProgression';
import type {
  AcceleratorBestRecord,
  DailyScoreEntry,
  DailyStreakState,
  DuelChallenge,
  GhostMode,
  HeroSkin,
  IsotopeMedal,
  LastRunSummary,
  LevelData,
  ScoreItem
} from '../types';

export { getNextLevelId, isEntanglementLevelId };
export type {
  AcceleratorBestRecord,
  DailyScoreEntry,
  DailyStreakState,
  DuelChallenge,
  GhostMode,
  HeroSkin,
  LastRunSummary,
  Locale
};

export interface PendingDuelShare {
  duel: DuelChallenge;
  isRevenge: boolean;
}

export interface UpdateLevelFieldParams {
  level: number;
  type: string;
  n?: number | string;
  prop?: string;
  value: any;
}

export interface GameStoreState {
  currentLevel: number;
  maxLevel: number;
  maxEntanglementLevel: number;
  scores: Record<number, ScoreItem>;
  customLevels: Record<string, LevelData> | null;
  isMuted: boolean;
  hapticsEnabled: boolean;
  reducedEffects: boolean;
  heroSkin: HeroSkin;
  ghostMode: GhostMode;
  ghostEnabled: boolean;
  locale: Locale;
  sharedLevel: LevelData | null;
  activeDuel: DuelChallenge | null;
  lastRun: LastRunSummary | null;
  pendingDuelShare: PendingDuelShare | null;
  unlockedMolecules: string[];
  moleculeScores: Record<string, ScoreItem>;
  customModeScores: Record<string, ScoreItem>;
  dailyHistory: Record<string, DailyScoreEntry>;
  dailyStreak: DailyStreakState;
  acceleratorBest: AcceleratorBestRecord | null;
}

export interface RecordScoreMeta {
  jumpCount?: number;
  switchCount?: number;
  medal?: IsotopeMedal;
  coherentRun?: boolean;
  styleScore?: number;
}

export interface GameStoreActions {
  updateCurrentLevel: (lvl: number) => void;
  updateMaxLevel: (lvl: number) => void;
  updateMaxEntanglementLevel: (lvl: number) => void;
  resetGame: () => void;
  recordScore: (
    level: number,
    score: number,
    ghostTrajectory?: string,
    meta?: RecordScoreMeta
  ) => void;
  recordMoleculeScore: (
    moleculeId: string,
    score: number,
    ghostTrajectory?: string,
    meta?: RecordScoreMeta
  ) => void;
  recordCustomModeScore: (
    modeLevelId: string,
    score: number,
    ghostTrajectory?: string,
    meta?: RecordScoreMeta
  ) => void;
  recordDailyScore: (
    dateKey: string,
    timeMs: number,
    jumps: number,
    medal: IsotopeMedal,
    ghostTrajectory?: string
  ) => void;
  recordCoherenceResult: (level: number, styleScore: number, coherentRun: boolean) => void;
  saveGhostTrajectory: (level: number, trajectory: string) => void;
  setLevels: (data: Record<string, LevelData> | null) => void;
  resetCustomLevel: (id: string) => void;
  setSharedLevel: (level: LevelData | null) => void;
  setActiveDuel: (duel: DuelChallenge | null) => void;
  setLastRun: (run: LastRunSummary | null) => void;
  setPendingDuelShare: (share: PendingDuelShare | null) => void;
  saveSharedLevelToCustom: (slot?: number) => void;
  updateLevelField: (params: UpdateLevelFieldParams) => void;
  addPlatform: (params: { level: number }) => void;
  deletePlatform: (params: { level: number; n: number | string }) => void;
  addParticle: (params: { level: number }) => void;
  deleteParticle: (params: { level: number; n: number | string }) => void;
  addObserverBeam: (params: { level: number }) => void;
  deleteObserverBeam: (params: { level: number; n: number | string }) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleHaptics: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  toggleReducedEffects: () => void;
  setReducedEffects: (reduced: boolean) => void;
  setHeroSkin: (skin: HeroSkin) => void;
  toggleHeroSkin: () => void;
  toggleGhost: (hasPersonalBest?: boolean, hasSwarm?: boolean) => void;
  setGhostMode: (mode: GhostMode) => void;
  setGhostEnabled: (enabled: boolean) => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  unlockMolecule: (moleculeId: string) => void;
  unlockBellSync: (level: number) => void;
  recordAcceleratorRun: (run: {
    maxZ: number;
    roomsCleared: number;
    totalTimeMs: number;
    mutations: string[];
    dateIso?: string;
  }) => boolean;
}

export type GameStore = GameStoreState & GameStoreActions;

const defaultPlatform = {
  x: 100,
  y: 100,
  width: 200,
  height: 20
};

const defaultParticle = {
  x: 100,
  y: 100,
  type: 'duplicate' as const
};

const defaultObserverBeam = {
  x: 480,
  y: 70,
  sweepAngleDeg: 120,
  speedDegPerSec: 40,
  range: 520
};

export function getEffectiveLevel(
  id: string | number,
  customLevels?: Record<string, LevelData> | null
): LevelData | undefined {
  const strId = String(id);
  const key = strId.startsWith('level') ? strId : `level${strId}`;
  const custom = customLevels !== undefined ? customLevels : useGameStore.getState().customLevels;
  return custom?.[key] ?? getCachedLevel(key);
}

const customStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(name);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return raw;
      }
      // Migrate legacy Redux-persist format if present
      const game = parsed.game
        ? typeof parsed.game === 'string'
          ? JSON.parse(parsed.game)
          : parsed.game
        : {};
      const score = parsed.score
        ? typeof parsed.score === 'string'
          ? JSON.parse(parsed.score)
          : parsed.score
        : {};
      const levels = parsed.levels
        ? typeof parsed.levels === 'string'
          ? JSON.parse(parsed.levels)
          : parsed.levels
        : null;

      const migrated = {
        state: {
          currentLevel: game.currentLevel ?? 0,
          maxLevel: game.maxLevel ?? 1,
          maxEntanglementLevel: parsed.state?.maxEntanglementLevel ?? 110,
          scores: score ?? {},
          customLevels: levels ?? null,
          isMuted: parsed.isMuted ?? false,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          reducedEffects: parsed.reducedEffects ?? false,
          heroSkin: (parsed.heroSkin === 'classic' ? 'classic' : 'quantum') as HeroSkin,
          ghostMode: (parsed.state?.ghostMode ??
            (parsed.state?.ghostEnabled === false ? 'off' : 'optimal')) as GhostMode,
          ghostEnabled:
            parsed.state?.ghostEnabled ??
            (parsed.state?.ghostMode ? parsed.state.ghostMode !== 'off' : true),
          locale: (parsed.state?.locale === 'fr' ? 'fr' : 'en') as Locale
        },
        version: 0
      };
      return JSON.stringify(migrated);
    } catch {
      return raw;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(name);
    }
  }
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, _get) => ({
      currentLevel: 0,
      maxLevel: 1,
      maxEntanglementLevel: 110,
      scores: {},
      customLevels: null,
      sharedLevel: null,
      activeDuel: null,
      lastRun: null,
      pendingDuelShare: null,
      isMuted: false,
      hapticsEnabled: true,
      reducedEffects: false,
      heroSkin: 'quantum',
      ghostMode: 'optimal',
      ghostEnabled: true,
      locale: 'en',
      unlockedMolecules: [],
      moleculeScores: {},
      customModeScores: {},
      dailyHistory: {},
      dailyStreak: {
        current: 0,
        longest: 0,
        lastCompletedDate: null
      },
      acceleratorBest: null,

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMuted: (muted: boolean) => set({ isMuted: muted }),

      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      setHapticsEnabled: (enabled: boolean) => set({ hapticsEnabled: enabled }),

      toggleReducedEffects: () => set((state) => ({ reducedEffects: !state.reducedEffects })),
      setReducedEffects: (reduced: boolean) => set({ reducedEffects: reduced }),

      setHeroSkin: (skin: HeroSkin) => set({ heroSkin: skin }),
      toggleHeroSkin: () =>
        set((state) => ({ heroSkin: state.heroSkin === 'quantum' ? 'classic' : 'quantum' })),

      setLocale: (locale: Locale) => set({ locale }),
      toggleLocale: () => set((state) => ({ locale: state.locale === 'en' ? 'fr' : 'en' })),

      toggleGhost: (hasPersonalBest?: boolean, hasSwarm = false) =>
        set((state) => {
          let canUseBest = hasPersonalBest;
          if (canUseBest === undefined) {
            const curScore = state.scores[state.currentLevel];
            canUseBest = Boolean(curScore?.ghostTrajectory && curScore?.best && curScore.best > 0);
          }

          let nextMode: GhostMode;
          const currentMode = state.ghostMode ?? (state.ghostEnabled ? 'optimal' : 'off');
          if (currentMode === 'off') {
            nextMode = 'optimal';
          } else if (currentMode === 'optimal') {
            nextMode = canUseBest ? 'best' : hasSwarm ? 'swarm' : 'off';
          } else if (currentMode === 'best') {
            nextMode = hasSwarm ? 'swarm' : 'off';
          } else {
            nextMode = 'off';
          }

          return {
            ghostMode: nextMode,
            ghostEnabled: nextMode !== 'off'
          };
        }),

      setGhostMode: (mode: GhostMode) =>
        set({
          ghostMode: mode,
          ghostEnabled: mode !== 'off'
        }),

      setGhostEnabled: (enabled: boolean) =>
        set({
          ghostEnabled: enabled,
          ghostMode: enabled ? 'optimal' : 'off'
        }),

      unlockMolecule: (moleculeId: string) =>
        set((state) => {
          if (state.unlockedMolecules.includes(moleculeId)) return state;
          return {
            unlockedMolecules: [...state.unlockedMolecules, moleculeId]
          };
        }),

      unlockBellSync: (level: number) =>
        set((state) => {
          const prevItem = state.scores[level] ?? { best: 0, last: 0 };
          return {
            scores: {
              ...state.scores,
              [level]: {
                ...prevItem,
                medal: bestMedal(prevItem.medal, 'gold'),
                bellSync: true
              }
            }
          };
        }),

      updateCurrentLevel: (lvl: number) => set({ currentLevel: Number(lvl) }),

      updateMaxLevel: (lvl: number) => set({ maxLevel: Number(lvl) }),

      updateMaxEntanglementLevel: (lvl: number) => set({ maxEntanglementLevel: Number(lvl) }),

      resetGame: () =>
        set({
          currentLevel: 0,
          maxLevel: 1,
          maxEntanglementLevel: 110,
          scores: {},
          sharedLevel: null,
          activeDuel: null,
          lastRun: null,
          pendingDuelShare: null,
          unlockedMolecules: [],
          moleculeScores: {},
          customModeScores: {},
          dailyHistory: {},
          dailyStreak: {
            current: 0,
            longest: 0,
            lastCompletedDate: null
          },
          acceleratorBest: null
        }),

      recordAcceleratorRun: ({ maxZ, roomsCleared, totalTimeMs, mutations, dateIso }) => {
        let isNewRecord = false;
        set((state) => {
          const prev = state.acceleratorBest;
          const sanitizedZ = Math.max(1, Math.floor(maxZ));
          const sanitizedRooms = Math.max(0, Math.floor(roomsCleared));
          const sanitizedTime = Math.max(0, Math.round(totalTimeMs));

          const prevRooms = prev?.bestRooms ?? prev?.bestScore ?? 0;
          const beatsPrev =
            !prev ||
            sanitizedZ > prev.maxZ ||
            (sanitizedZ === prev.maxZ && sanitizedRooms > prevRooms) ||
            (sanitizedZ === prev.maxZ &&
              sanitizedRooms === prevRooms &&
              sanitizedTime > 0 &&
              (prev.bestTimeMs <= 0 || sanitizedTime < prev.bestTimeMs));

          const sameRunWithMoreMutations =
            Boolean(prev) &&
            sanitizedZ === prev?.maxZ &&
            sanitizedRooms === prevRooms &&
            sanitizedTime === prev?.bestTimeMs &&
            mutations.length > (prev?.mutations?.length ?? 0);

          if (!beatsPrev && !sameRunWithMoreMutations) {
            return state;
          }

          if (beatsPrev) {
            isNewRecord = true;
          }
          return {
            acceleratorBest: {
              maxZ: sanitizedZ,
              bestScore: sanitizedRooms,
              bestRooms: sanitizedRooms,
              bestTimeMs: sanitizedTime,
              mutations: [...mutations],
              dateIso: dateIso ?? prev?.dateIso ?? new Date().toISOString()
            }
          };
        });
        return isNewRecord;
      },

      recordDailyScore: (
        dateKey: string,
        timeMs: number,
        jumps: number,
        medal: IsotopeMedal,
        ghostTrajectory?: string
      ) =>
        set((state) => {
          const currentHistory = state.dailyHistory ?? {};
          const prevEntry = currentHistory[dateKey];
          const isNewBest = !prevEntry || prevEntry.bestMs <= 0 || timeMs < prevEntry.bestMs;
          const bestMs =
            prevEntry && prevEntry.bestMs > 0 ? Math.min(prevEntry.bestMs, timeMs) : timeMs;
          const bestJumps = prevEntry ? Math.min(prevEntry.bestJumps, jumps) : jumps;
          const nextMedal = bestMedal(prevEntry?.medal, medal);
          const nextGhost = isNewBest
            ? (ghostTrajectory ?? prevEntry?.ghostTrajectory)
            : prevEntry?.ghostTrajectory;

          const prevStreak = state.dailyStreak ?? {
            current: 0,
            longest: 0,
            lastCompletedDate: null
          };

          const isPastDate =
            prevStreak.lastCompletedDate !== null && dateKey < prevStreak.lastCompletedDate;

          let nextStreak = prevStreak;
          if (!isPastDate) {
            let nextCurrent: number;
            if (prevStreak.lastCompletedDate === dateKey) {
              nextCurrent = prevStreak.current > 0 ? prevStreak.current : 1;
            } else if (prevStreak.lastCompletedDate === getPreviousDateKey(dateKey)) {
              nextCurrent = prevStreak.current + 1;
            } else {
              nextCurrent = 1;
            }

            const nextLongest = Math.max(prevStreak.longest, nextCurrent);
            nextStreak = {
              current: nextCurrent,
              longest: nextLongest,
              lastCompletedDate: dateKey
            };
          }

          return {
            dailyHistory: {
              ...currentHistory,
              [dateKey]: {
                bestMs,
                bestJumps,
                medal: nextMedal,
                ...(nextGhost ? { ghostTrajectory: nextGhost } : {})
              }
            },
            dailyStreak: nextStreak
          };
        }),

      recordMoleculeScore: (
        moleculeId: string,
        score: number,
        ghostTrajectory?: string,
        meta?: RecordScoreMeta
      ) =>
        set((state) => {
          const currentMap = state.moleculeScores ?? {};
          const prevItem = currentMap[moleculeId];
          const currentBest = prevItem?.best ?? 0;
          const isNewBest = currentBest === 0 || score < currentBest;
          const best = currentBest === 0 ? score : Math.min(currentBest, score);
          const trajectoryToSave = isNewBest
            ? (ghostTrajectory ?? prevItem?.ghostTrajectory)
            : prevItem?.ghostTrajectory;

          const bestJumps =
            meta?.jumpCount !== undefined
              ? prevItem?.bestJumps !== undefined
                ? Math.min(prevItem.bestJumps, meta.jumpCount)
                : meta.jumpCount
              : prevItem?.bestJumps;

          const lastJumps = meta?.jumpCount !== undefined ? meta.jumpCount : prevItem?.lastJumps;

          const bestSwitches =
            meta?.switchCount !== undefined
              ? prevItem?.bestSwitches !== undefined
                ? Math.min(prevItem.bestSwitches, meta.switchCount)
                : meta.switchCount
              : prevItem?.bestSwitches;

          const medal =
            meta?.medal !== undefined ? bestMedal(prevItem?.medal, meta.medal) : prevItem?.medal;

          const coherentRun = Boolean(prevItem?.coherentRun || meta?.coherentRun);
          const bestStyleScore =
            meta?.styleScore !== undefined
              ? Math.max(prevItem?.bestStyleScore ?? 0, meta.styleScore)
              : prevItem?.bestStyleScore;
          const lastStyleScore =
            meta?.styleScore !== undefined ? meta.styleScore : prevItem?.lastStyleScore;

          const unlockedMolecules = state.unlockedMolecules.includes(moleculeId)
            ? state.unlockedMolecules
            : [...state.unlockedMolecules, moleculeId];

          return {
            unlockedMolecules,
            moleculeScores: {
              ...currentMap,
              [moleculeId]: {
                last: score,
                best,
                ...(trajectoryToSave ? { ghostTrajectory: trajectoryToSave } : {}),
                ...(bestJumps !== undefined ? { bestJumps } : {}),
                ...(lastJumps !== undefined ? { lastJumps } : {}),
                ...(bestSwitches !== undefined ? { bestSwitches } : {}),
                ...(medal !== undefined ? { medal } : {}),
                ...(coherentRun ? { coherentRun: true } : {}),
                ...(bestStyleScore !== undefined && bestStyleScore > 0 ? { bestStyleScore } : {}),
                ...(lastStyleScore !== undefined && lastStyleScore > 0 ? { lastStyleScore } : {})
              }
            }
          };
        }),

      recordCustomModeScore: (
        modeLevelId: string,
        score: number,
        ghostTrajectory?: string,
        meta?: RecordScoreMeta
      ) =>
        set((state) => {
          const currentMap = state.customModeScores ?? {};
          const prevItem = currentMap[modeLevelId];
          const currentBest = prevItem?.best ?? 0;
          const isNewBest = currentBest === 0 || score < currentBest;
          const best = currentBest === 0 ? score : Math.min(currentBest, score);
          const trajectoryToSave = isNewBest
            ? (ghostTrajectory ?? prevItem?.ghostTrajectory)
            : prevItem?.ghostTrajectory;

          const bestJumps =
            meta?.jumpCount !== undefined
              ? prevItem?.bestJumps !== undefined
                ? Math.min(prevItem.bestJumps, meta.jumpCount)
                : meta.jumpCount
              : prevItem?.bestJumps;

          const lastJumps = meta?.jumpCount !== undefined ? meta.jumpCount : prevItem?.lastJumps;

          const bestSwitches =
            meta?.switchCount !== undefined
              ? prevItem?.bestSwitches !== undefined
                ? Math.min(prevItem.bestSwitches, meta.switchCount)
                : meta.switchCount
              : prevItem?.bestSwitches;

          const medal =
            meta?.medal !== undefined ? bestMedal(prevItem?.medal, meta.medal) : prevItem?.medal;

          const coherentRun = Boolean(prevItem?.coherentRun || meta?.coherentRun);
          const bestStyleScore =
            meta?.styleScore !== undefined
              ? Math.max(prevItem?.bestStyleScore ?? 0, meta.styleScore)
              : prevItem?.bestStyleScore;
          const lastStyleScore =
            meta?.styleScore !== undefined ? meta.styleScore : prevItem?.lastStyleScore;

          return {
            customModeScores: {
              ...currentMap,
              [modeLevelId]: {
                last: score,
                best,
                ...(trajectoryToSave ? { ghostTrajectory: trajectoryToSave } : {}),
                ...(bestJumps !== undefined ? { bestJumps } : {}),
                ...(lastJumps !== undefined ? { lastJumps } : {}),
                ...(bestSwitches !== undefined ? { bestSwitches } : {}),
                ...(medal !== undefined ? { medal } : {}),
                ...(coherentRun ? { coherentRun: true } : {}),
                ...(bestStyleScore !== undefined && bestStyleScore > 0 ? { bestStyleScore } : {}),
                ...(lastStyleScore !== undefined && lastStyleScore > 0 ? { lastStyleScore } : {})
              }
            }
          };
        }),

      recordScore: (
        level: number,
        score: number,
        ghostTrajectory?: string,
        meta?: RecordScoreMeta
      ) =>
        set((state) => {
          const prevItem = state.scores[level];
          const currentBest = prevItem?.best ?? 0;
          const isNewBest = currentBest === 0 || score < currentBest;
          const best = currentBest === 0 ? score : Math.min(currentBest, score);
          const trajectoryToSave = isNewBest
            ? (ghostTrajectory ?? prevItem?.ghostTrajectory)
            : prevItem?.ghostTrajectory;

          const bestJumps =
            meta?.jumpCount !== undefined
              ? prevItem?.bestJumps !== undefined
                ? Math.min(prevItem.bestJumps, meta.jumpCount)
                : meta.jumpCount
              : prevItem?.bestJumps;

          const lastJumps = meta?.jumpCount !== undefined ? meta.jumpCount : prevItem?.lastJumps;

          const bestSwitches =
            meta?.switchCount !== undefined
              ? prevItem?.bestSwitches !== undefined
                ? Math.min(prevItem.bestSwitches, meta.switchCount)
                : meta.switchCount
              : prevItem?.bestSwitches;

          const medal =
            meta?.medal !== undefined ? bestMedal(prevItem?.medal, meta.medal) : prevItem?.medal;

          const coherentRun = Boolean(prevItem?.coherentRun || meta?.coherentRun);
          const bestStyleScore =
            meta?.styleScore !== undefined
              ? Math.max(prevItem?.bestStyleScore ?? 0, meta.styleScore)
              : prevItem?.bestStyleScore;
          const lastStyleScore =
            meta?.styleScore !== undefined ? meta.styleScore : prevItem?.lastStyleScore;

          const newScores = {
            ...state.scores,
            [level]: {
              last: score,
              best,
              ...(trajectoryToSave ? { ghostTrajectory: trajectoryToSave } : {}),
              ...(bestJumps !== undefined ? { bestJumps } : {}),
              ...(lastJumps !== undefined ? { lastJumps } : {}),
              ...(bestSwitches !== undefined ? { bestSwitches } : {}),
              ...(medal !== undefined ? { medal } : {}),
              ...(prevItem?.bellSync ? { bellSync: true } : {}),
              ...(coherentRun ? { coherentRun: true } : {}),
              ...(bestStyleScore !== undefined && bestStyleScore > 0 ? { bestStyleScore } : {}),
              ...(lastStyleScore !== undefined && lastStyleScore > 0 ? { lastStyleScore } : {})
            }
          };
          const isEntangled = isEntanglementLevelId(level);
          const nextClassicLevel = level === 109 ? 115 : level + 1;
          const maxLevel =
            !isEntangled && score > 0 ? Math.max(state.maxLevel, nextClassicLevel) : state.maxLevel;
          const maxEntanglementLevel =
            isEntangled && score > 0
              ? Math.min(
                  ENTANGLEMENT_LEVEL_MAX,
                  Math.max(state.maxEntanglementLevel ?? 110, level + 1)
                )
              : (state.maxEntanglementLevel ?? 110);

          return {
            scores: newScores,
            maxLevel,
            maxEntanglementLevel
          };
        }),

      recordCoherenceResult: (level: number, styleScore: number, coherentRun: boolean) =>
        set((state) => {
          const prevItem = state.scores[level] ?? { best: 0, last: 0 };
          const nextCoherentRun = Boolean(prevItem.coherentRun || coherentRun);
          const nextBestStyleScore = Math.max(prevItem.bestStyleScore ?? 0, styleScore);
          return {
            scores: {
              ...state.scores,
              [level]: {
                ...prevItem,
                ...(nextCoherentRun ? { coherentRun: true } : {}),
                ...(nextBestStyleScore > 0 ? { bestStyleScore: nextBestStyleScore } : {}),
                ...(styleScore > 0 ? { lastStyleScore: styleScore } : {})
              }
            }
          };
        }),

      saveGhostTrajectory: (level: number, trajectory: string) =>
        set((state) => {
          const prevItem = state.scores[level];
          if (!prevItem) return state;
          return {
            scores: {
              ...state.scores,
              [level]: {
                ...prevItem,
                ghostTrajectory: trajectory
              }
            }
          };
        }),

      setLevels: (data: Record<string, LevelData> | null) => set({ customLevels: data }),

      resetCustomLevel: (id: string) =>
        set((state) => {
          if (!state.customLevels) return state;
          const key = id.startsWith('level') ? id : `level${id}`;
          if (!(key in state.customLevels)) return state;
          const next = { ...state.customLevels };
          delete next[key];
          return {
            customLevels: Object.keys(next).length > 0 ? next : null
          };
        }),

      setSharedLevel: (level: LevelData | null) => set({ sharedLevel: level }),

      setActiveDuel: (duel: DuelChallenge | null) => set({ activeDuel: duel }),

      setLastRun: (run: LastRunSummary | null) => set({ lastRun: run }),

      setPendingDuelShare: (share: PendingDuelShare | null) => set({ pendingDuelShare: share }),

      saveSharedLevelToCustom: (slot = 1) =>
        set((state) => {
          if (!state.sharedLevel) return state;
          const customLevels = state.customLevels ? { ...state.customLevels } : {};
          const levelKey = `level${slot}`;
          customLevels[levelKey] = {
            ...state.sharedLevel,
            id: String(slot)
          };
          return { customLevels, currentLevel: slot };
        }),

      updateLevelField: ({ level, type, n, prop, value }: UpdateLevelFieldParams) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          const updatedLevel = { ...targetLevel };

          switch (type) {
            case 'platform': {
              updatedLevel.platforms = targetLevel.platforms.map((p, i) =>
                i === Number(n) ? { ...p, [prop as string]: Number(value) } : p
              );
              break;
            }
            case 'particle': {
              updatedLevel.particles = targetLevel.particles.map((p, i) =>
                i === Number(n)
                  ? {
                      ...p,
                      [prop as string]: prop === 'type' ? value : Number(value)
                    }
                  : p
              );
              break;
            }
            case 'player': {
              updatedLevel.player = {
                ...targetLevel.player,
                position: {
                  ...targetLevel.player.position,
                  [prop as string]: Number(value)
                }
              };
              break;
            }
            case 'portal': {
              updatedLevel.door = {
                ...targetLevel.door,
                [prop as string]: Number(value)
              };
              break;
            }
            case 'width': {
              updatedLevel.width = Number(value);
              break;
            }
            case 'height': {
              updatedLevel.height = Number(value);
              break;
            }
            case 'hue': {
              updatedLevel.hue = value;
              break;
            }
            case 'antiHue': {
              updatedLevel.antiHue = value;
              break;
            }
            case 'timeLoop': {
              if (prop === 'enabled') {
                if (value) {
                  updatedLevel.timeLoop = targetLevel.timeLoop ?? {
                    cycleMs: 7000,
                    maxEchoes: 2
                  };
                } else {
                  updatedLevel.timeLoop = undefined;
                }
              } else if (prop === 'cycleMs') {
                const cycleMs = Math.max(3000, Math.min(15000, Number(value) || 7000));
                updatedLevel.timeLoop = {
                  cycleMs,
                  maxEchoes: targetLevel.timeLoop?.maxEchoes ?? 2
                };
              } else if (prop === 'maxEchoes') {
                const maxEchoes = Math.max(1, Math.min(3, Math.round(Number(value) || 2)));
                updatedLevel.timeLoop = {
                  cycleMs: targetLevel.timeLoop?.cycleMs ?? 7000,
                  maxEchoes
                };
              }
              break;
            }
            case 'platformSuperposition': {
              const targetIdx = Number(n);
              updatedLevel.platforms = targetLevel.platforms.map((p, i) => {
                if (i !== targetIdx) return p;
                if (prop === 'enabled') {
                  if (value) {
                    return {
                      ...p,
                      superposition: p.superposition ?? {
                        altX: p.x,
                        altY: Math.max(40, p.y - 120),
                        periodMs: 3000,
                        lockDurationMs: 3000
                      }
                    };
                  }
                  const { superposition: _removed, ...rest } = p;
                  return rest;
                }
                const current = p.superposition ?? {
                  altX: p.x,
                  altY: Math.max(40, p.y - 120),
                  periodMs: 3000,
                  lockDurationMs: 3000
                };
                return {
                  ...p,
                  superposition: {
                    ...current,
                    [prop as string]: Number(value)
                  }
                };
              });
              break;
            }
            case 'observerBeam': {
              const targetIdx = Number(n);
              const existing = targetLevel.observerBeams ?? [];
              updatedLevel.observerBeams = existing.map((beam, i) =>
                i === targetIdx
                  ? {
                      ...beam,
                      [prop as string]: Number(value)
                    }
                  : beam
              );
              break;
            }
            default:
              return state;
          }

          customLevels[levelKey] = updatedLevel;
          return { customLevels };
        }),

      addPlatform: ({ level }: { level: number }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          customLevels[levelKey] = {
            ...targetLevel,
            platforms: [...targetLevel.platforms, { ...defaultPlatform }]
          };
          return { customLevels };
        }),

      deletePlatform: ({ level, n }: { level: number; n: number | string }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          customLevels[levelKey] = {
            ...targetLevel,
            platforms: targetLevel.platforms.filter((_, i) => i !== Number(n))
          };
          return { customLevels };
        }),

      addParticle: ({ level }: { level: number }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          customLevels[levelKey] = {
            ...targetLevel,
            particles: [...targetLevel.particles, { ...defaultParticle }]
          };
          return { customLevels };
        }),

      deleteParticle: ({ level, n }: { level: number; n: number | string }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          customLevels[levelKey] = {
            ...targetLevel,
            particles: targetLevel.particles.filter((_, i) => i !== Number(n))
          };
          return { customLevels };
        }),

      addObserverBeam: ({ level }: { level: number }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};

          customLevels[levelKey] = {
            ...targetLevel,
            observerBeams: [...(targetLevel.observerBeams ?? []), { ...defaultObserverBeam }]
          };
          return { customLevels };
        }),

      deleteObserverBeam: ({ level, n }: { level: number; n: number | string }) =>
        set((state) => {
          const levelKey = `level${level}`;
          const sourceLevel = state.customLevels?.[levelKey] ?? getCachedLevel(levelKey);
          if (!sourceLevel) return state;

          const targetLevel = state.customLevels?.[levelKey]
            ? sourceLevel
            : structuredClone(sourceLevel);
          const customLevels = state.customLevels ? { ...state.customLevels } : {};
          const nextBeams = (targetLevel.observerBeams ?? []).filter((_, i) => i !== Number(n));

          customLevels[levelKey] = {
            ...targetLevel,
            observerBeams: nextBeams.length > 0 ? nextBeams : undefined
          };
          return { customLevels };
        })
    }),
    {
      name: 'qtmhro',
      version: 2,
      storage: createJSONStorage(() => customStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 2 && state.customLevels && typeof state.customLevels === 'object') {
          const filtered: Record<string, LevelData> = {};
          for (const [k, v] of Object.entries(state.customLevels as Record<string, LevelData>)) {
            const match = /^level(\d+)$/.exec(k);
            // Keep only user-created/shared custom slots (level >= 1000); drop stale built-in cache
            if (!match || Number.parseInt(match[1], 10) >= 1000) {
              filtered[k] = v;
            }
          }
          state.customLevels = Object.keys(filtered).length > 0 ? filtered : null;
        }
        return state;
      },
      partialize: (state) => ({
        currentLevel: state.currentLevel,
        maxLevel: state.maxLevel,
        maxEntanglementLevel: state.maxEntanglementLevel,
        scores: state.scores,
        customLevels: state.customLevels,
        isMuted: state.isMuted,
        hapticsEnabled: state.hapticsEnabled,
        reducedEffects: state.reducedEffects,
        heroSkin: state.heroSkin,
        ghostMode: state.ghostMode,
        ghostEnabled: state.ghostEnabled,
        locale: state.locale,
        unlockedMolecules: state.unlockedMolecules,
        moleculeScores: state.moleculeScores,
        customModeScores: state.customModeScores,
        dailyHistory: state.dailyHistory,
        dailyStreak: state.dailyStreak,
        acceleratorBest: state.acceleratorBest
      })
    }
  )
);

export default useGameStore;
