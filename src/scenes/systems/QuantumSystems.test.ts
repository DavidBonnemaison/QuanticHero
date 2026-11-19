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
    antigravityBubbles: [],
    bubbleHarvestHits: [],
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

  it('wraps hero across toroidal horizontal boundary and levitates in antigravity bubble', () => {
    const ctx = makeQuantumContext();
    const qs = new QuantumSystems(ctx);
    const hero = ctx.heroes[0];
    hero.x = -5;
    hero.y = 300;

    qs.updateScreenWrap(1000);
    expect(hero.x).toBe(795);

    qs.matterAndFields.spawnAntigravityBubble(795, 300, 1000);
    qs.matterAndFields.updateAntigravityBubbles(1200);
    expect(hero.body?.velocity.y).toBe(-180);

    qs.matterAndFields.updateAntigravityBubbles(5200);
    expect(ctx.antigravityBubbles).toHaveLength(0);
  });
});
