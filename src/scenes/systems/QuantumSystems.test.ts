import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuantumPinningState } from '../../physics/matterStates';
import { gameEvents } from '../../tools/gameEvents';

vi.mock('phaser', () => {
  class MockSprite {
    public scene: unknown;
    public x: number;
    public y: number;
    public active = true;
    public visible = true;
    public alpha = 1;
    public depth = 0;
    public flipX = false;
    public flipY = false;
    public scaleX = 1;
    public scaleY = 1;
    public body: {
      x: number;
      y: number;
      width: number;
      height: number;
      velocity: { x: number; y: number };
      touching: { down: boolean; up: boolean };
      blocked: { down: boolean; up: boolean };
    } | null = null;
    public anims = { currentAnim: { key: 'idle' } };
    constructor(scene: unknown, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setVelocity(vx: number, vy: number) {
      if (this.body) {
        this.body.velocity.x = vx;
        this.body.velocity.y = vy;
      }
      return this;
    }
    setVelocityX(vx: number) {
      if (this.body) this.body.velocity.x = vx;
      return this;
    }
    setVelocityY(vy: number) {
      if (this.body) this.body.velocity.y = vy;
      return this;
    }
    setBounce() {
      return this;
    }
    setCollideWorldBounds() {
      return this;
    }
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    setTint() {
      return this;
    }
    clearTint() {
      return this;
    }
    setDepth(d: number) {
      this.depth = d;
      return this;
    }
    setScale(sx: number, sy?: number) {
      this.scaleX = sx;
      this.scaleY = sy ?? sx;
      return this;
    }
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }
    setFlipX(v: boolean) {
      this.flipX = v;
      return this;
    }
    setFlipY(v: boolean) {
      this.flipY = v;
      return this;
    }
    setInteractive() {
      return this;
    }
    on() {
      return this;
    }
    play() {
      return this;
    }
    destroy() {
      this.active = false;
    }
  }
  const Display = {
    Color: {
      HexStringToColor: vi.fn((hex: string) => ({
        color: Number.parseInt(hex.replace('#', ''), 16) || 0x00e5ff
      }))
    }
  };
  const MathMock = {
    Clamp: vi.fn((v: number, min: number, max: number) => Math.max(min, Math.min(max, v))),
    Between: vi.fn((min: number, max: number) => Math.floor((min + max) / 2))
  };
  const Physics = { Arcade: { Sprite: MockSprite } };
  const GameObjects = { Sprite: MockSprite };
  return {
    default: { Display, Math: MathMock, Physics, GameObjects },
    Display,
    Math: MathMock,
    Physics,
    GameObjects
  };
});

import Hero from '../Hero';
import { QuantumSystems } from './QuantumSystems';
import type { GameSceneContext } from './types';

function makeQuantumContext(): GameSceneContext {
  const ctx = {
    levelData: {
      id: '10',
      atom: 'Neon',
      symbol: 'Ne',
      width: 800,
      height: 600,
      hue: '#070737',
      antiHue: '#00e5ff',
      screenWrap: 'horizontal',
      player: { position: { x: 100, y: 400 } },
      door: { x: 700, y: 400 },
      platforms: [],
      spikes: [],
      particles: []
    },
    heroes: [] as Hero[],
    heroGroup: { add: vi.fn() },
    isEntangled: false,
    isPauliActive: false,
    hasPhasePlatforms: true,
    currentPhase: 'cyan',
    phasePlatforms: [
      {
        phase: 'cyan',
        rect: {
          getData: vi.fn(() => undefined),
          setAlpha: vi.fn(),
          body: { checkCollision: { none: false } }
        }
      },
      {
        phase: 'magenta',
        rect: {
          getData: vi.fn(() => undefined),
          setAlpha: vi.fn(),
          body: { checkCollision: { none: true } }
        }
      }
    ],
    quantumPinningState: createQuantumPinningState(),
    ephemeralPlatforms: [],
    screenWrapGhosts: [],
    molecules: [],
    broglieCrystals: [],
    time: { now: 1000, delayedCall: vi.fn() },
    anims: { exists: vi.fn(() => false) },
    events: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    physics: {
      world: { gravity: { y: 900 } },
      add: {
        existing: vi.fn((obj: Record<string, unknown>) => {
          if (!obj.body) {
            obj.body = {
              x: 0,
              y: 0,
              width: 32,
              height: 32,
              velocity: { x: 0, y: 0 },
              touching: { down: false, up: false },
              blocked: { down: false, up: false },
              setBounce: vi.fn(),
              setCollideWorldBounds: vi.fn(),
              setSize: vi.fn(),
              setOffset: vi.fn(),
              setVelocity: vi.fn()
            };
          }
        })
      }
    },
    add: {
      existing: vi.fn(),
      sprite: vi.fn(() => ({
        setAlpha: vi.fn(),
        setTint: vi.fn(),
        setDepth: vi.fn(),
        setVisible: vi.fn(),
        setPosition: vi.fn(),
        setFlipX: vi.fn(),
        setFlipY: vi.fn(),
        setScale: vi.fn()
      })),
      circle: vi.fn(() => ({
        setStrokeStyle: vi.fn(),
        setDepth: vi.fn(),
        destroy: vi.fn()
      }))
    },
    tweens: { add: vi.fn() },
    updateEdgePips: vi.fn(),
    showRetroToast: vi.fn()
  } as unknown as GameSceneContext;

  const hero = new Hero(ctx as never, 200, 300, true);
  hero.createdAtMs = 0;
  ctx.heroes.push(hero);
  return ctx;
}

describe('QuantumSystems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles phase platforms and emits phase:shift', () => {
    const ctx = makeQuantumContext();
    const qs = new QuantumSystems(ctx);
    const events: string[] = [];
    const unsub = gameEvents.on('phase:shift', (p) => events.push(p.phase));

    qs.toggleLevelPhase();
    unsub();

    expect(ctx.currentPhase).toBe('magenta');
    expect(events).toEqual(['magenta']);
    expect(ctx.phasePlatforms[0].rect.setAlpha).toHaveBeenCalledWith(0.25);
    expect(ctx.phasePlatforms[1].rect.setAlpha).toHaveBeenCalledWith(1.0);
  });

  it('fuses nearby clones and splits them via in-flight fission', () => {
    const ctx = makeQuantumContext();
    const clone = new Hero(ctx as never, 210, 300, false);
    clone.createdAtMs = 100;
    ctx.heroes.push(clone);

    const qs = new QuantumSystems(ctx);

    expect(qs.tryCloneFusion(900)).toBe(true);
    expect(ctx.heroes).toHaveLength(1);
    expect(ctx.heroes[0].fusionStack).toBe(2);

    expect(qs.tryInFlightFission()).toBe(true);
    expect(ctx.heroes).toHaveLength(2);
    expect(ctx.heroes[0].fusionStack).toBe(1);
    expect(ctx.heroes[0].body?.velocity.y).toBe(-480);
  });

  it('wraps hero across toroidal horizontal boundary', () => {
    const ctx = makeQuantumContext();
    const qs = new QuantumSystems(ctx);
    const hero = ctx.heroes[0];
    hero.x = -5;
    hero.y = 300;

    qs.updateScreenWrap(1000);
    expect(hero.x).toBe(795);
  });

  it('places Broglie condense crystal strictly below hero feet and damps fast downward fall', () => {
    const ctx = makeQuantumContext();
    ctx.hasCondenseAbility = true;
    const rectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
    (ctx.add as unknown as { rectangle: ReturnType<typeof vi.fn> }).rectangle = vi.fn(
      (x: number, y: number, w: number, h: number) => {
        rectCalls.push({ x, y, w, h });
        return {
          setStrokeStyle: vi.fn(),
          setDepth: vi.fn(),
          setAlpha: vi.fn(),
          destroy: vi.fn()
        };
      }
    );
    (ctx as unknown as { platforms: { add: ReturnType<typeof vi.fn> } }).platforms = {
      add: vi.fn()
    };

    const hero = ctx.heroes[0];
    hero.x = 200;
    hero.y = 300;
    (hero.body as unknown as { height: number; velocity: { x: number; y: number } }).height = 64;
    (hero.body as unknown as { velocity: { x: number; y: number } }).velocity.y = 350;

    const qs = new QuantumSystems(ctx);
    expect(qs.matterAndFields.tryCrystallizeBroglieTrail()).toBe(true);

    // Main catch crystal (last segment) must be strictly below feet: y = 300 + (32 + 10) = 342, size 112x16
    const mainCrystal = rectCalls[rectCalls.length - 1];
    expect(mainCrystal.x).toBe(200);
    expect(mainCrystal.y).toBe(342);
    expect(mainCrystal.w).toBe(112);
    expect(mainCrystal.h).toBe(16);
    // Top of crystal (342 - 8 = 334) is strictly below hero feet (300 + 32 = 332)
    expect(mainCrystal.y - mainCrystal.h / 2).toBeGreaterThan(hero.y + 32);

    // Fast downward fall velocity must be damped to 60 * upsideDown
    expect(hero.body?.velocity.y).toBe(60);
  });

  it('does not fuse a clone that is holding down a requireLock pressure plate', () => {
    const ctx = makeQuantumContext();
    ctx.levelData.pressurePlates = [
      {
        id: 'p1',
        x: 180,
        y: 320,
        width: 80,
        height: 12,
        targetGateId: 'g1',
        requireLock: true
      }
    ];
    const clone = new Hero(ctx as never, 210, 300, false);
    clone.createdAtMs = 100;
    ctx.heroes.push(clone);

    const qs = new QuantumSystems(ctx);
    expect(qs.tryCloneFusion(900)).toBe(false);
    expect(ctx.heroes).toHaveLength(2);
  });

  it('tunnels past a 32px wall with full 64px hero clearance and syncs body.prev.x', () => {
    const ctx = makeQuantumContext();
    ctx.levelData.platforms = [{ x: 675, y: 0, width: 32, height: 1200 }];
    const hero = ctx.heroes[0];
    hero.tunnelCharges = 1;
    hero.x = 643;
    hero.y = 400;
    (hero.body as unknown as { x: number; width: number; height: number; prev: { x: number } }).x =
      611;
    (hero.body as unknown as { width: number }).width = 64;
    (hero.body as unknown as { height: number }).height = 64;
    (hero.body as unknown as { prev: { x: number } }).prev = { x: 605 };

    (
      ctx as unknown as {
        touchController: {
          state: { left: boolean; right: boolean; jump: boolean; diveRequested: boolean };
        };
      }
    ).touchController = {
      state: { left: false, right: true, jump: false, diveRequested: false }
    };
    const qs = new QuantumSystems(ctx);
    (qs as unknown as { updateTunneling: () => void }).updateTunneling();
    ctx.touchController.state.right = false;

    // Wall ends at 707 -> exitX = 707 + 32 + 4 = 743 (left edge 711 > 707, zero wall overlap)
    expect(hero.x).toBe(743);
    expect((hero.body as unknown as { prev: { x: number } }).prev.x).toBe(743 - 32);
    expect(hero.tunnelCharges).toBe(0);
  });
});
