import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class MockSprite {}
      }
    },
    Display: {
      Color: {
        HexStringToColor: (hex: string) => ({
          color: Number.parseInt(hex.replace('#', ''), 16) || 0xffffff
        })
      }
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    }
  }
}));

import {
  SCHRODINGER_LEVELS,
  getNextSchrodingerLevel,
  getSchrodingerLevelById
} from '../../data/schrodingerLevels';
import { gameEvents } from '../../tools/gameEvents';
import type { LevelData } from '../../types';
import { buildPlatforms, buildSpikesAndCollapse } from './PlatformFactory';
import { QuantumSystems } from './QuantumSystems';
import type { GameSceneContext } from './types';

function createMockGraphics() {
  return {
    setDepth: vi.fn(),
    clear: vi.fn(),
    lineStyle: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    lineBetween: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    fillTriangle: vi.fn(),
    strokeTriangle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
    destroy: vi.fn()
  };
}

function createMockRect(x: number, y: number, width: number, height: number) {
  const data = new Map<string, unknown>();
  const rect = {
    x,
    y,
    width,
    height,
    visible: true,
    alpha: 1,
    body: {
      enable: true,
      checkCollision: { none: false },
      updateFromGameObject: vi.fn()
    },
    setData: vi.fn((k: string, v: unknown) => {
      data.set(k, v);
      return rect;
    }),
    getData: vi.fn((k: string) => data.get(k)),
    setVisible: vi.fn((v: boolean) => {
      rect.visible = v;
      return rect;
    }),
    setAlpha: vi.fn((a: number) => {
      rect.alpha = a;
      return rect;
    }),
    setStrokeStyle: vi.fn(() => rect),
    setPosition: vi.fn((nx: number, ny: number) => {
      rect.x = nx;
      rect.y = ny;
      return rect;
    }),
    setDepth: vi.fn(() => rect)
  };
  return rect;
}

function createMockContext(levelData: LevelData, heroX = 120, heroY = 480): GameSceneContext {
  const platformsChildren: unknown[] = [];
  const spikesChildren: unknown[] = [];
  const ctx = {
    levelData,
    add: {
      rectangle: vi.fn((x: number, y: number, w: number, h: number) => createMockRect(x, y, w, h)),
      graphics: vi.fn(() => createMockGraphics())
    },
    physics: {
      add: {
        staticGroup: vi.fn(() => ({
          add: vi.fn((obj: unknown) => platformsChildren.push(obj)),
          getChildren: () => platformsChildren
        })),
        group: vi.fn(() => ({
          add: vi.fn((obj: unknown) => spikesChildren.push(obj))
        })),
        existing: vi.fn()
      }
    },
    time: { now: 0 },
    heroes: [
      {
        x: heroX,
        y: heroY,
        active: true,
        isFocused: true,
        flipX: false,
        body: { velocity: { x: 0, y: 0 }, touching: { down: true }, blocked: { down: true } }
      }
    ],
    phasePlatforms: [],
    decayPlatforms: [],
    crackedPlatforms: [],
    ephemeralPlatforms: [],
    liquidPlatforms: [],
    gasPlatforms: [],
    pinnablePlatforms: [],
    movingPlatforms: [],
    superposedPlatforms: [],
    superposedSpikes: [],
    wavefunctionGraphics: createMockGraphics(),
    observerBeamGraphics: createMockGraphics(),
    activeObserverFlash: null,
    isLevelCompleted: false,
    isRespawning: false,
    isTransitioningLevel: false,
    jumpCount: 0,
    hasPhasePlatforms: false,
    currentPhase: 'cyan',
    toggleLevelPhase: vi.fn(),
    applyPhase: vi.fn()
  } as unknown as GameSceneContext;

  return ctx;
}

describe('Wavefunction Collapse Phaser Integration (Spec-02)', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  it('builds superposed platforms as intangible initially, collapses deterministically on active observation, and reverts after lockDurationMs', () => {
    const levelData: LevelData = {
      id: 'test-schrodinger-plat',
      symbol: 'Ψ₁',
      atom: 'Test',
      width: 960,
      height: 600,
      hue: '#0c1028',
      antiHue: '#a855f7',
      player: { position: { x: 120, y: 480 } },
      door: { x: 860, y: 500 },
      platforms: [
        { x: 0, y: 540, width: 220, height: 60 },
        {
          x: 260,
          y: 480,
          width: 180,
          height: 24,
          superposition: { altX: 260, altY: 340, periodMs: 2000, lockDurationMs: 3000 }
        }
      ],
      spikes: [],
      particles: []
    };

    const ctx = createMockContext(levelData, 140, 480);
    buildPlatforms(ctx);
    const systems = new QuantumSystems(ctx);

    expect(ctx.superposedPlatforms).toHaveLength(1);
    const entry = ctx.superposedPlatforms?.[0];
    if (!entry) throw new Error('Expected superposed platform entry');
    const body = entry.rect.body as unknown as {
      enable: boolean;
      checkCollision: { none: boolean };
    };

    // Initially unobserved -> intangible
    expect(entry.runtime.collapsedState).toBeNull();
    expect(body.enable).toBe(false);
    expect(body.checkCollision.none).toBe(true);

    const collapseEvents: unknown[] = [];
    gameEvents.on('wavefunction:collapse', (payload) => collapseEvents.push(payload));

    // At elapsedMs = 0 (p = 1.0 >= 0.5), active observation collapses to state A
    systems.updateWavefunctionCollapse(0, 16, 0);
    const count = systems.triggerActiveObservation();
    expect(count).toBe(1);
    expect(entry.runtime.collapsedState).toBe('A');
    expect(body.enable).toBe(true);
    expect(body.checkCollision.none).toBe(false);
    expect(entry.rect.x).toBe(260 + 90);
    expect(entry.rect.y).toBe(480 + 12);
    expect(ctx.activeObserverFlash).not.toBeNull();
    expect(collapseEvents).toHaveLength(1);

    // Advance 3050ms -> lock expires -> reverts to intangible superposition
    systems.updateWavefunctionCollapse(3050, 3050, 3050);
    expect(entry.runtime.collapsedState).toBeNull();
    expect(body.enable).toBe(false);
    expect(body.checkCollision.none).toBe(true);

    // At elapsedMs = 1000ms (p = 0 < 0.5), direct pointer click collapses to state B
    const countB = systems.triggerActiveObservation({ x: 320, y: 350 }, 1000);
    expect(countB).toBe(1);
    expect(entry.runtime.collapsedState).toBe('B');
    expect(body.enable).toBe(true);
    expect(entry.rect.y).toBe(340 + 12);
    expect(collapseEvents).toHaveLength(2);
  });

  it('neutralizes superposed spikes by collapsing them to their safe state B', () => {
    const levelData: LevelData = {
      id: 'test-schrodinger-spike',
      symbol: 'Ψ₂',
      atom: 'Spike Test',
      width: 960,
      height: 600,
      hue: '#140c2b',
      antiHue: '#c084fc',
      player: { position: { x: 120, y: 490 } },
      door: { x: 860, y: 500 },
      platforms: [{ x: 0, y: 540, width: 960, height: 60 }],
      spikes: [
        {
          x: 260,
          y: 516,
          width: 140,
          height: 24,
          superposition: { altX: 260, altY: 180, periodMs: 2000, lockDurationMs: 3000 }
        }
      ],
      particles: []
    };

    const ctx = createMockContext(levelData, 140, 500);
    buildSpikesAndCollapse(ctx);
    const systems = new QuantumSystems(ctx);

    expect(ctx.superposedSpikes).toHaveLength(1);
    const spikeEntry = ctx.superposedSpikes?.[0];
    if (!spikeEntry) throw new Error('Expected superposed spike entry');
    const body = spikeEntry.rect.body as unknown as {
      enable: boolean;
      checkCollision: { none: boolean };
    };

    // Intangible while unobserved
    expect(body.enable).toBe(false);

    // At t = 1000ms (p = 0 < 0.5), state B (safe ceiling y=180) is dominant
    systems.updateWavefunctionCollapse(1000, 16, 1000);
    const collapsed = systems.triggerActiveObservation();
    expect(collapsed).toBe(1);
    expect(spikeEntry.runtime.collapsedState).toBe('B');
    expect(spikeEntry.rect.y).toBe(180 + 12);
    expect(body.enable).toBe(true);
  });

  it('automatically collapses superposed platforms when swept by a passive ObserverBeam', () => {
    const levelData: LevelData = {
      id: 'test-observer-beam',
      symbol: 'Ψ₄',
      atom: 'Beam Test',
      width: 960,
      height: 600,
      hue: '#0f102c',
      antiHue: '#00e5ff',
      observerBeams: [
        {
          x: 480,
          y: 60,
          sweepAngleDeg: 120,
          speedDegPerSec: 40,
          range: 560
        }
      ],
      player: { position: { x: 80, y: 490 } },
      door: { x: 880, y: 500 },
      platforms: [
        {
          x: 420,
          y: 440,
          width: 120,
          height: 22,
          superposition: { altX: 420, altY: 360, periodMs: 3000, lockDurationMs: 3000 }
        }
      ],
      spikes: [],
      particles: []
    };

    const ctx = createMockContext(levelData, 80, 490);
    buildPlatforms(ctx);
    const systems = new QuantumSystems(ctx);
    const entry = ctx.superposedPlatforms?.[0];
    if (!entry) throw new Error('Expected superposed platform entry');

    // At t = 0ms, beam points at 30 deg (far right), does not hit center platform (480, 440)
    systems.updateWavefunctionCollapse(0, 16, 0);
    expect(entry.runtime.collapsedState).toBeNull();

    // At t = 1500ms, beam points straight down at 90 deg -> hits center platform!
    systems.updateWavefunctionCollapse(1500, 16, 1500);
    expect(entry.runtime.collapsedState).not.toBeNull();
    expect(entry.runtime.lastCollapsedBy).toBe('beam');
    const body = entry.rect.body as unknown as { enable: boolean };
    expect(body.enable).toBe(true);
  });

  it('validates all 6 Schrödinger Labs showcase levels have unique IDs, valid progression, and wavefunction mechanics', () => {
    expect(SCHRODINGER_LEVELS).toHaveLength(6);
    const ids = new Set(SCHRODINGER_LEVELS.map((l) => l.id));
    expect(ids.size).toBe(6);

    for (let i = 0; i < SCHRODINGER_LEVELS.length; i++) {
      const entry = SCHRODINGER_LEVELS[i];
      expect(entry.id).toBe(`schrodinger-${i + 1}`);
      expect(getSchrodingerLevelById(entry.id)?.id).toBe(entry.id);

      const superPlats = entry.levelData.platforms.filter((p) => Boolean(p.superposition));
      const superSpikes = entry.levelData.spikes.filter((s) => Boolean(s.superposition));
      expect(superPlats.length + superSpikes.length).toBeGreaterThan(0);

      for (const p of superPlats) {
        expect(p.superposition?.periodMs).toBeGreaterThan(0);
      }
      for (const s of superSpikes) {
        expect(s.superposition?.periodMs).toBeGreaterThan(0);
      }

      const next = getNextSchrodingerLevel(entry.id);
      if (i < SCHRODINGER_LEVELS.length - 1) {
        expect(next?.id).toBe(`schrodinger-${i + 2}`);
      } else {
        expect(next).toBeUndefined();
      }
    }

    // Levels 4, 5, 6 must include passive observerBeams
    expect(SCHRODINGER_LEVELS[3].levelData.observerBeams?.length).toBeGreaterThanOrEqual(1);
    expect(SCHRODINGER_LEVELS[4].levelData.observerBeams?.length).toBeGreaterThanOrEqual(1);
    expect(SCHRODINGER_LEVELS[5].levelData.observerBeams?.length).toBeGreaterThanOrEqual(2);
  });
});
