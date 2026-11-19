import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTouchController } from '../../input/MobileTouchController';
import { createQuantumPinningState } from '../../physics/matterStates';
import { SessionSwarmBuffer } from '../../services/GhostManager';
import { GhostRecorder } from '../../tools/GhostRecorder';
import type { LevelData } from '../../types';

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
    public body: Record<string, unknown> | null = null;
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
    setVelocity() {
      return this;
    }
    setVelocityX() {
      return this;
    }
    setVelocityY() {
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
    Between: vi.fn((min: number, max: number) => Math.floor((min + max) / 2)),
    FloatBetween: vi.fn((min: number, max: number) => (min + max) / 2),
    Clamp: vi.fn((v: number, min: number, max: number) => Math.max(min, Math.min(max, v)))
  };
  const BlendModes = { ADD: 1, NORMAL: 0 };
  const Physics = { Arcade: { Sprite: MockSprite } };
  const GameObjects = { Sprite: MockSprite };
  return {
    default: { Display, Math: MathMock, BlendModes, Physics, GameObjects },
    Display,
    Math: MathMock,
    BlendModes,
    Physics,
    GameObjects
  };
});

import { LevelBuilder } from './LevelBuilder';
import type { GameSceneContext } from './types';

function makeMockObj(x = 0, y = 0) {
  const data = new Map<string, unknown>();
  return {
    x,
    y,
    active: true,
    visible: true,
    alpha: 1,
    depth: 0,
    body: {
      setImmovable: vi.fn(),
      setAllowGravity: vi.fn(),
      checkCollision: { none: false },
      enable: true
    },
    setData: vi.fn((k: string, v: unknown) => data.set(k, v)),
    getData: vi.fn((k: string) => data.get(k)),
    setVisible: vi.fn(),
    setStrokeStyle: vi.fn(),
    setDepth: vi.fn(function (this: { depth: number }, d: number) {
      this.depth = d;
      return this;
    }),
    setAlpha: vi.fn(function (this: { alpha: number }, a: number) {
      this.alpha = a;
      return this;
    }),
    setOrigin: vi.fn(),
    setScrollFactor: vi.fn(),
    setScale: vi.fn(),
    setTint: vi.fn(),
    setFlipY: vi.fn(),
    play: vi.fn(),
    destroy: vi.fn()
  };
}

function makeMockGroup() {
  const children: unknown[] = [];
  return {
    add: vi.fn((obj: unknown) => children.push(obj)),
    clear: vi.fn(() => {
      children.length = 0;
    }),
    getChildren: () => children
  };
}

function makeContext(levelData: LevelData): GameSceneContext {
  return {
    levelData,
    heroes: [],
    gatesMap: new Map(),
    pressurePlatesList: [],
    movingPlatforms: [],
    molecules: [],
    phasePlatforms: [],
    decayPlatforms: [],
    crackedPlatforms: [],
    ephemeralPlatforms: [],
    liquidPlatforms: [],
    gasPlatforms: [],
    pinnablePlatforms: [],
    broglieCrystals: [],
    screenWrapGhosts: [],
    muralObjects: [],
    discoveryBoxObjects: [],
    edgePips: [],
    deathEchoes: [],
    antigravityBubbles: [],
    bubbleHarvestHits: [],
    swarmGhosts: [],
    ghostFrames: [],
    ghostRecorder: new GhostRecorder(),
    swarmBuffer: new SessionSwarmBuffer(),
    touchController: new MobileTouchController(),
    quantumPinningState: createQuantumPinningState(),
    cameras: {
      main: {
        width: 800,
        height: 600,
        setBounds: vi.fn(),
        setBackgroundColor: vi.fn(),
        setZoom: vi.fn(),
        followOffset: { set: vi.fn() }
      }
    },
    physics: {
      world: {
        gravity: { y: 0 },
        timeScale: 1,
        setBounds: vi.fn(),
        setBoundsCollision: vi.fn(),
        colliders: { destroy: vi.fn() }
      },
      add: {
        staticGroup: vi.fn(() => makeMockGroup()),
        group: vi.fn(() => makeMockGroup()),
        existing: vi.fn((obj: Record<string, unknown>) => {
          if (!obj.body) {
            obj.body = {
              setImmovable: vi.fn(),
              setAllowGravity: vi.fn(),
              setGravityY: vi.fn(),
              setBounce: vi.fn(),
              setCollideWorldBounds: vi.fn(),
              setSize: vi.fn(),
              setOffset: vi.fn(),
              setVelocity: vi.fn(),
              velocity: { x: 0, y: 0 },
              touching: { down: false, up: false },
              blocked: { down: false, up: false },
              checkCollision: { none: false },
              enable: true
            };
          }
        }),
        sprite: vi.fn((x: number, y: number) => makeMockObj(x, y)),
        collider: vi.fn(),
        overlap: vi.fn()
      }
    },
    add: {
      existing: vi.fn(),
      rectangle: vi.fn((x: number, y: number) => makeMockObj(x, y)),
      graphics: vi.fn(() => ({
        setDepth: vi.fn(),
        setAlpha: vi.fn(),
        setBlendMode: vi.fn(),
        setScrollFactor: vi.fn(),
        clear: vi.fn(),
        fillStyle: vi.fn(),
        lineStyle: vi.fn(),
        fillCircle: vi.fn(),
        strokeCircle: vi.fn(),
        fillTriangle: vi.fn(),
        strokeTriangle: vi.fn(),
        strokeRoundedRect: vi.fn(),
        lineBetween: vi.fn(),
        destroy: vi.fn()
      })),
      text: vi.fn((x: number, y: number) => makeMockObj(x, y)),
      circle: vi.fn((x: number, y: number) => makeMockObj(x, y))
    },
    anims: { exists: vi.fn(() => false) },
    events: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    time: { now: 0, delayedCall: vi.fn() },
    tweens: { add: vi.fn(), killAll: vi.fn() },
    applyPhase: vi.fn(),
    setupInitialCameraFraming: vi.fn(),
    initGhostForLevel: vi.fn(),
    createHUD: vi.fn(),
    showLevelTitle: vi.fn(),
    destroySwarmGhosts: vi.fn(),
    drawTetherPylons: vi.fn(),
    triggerSupernovaShockwave: vi.fn(),
    renderOganessonConstellation: vi.fn()
  } as unknown as GameSceneContext;
}

describe('LevelBuilder', () => {
  const baseLevel: LevelData = {
    id: '4',
    atom: 'Beryllium',
    symbol: 'Be',
    width: 1000,
    height: 600,
    hue: '#070737',
    antiHue: '#00e5ff',
    player: { position: { x: 100, y: 400 } },
    door: { x: 900, y: 400 },
    platforms: [
      { x: 0, y: 500, width: 1000, height: 20 },
      { x: 200, y: 400, width: 100, height: 20, phase: 'cyan' },
      { x: 350, y: 360, width: 100, height: 20, decayMs: 500 },
      { x: 500, y: 320, width: 100, height: 20, cracked: true },
      { x: 620, y: 280, width: 80, height: 20, ephemeral: true },
      { x: 720, y: 320, width: 80, height: 20, movesTo: { x: 820 } }
    ],
    spikes: [{ x: 300, y: 480, width: 40, height: 20 }],
    particles: [{ x: 250, y: 440, type: 'speed' }],
    gates: [{ id: 'g1', x: 780, y: 400, width: 20, height: 100 }],
    pressurePlates: [{ id: 'p1', x: 150, y: 494, width: 40, height: 6, targetGateId: 'g1' }],
    discoveryBox: {
      enabled: true,
      mechanic: 'phase',
      hintSteps: ['JUMP', 'SHIFT']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds all platform variants, gates, pressure plates, DiscoveryBox, and spawns hero', () => {
    const ctx = makeContext(baseLevel);
    const builder = new LevelBuilder(ctx);

    builder.buildLevel();

    expect(ctx.hasPhasePlatforms).toBe(true);
    expect(ctx.phasePlatforms).toHaveLength(1);
    expect(ctx.decayPlatforms).toHaveLength(1);
    expect(ctx.crackedPlatforms).toHaveLength(1);
    expect(ctx.ephemeralPlatforms).toHaveLength(1);
    expect(ctx.movingPlatforms).toHaveLength(1);
    expect(ctx.pinnablePlatforms).toHaveLength(2);
    expect(ctx.gatesMap.has('g1')).toBe(true);
    expect(ctx.pressurePlatesList).toHaveLength(1);
    expect(ctx.discoveryBoxObjects).toHaveLength(3);
    expect(ctx.heroes).toHaveLength(1);
    expect(ctx.setupInitialCameraFraming).toHaveBeenCalledTimes(1);
    expect(ctx.createHUD).toHaveBeenCalledTimes(1);
  });

  it('clearLevelObjects resets collections and destroys created objects', () => {
    const ctx = makeContext(baseLevel);
    const builder = new LevelBuilder(ctx);
    builder.buildLevel();

    builder.clearLevelObjects();

    expect(ctx.heroes).toHaveLength(0);
    expect(ctx.gatesMap.size).toBe(0);
    expect(ctx.pressurePlatesList).toHaveLength(0);
    expect(ctx.movingPlatforms).toHaveLength(0);
    expect(ctx.phasePlatforms).toHaveLength(0);
    expect(ctx.decayPlatforms).toHaveLength(0);
    expect(ctx.discoveryBoxObjects).toHaveLength(0);
    expect(ctx.muralObjects).toHaveLength(0);
    expect(ctx.bohrBackground).toBeNull();
    expect(ctx.destroySwarmGhosts).toHaveBeenCalledTimes(1);
  });
});
