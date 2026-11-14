import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as levelsData from '../data/levels';
import type { LevelData, ScoreItem } from '../types';
import type { GhostMode } from '../types';

export interface UpdateLevelFieldParams {
  level: number;
  type: string;
  n?: number | string;
  prop?: string;
  value: any;
}

export type { GhostMode };

export interface GameStoreState {
  currentLevel: number;
  maxLevel: number;
  maxEntanglementLevel: number;
  scores: Record<number, ScoreItem>;
  customLevels: Record<string, LevelData> | null;
  isMuted: boolean;
  hapticsEnabled: boolean;
  reducedEffects: boolean;
  ghostMode: GhostMode;
  ghostEnabled: boolean;
  sharedLevel: LevelData | null;
}

export interface GameStoreActions {
  updateCurrentLevel: (lvl: number) => void;
  updateMaxLevel: (lvl: number) => void;
  updateMaxEntanglementLevel: (lvl: number) => void;
  resetGame: () => void;
  recordScore: (level: number, score: number, ghostTrajectory?: string) => void;
  saveGhostTrajectory: (level: number, trajectory: string) => void;
  setLevels: (data: Record<string, LevelData> | null) => void;
  setSharedLevel: (level: LevelData | null) => void;
  saveSharedLevelToCustom: (slot?: number) => void;
  updateLevelField: (params: UpdateLevelFieldParams) => void;
  addPlatform: (params: { level: number }) => void;
  deletePlatform: (params: { level: number; n: number | string }) => void;
  addParticle: (params: { level: number }) => void;
  deleteParticle: (params: { level: number; n: number | string }) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleHaptics: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  toggleReducedEffects: () => void;
  setReducedEffects: (reduced: boolean) => void;
  toggleGhost: (hasPersonalBest?: boolean) => void;
  setGhostMode: (mode: GhostMode) => void;
  setGhostEnabled: (enabled: boolean) => void;
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
          ghostMode: (parsed.state?.ghostMode ??
            (parsed.state?.ghostEnabled === false ? 'off' : 'optimal')) as GhostMode,
          ghostEnabled:
            parsed.state?.ghostEnabled ??
            (parsed.state?.ghostMode ? parsed.state.ghostMode !== 'off' : true)
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
      isMuted: false,
      hapticsEnabled: true,
      reducedEffects: false,
      ghostMode: 'optimal',
      ghostEnabled: true,

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMuted: (muted: boolean) => set({ isMuted: muted }),

      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      setHapticsEnabled: (enabled: boolean) => set({ hapticsEnabled: enabled }),

      toggleReducedEffects: () => set((state) => ({ reducedEffects: !state.reducedEffects })),
      setReducedEffects: (reduced: boolean) => set({ reducedEffects: reduced }),

      toggleGhost: (hasPersonalBest?: boolean) =>
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
            nextMode = canUseBest ? 'best' : 'off';
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

      updateCurrentLevel: (lvl: number) => set({ currentLevel: Number(lvl) }),

      updateMaxLevel: (lvl: number) => set({ maxLevel: Number(lvl) }),

      updateMaxEntanglementLevel: (lvl: number) => set({ maxEntanglementLevel: Number(lvl) }),

      resetGame: () =>
        set({
          currentLevel: 0,
          maxLevel: 1,
          maxEntanglementLevel: 110,
          scores: {},
          sharedLevel: null
        }),

      recordScore: (level: number, score: number, ghostTrajectory?: string) =>
        set((state) => {
          const prevItem = state.scores[level];
          const currentBest = prevItem?.best ?? 0;
          const isNewBest = currentBest === 0 || score < currentBest;
          const best = currentBest === 0 ? score : Math.min(currentBest, score);
          const trajectoryToSave = isNewBest
            ? (ghostTrajectory ?? prevItem?.ghostTrajectory)
            : prevItem?.ghostTrajectory;

          const newScores = {
            ...state.scores,
            [level]: {
              last: score,
              best,
              ...(trajectoryToSave ? { ghostTrajectory: trajectoryToSave } : {})
            }
          };
          const isEntangled = level >= 110;
          const maxLevel =
            !isEntangled && score > 0 ? Math.max(state.maxLevel, level + 1) : state.maxLevel;
          const maxEntanglementLevel =
            isEntangled && score > 0
              ? Math.max(state.maxEntanglementLevel ?? 110, level + 1)
              : (state.maxEntanglementLevel ?? 110);

          return {
            scores: newScores,
            maxLevel,
            maxEntanglementLevel
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

      setSharedLevel: (level: LevelData | null) => set({ sharedLevel: level }),

      saveSharedLevelToCustom: (slot = 1) =>
        set((state) => {
          if (!state.sharedLevel) return state;
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${slot}`;
          customLevels[levelKey] = {
            ...state.sharedLevel,
            id: String(slot)
          };
          return { customLevels, currentLevel: slot };
        }),

      updateLevelField: ({ level, type, n, prop, value }: UpdateLevelFieldParams) =>
        set((state) => {
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${level}`;
          const targetLevel = customLevels[levelKey];
          if (!targetLevel) return state;

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
            default:
              return state;
          }

          customLevels[levelKey] = updatedLevel;
          return { customLevels };
        }),

      addPlatform: ({ level }: { level: number }) =>
        set((state) => {
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${level}`;
          const targetLevel = customLevels[levelKey];
          if (!targetLevel) return state;

          customLevels[levelKey] = {
            ...targetLevel,
            platforms: [...targetLevel.platforms, { ...defaultPlatform }]
          };
          return { customLevels };
        }),

      deletePlatform: ({ level, n }: { level: number; n: number | string }) =>
        set((state) => {
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${level}`;
          const targetLevel = customLevels[levelKey];
          if (!targetLevel) return state;

          customLevels[levelKey] = {
            ...targetLevel,
            platforms: targetLevel.platforms.filter((_, i) => i !== Number(n))
          };
          return { customLevels };
        }),

      addParticle: ({ level }: { level: number }) =>
        set((state) => {
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${level}`;
          const targetLevel = customLevels[levelKey];
          if (!targetLevel) return state;

          customLevels[levelKey] = {
            ...targetLevel,
            particles: [...targetLevel.particles, { ...defaultParticle }]
          };
          return { customLevels };
        }),

      deleteParticle: ({ level, n }: { level: number; n: number | string }) =>
        set((state) => {
          const customLevels = state.customLevels
            ? { ...state.customLevels }
            : ({ ...levelsData } as unknown as Record<string, LevelData>);
          const levelKey = `level${level}`;
          const targetLevel = customLevels[levelKey];
          if (!targetLevel) return state;

          customLevels[levelKey] = {
            ...targetLevel,
            particles: targetLevel.particles.filter((_, i) => i !== Number(n))
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
        ghostMode: state.ghostMode,
        ghostEnabled: state.ghostEnabled
      })
    }
  )
);

export default useGameStore;
