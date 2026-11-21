import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTouchController } from '../../input/MobileTouchController';
import { createQuantumPinningState } from '../../physics/matterStates';
import { SessionSwarmBuffer } from '../../services/GhostManager';
import { useGameStore } from '../../store';
import { GhostRecorder } from '../../tools/GhostRecorder';

vi.mock('phaser', () => ({
  default: {
    Display: {
      Color: {
        HexStringToColor: vi.fn(() => ({ color: 0x00e5ff }))
      }
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    }
  }
}));

import { RespawnTransitionController } from './RespawnTransitionController';
import type { GameSceneContext } from './types';

function makeRespawnContext(): GameSceneContext {
  return {
    levelData: {
      id: '1',
      atom: 'Hydrogen',
      symbol: 'H',
      width: 800,
      height: 600,
      hue: '#070737',
      antiHue: '#00e5ff',
      parTimeMs: 10000,
      parJumps: 3,
      player: { position: { x: 100, y: 400 } },
      door: { x: 700, y: 400 },
      platforms: [],
      spikes: [],
      particles: []
    },
    heroes: [
      {
        x: 420,
        y: 350,
        flipX: false,
        flipY: false,
        isBeta: false,
        isFocused: true,
        active: true,
        body: { enable: true },
        setVelocity: vi.fn(),
        destroy: vi.fn()
      }
    ],
    portalSprite: { x: 652, y: 304 },
    betaPortalSprite: null,
    isEntangled: false,
    isRespawning: false,
    isLevelCompleted: false,
    isTransitioningLevel: false,
    canAdvanceLevel: false,
    nextLevelNumberPending: null,
    deathEchoes: [],
    broglieCrystals: [],
    screenWrapGhosts: [],
    decayPlatforms: [],
    crackedPlatforms: [],
    movingPlatforms: [],
    pressurePlatesList: [],
    gatesMap: new Map(),
    hasPhasePlatforms: false,
    currentPhase: 'cyan',
    quantumPinningState: createQuantumPinningState(),
    touchController: new MobileTouchController(),
    ghostRecorder: new GhostRecorder(),
    swarmBuffer: new SessionSwarmBuffer(),
    ghostHero: null,
    hasAnyGhost: false,
    timerStarted: true,
    startTime: 100,
    dilatedElapsedMs: 3200,
    jumpCount: 2,
    switchCount: 0,
    timerText: { active: true, setText: vi.fn(), setColor: vi.fn() },
    splitDeltaText: { active: true, setText: vi.fn(), setColor: vi.fn() },
    physics: { world: { gravity: { y: -900 }, timeScale: 2 } },
    cameras: {
      main: {
        flash: vi.fn(),
        setZoom: vi.fn(),
        startFollow: vi.fn(),
        fadeOut: vi.fn(),
        fadeIn: vi.fn(),
        once: vi.fn((_ev: string, cb: () => void) => cb())
      }
    },
    add: {
      sprite: vi.fn((x: number, y: number) => ({
        x,
        y,
        alpha: 1,
        setAlpha: vi.fn(function (this: { alpha: number }, a: number) {
          this.alpha = a;
        }),
        setTint: vi.fn(),
        setDepth: vi.fn()
      })),
      circle: vi.fn(() => ({ setDepth: vi.fn(), destroy: vi.fn() }))
    },
    tweens: { add: vi.fn() },
    time: { now: 3300, delayedCall: vi.fn((_ms: number, cb: () => void) => cb()) },
    spawnHeroes: vi.fn(),
    updateEdgePips: vi.fn(),
    restoreEphemeralPlatforms: vi.fn(() => 0),
    spawnSwarmGhosts: vi.fn(),
    showLevelCompleteOverlay: vi.fn(),
    resolveLevelData: vi.fn((n: number) => ({
      id: String(n),
      atom: 'Helium',
      symbol: 'He',
      width: 800,
      height: 600,
      hue: '#070737',
      antiHue: '#00e5ff',
      player: { position: { x: 100, y: 400 } },
      door: { x: 700, y: 400 },
      platforms: [],
      spikes: [],
      particles: []
    })),
    clearLevelObjects: vi.fn(),
    buildLevel: vi.fn(),
    triggerIronCoreCollapse: vi.fn(),
    revealPeriodicTableSilhouette: vi.fn()
  } as unknown as GameSceneContext;
}

describe('RespawnTransitionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
    useGameStore.getState().updateCurrentLevel(1);
  });

  it('quickRespawn leaves a Death Echo at 0.16 alpha, resets timer/jumps, and flashes camera', () => {
    const ctx = makeRespawnContext();
    const controller = new RespawnTransitionController(ctx);

    controller.quickRespawn({ x: 310, y: 475 });

    expect(ctx.deathEchoes).toHaveLength(1);
    expect(ctx.deathEchoes[0].x).toBe(310);
    expect(ctx.deathEchoes[0].alpha).toBe(0.16);
    expect(ctx.timerStarted).toBe(false);
    expect(ctx.dilatedElapsedMs).toBe(0);
    expect(ctx.jumpCount).toBe(0);
    expect(ctx.spawnHeroes).toHaveBeenCalledTimes(1);
    expect(ctx.cameras.main.flash).toHaveBeenCalledWith(120, 0, 229, 255, false);
    expect(ctx.isRespawning).toBe(false);
  });

  it('completeLevel records gold medal & score, then advanceToNextLevel transitions cleanly', () => {
    const ctx = makeRespawnContext();
    const controller = new RespawnTransitionController(ctx);

    controller.completeLevel();

    expect(ctx.isLevelCompleted).toBe(true);
    expect(ctx.nextLevelNumberPending).toBe(2);
    expect(useGameStore.getState().scores[1].medal).toBe('gold');
    expect(ctx.showLevelCompleteOverlay).toHaveBeenCalledTimes(1);

    controller.advanceToNextLevel();
    expect(ctx.clearLevelObjects).toHaveBeenCalledTimes(1);
    expect(ctx.buildLevel).toHaveBeenCalledTimes(1);
    expect(ctx.levelData.id).toBe('2');
  });

  it('completeLevel on a daily:YYYY-MM-DD level records daily score & streak without incrementing maxLevel', () => {
    const ctx = makeRespawnContext();
    ctx.levelData = {
      ...ctx.levelData,
      id: 'daily:2026-11-21',
      symbol: 'Fe',
      atom: 'Iron',
      parTimeMs: 5000,
      parJumps: 3
    };
    useGameStore.getState().setSharedLevel(ctx.levelData);
    useGameStore.setState({ maxLevel: 4 });

    const controller = new RespawnTransitionController(ctx);
    controller.completeLevel();

    const state = useGameStore.getState();
    expect(state.maxLevel).toBe(4);
    expect(state.dailyStreak).toEqual({
      current: 1,
      longest: 1,
      lastCompletedDate: '2026-11-21'
    });
    expect(state.dailyHistory['2026-11-21']).toMatchObject({
      bestMs: 3200,
      bestJumps: 2,
      medal: 'gold'
    });
    expect(ctx.nextLevelNumberPending).toBeNull();
    expect(ctx.showLevelCompleteOverlay).toHaveBeenCalledWith(3200, 3200, 0, null, 'gold');
    expect(state.lastRun).toMatchObject({
      kind: 'daily',
      dateKey: '2026-11-21',
      elapsedMs: 3200,
      jumps: 2
    });
  });

  it('records campaign lastRun on completeLevel and clears activeDuel on advanceToNextLevel', () => {
    const ctx = makeRespawnContext();
    useGameStore.getState().setActiveDuel({
      kind: 'campaign',
      levelId: 1,
      challengerName: 'ALPHA',
      challengerTimeMs: 4500,
      challengerJumps: 3,
      ghostTrajectory: 'v1|0,100,400,0,i;4500,700,400,0,r'
    });

    const controller = new RespawnTransitionController(ctx);
    controller.completeLevel();

    const stateAfterComplete = useGameStore.getState();
    expect(stateAfterComplete.lastRun).toMatchObject({
      kind: 'campaign',
      levelId: 1,
      elapsedMs: 3200,
      jumps: 2
    });
    expect(stateAfterComplete.lastRun?.ghostTrajectory.startsWith('v1|')).toBe(true);
    expect(stateAfterComplete.activeDuel?.challengerName).toBe('ALPHA');

    controller.advanceToNextLevel();
    expect(useGameStore.getState().activeDuel).toBeNull();
  });
});
