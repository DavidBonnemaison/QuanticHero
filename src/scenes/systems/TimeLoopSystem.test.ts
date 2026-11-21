import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHRONO_LOOP_LEVELS, getChronoLoopLevelById } from '../../data/chronoLoopLevels';
import { PHYSICS } from '../../physics/constants';
import { getGhostSurfVelocity } from '../../physics/matterStates';
import { isHeroOnPressurePlate } from '../../physics/stepHeroPhysics';
import { gameEvents } from '../../tools/gameEvents';
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
    public tint = 0xffffff;
    public anims = { currentAnim: { key: 'idle' } };
    public body: {
      x: number;
      y: number;
      width: number;
      height: number;
      velocity: { x: number; y: number };
      checkCollision: { up: boolean; down: boolean; left: boolean; right: boolean };
      setAllowGravity: ReturnType<typeof vi.fn>;
      setImmovable: ReturnType<typeof vi.fn>;
      setSize: ReturnType<typeof vi.fn>;
      reset: (nx: number, ny: number) => void;
    };

    constructor(scene: unknown, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.body = {
        x: x - 16,
        y: y - 20,
        width: 32,
        height: 40,
        velocity: { x: 0, y: 0 },
        checkCollision: { up: true, down: true, left: true, right: true },
        setAllowGravity: vi.fn(),
        setImmovable: vi.fn(),
        setSize: vi.fn(),
        reset: (nx: number, ny: number) => {
          this.body.x = nx - this.body.width / 2;
          this.body.y = ny - this.body.height / 2;
        }
      };
    }

    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    setTint(t: number) {
      this.tint = t;
      return this;
    }
    setDepth(d: number) {
      this.depth = d;
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
    play(key: string) {
      this.anims.currentAnim = { key };
      return this;
    }
    destroy() {
      this.active = false;
    }
  }

  const GameObjects = { Sprite: MockSprite };
  const Physics = { Arcade: { Sprite: MockSprite } };
  const PhaserMath = {
    Clamp: (v: number, min: number, max: number) =>
      globalThis.Math.max(min, globalThis.Math.min(max, v))
  };
  return {
    default: { GameObjects, Physics, Math: PhaserMath },
    GameObjects,
    Physics,
    Math: PhaserMath
  };
});

import { QuantumSystems } from './QuantumSystems';
import {
  ECHO_TINTS,
  TIME_LOOP_RECORD_HZ,
  TimeLoopSystem,
  canSurfOnEcho,
  sampleTimeLoopFrame
} from './TimeLoopSystem';
import type { GameSceneContext, GateEntry, PressurePlateEntry } from './types';

function makeMockGraphics() {
  return {
    active: true,
    clear: vi.fn(),
    lineStyle: vi.fn(),
    strokeCircle: vi.fn(),
    lineBetween: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    strokePath: vi.fn(),
    setDepth: vi.fn(),
    destroy: vi.fn(function (this: { active: boolean }) {
      this.active = false;
    })
  };
}

function makeMockHero(x = 100, y = 500) {
  return {
    id: Math.random(),
    x,
    y,
    flipX: false,
    flipY: false,
    active: true,
    visible: true,
    isFocused: true,
    upsideDown: 1,
    hasSurfedThisJump: false,
    isDiving: false,
    pauliGraceUntil: 0,
    fusionStack: 1,
    tunnelCharges: 0,
    body: {
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 40,
      x: x - 16,
      y: y - 20,
      enable: true
    },
    getAnimState: () => 'right' as const,
    setVelocityX: vi.fn(function (this: { body: { velocity: { x: number } } }, vx: number) {
      this.body.velocity.x = vx;
    }),
    setVelocityY: vi.fn(function (this: { body: { velocity: { y: number } } }, vy: number) {
      this.body.velocity.y = vy;
    })
  };
}

function makeTimeLoopContext(levelData: LevelData): {
  ctx: GameSceneContext;
  createdGraphics: ReturnType<typeof makeMockGraphics>[];
  createdColliders: Array<{ destroy: ReturnType<typeof vi.fn> }>;
  hero: ReturnType<typeof makeMockHero>;
} {
  const createdGraphics: ReturnType<typeof makeMockGraphics>[] = [];
  const createdColliders: Array<{ destroy: ReturnType<typeof vi.fn> }> = [];
  const hero = makeMockHero(levelData.player.position.x, levelData.player.position.y);

  const gatesMap = new Map<string, GateEntry>();
  for (const g of levelData.gates ?? []) {
    gatesMap.set(g.id, {
      data: g,
      rect: {
        alpha: 1,
        setAlpha: vi.fn(function (this: { alpha: number }, a: number) {
          this.alpha = a;
        }),
        body: { enable: true }
      } as unknown as GateEntry['rect']
    });
  }

  const pressurePlatesList: PressurePlateEntry[] = (levelData.pressurePlates ?? []).map((pl) => ({
    data: pl,
    isPressed: false,
    startY: pl.y,
    baseRect: { destroy: vi.fn() } as unknown as PressurePlateEntry['baseRect'],
    padRect: {
      y: pl.y,
      setY: vi.fn(function (this: { y: number }, ny: number) {
        this.y = ny;
      }),
      setFillStyle: vi.fn(),
      destroy: vi.fn()
    } as unknown as PressurePlateEntry['padRect']
  }));

  const ctx = {
    levelData,
    heroes: [hero],
    heroGroup: { add: vi.fn(), clear: vi.fn() },
    gatesMap,
    pressurePlatesList,
    phasePlatforms: [],
    decayPlatforms: [],
    crackedPlatforms: [],
    ephemeralPlatforms: [],
    movingPlatforms: [],
    molecules: [],
    liquidPlatforms: [],
    gasPlatforms: [],
    pinnablePlatforms: [],
    broglieCrystals: [],
    antigravityBubbles: [],
    screenWrapGhosts: [],
    isLevelCompleted: false,
    isTransitioningLevel: false,
    isRespawning: false,
    isEntangled: false,
    isPauliActive: false,
    isTimeDilationActive: false,
    timeDilationUntil: 0,
    focusBulletTimeUntil: 0,
    hasPhasePlatforms: false,
    hasCondenseAbility: false,
    currentPhase: 'cyan',
    touchController: {
      reset: vi.fn(),
      state: { left: false, right: false, jump: false, dive: false }
    },
    add: {
      existing: vi.fn(),
      graphics: vi.fn(() => {
        const g = makeMockGraphics();
        createdGraphics.push(g);
        return g;
      }),
      circle: vi.fn(() => ({ setDepth: vi.fn(), destroy: vi.fn() }))
    },
    physics: {
      world: { gravity: { y: PHYSICS.GRAVITY_Y }, timeScale: 1 },
      add: {
        existing: vi.fn(),
        group: vi.fn(() => ({
          add: vi.fn(),
          clear: vi.fn(),
          destroy: vi.fn()
        })),
        collider: vi.fn(() => {
          const c = { destroy: vi.fn() };
          createdColliders.push(c);
          return c;
        })
      }
    },
    cameras: { main: { flash: vi.fn(), startFollow: vi.fn() } },
    tweens: { add: vi.fn() },
    time: { now: 0 },
    spawnHeroes: vi.fn(() => {
      hero.x = levelData.player.position.x;
      hero.y = levelData.player.position.y;
      hero.body.velocity.x = 0;
      hero.body.velocity.y = 0;
      hero.hasSurfedThisJump = false;
      hero.pauliGraceUntil = 0;
    }),
    updateEdgePips: vi.fn(),
    restoreEphemeralPlatforms: vi.fn(() => 0),
    showRetroToast: vi.fn(),
    applyPhase: vi.fn()
  } as unknown as GameSceneContext;

  return { ctx, createdGraphics, createdColliders, hero };
}

function getRequiredChronoLevel(id: string): LevelData {
  const entry = getChronoLoopLevelById(id);
  if (!entry) {
    throw new Error(`Missing Chrono-Loop level ${id}`);
  }
  return entry.levelData;
}

describe('TimeLoopSystem (Spec-01)', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  it('records active hero trajectory at 30 Hz and interpolates frames smoothly', () => {
    const level = getRequiredChronoLevel('chrono-1');
    const { ctx, hero } = makeTimeLoopContext(level);
    const system = new TimeLoopSystem(ctx);
    system.initForLevel();

    expect(system.isActive()).toBe(true);
    expect(system.getCycleMs()).toBe(7000);
    expect(system.getMaxEchoes()).toBe(1);

    // Simulate 1000 ms at 60 Hz (60 frames of 16.666 ms)
    const stepMs = 1000 / 60;
    for (let i = 0; i < 60; i++) {
      hero.x = 100 + i * 3;
      hero.y = 500;
      system.update(i * stepMs, stepMs);
    }

    const frames = system.getCurrentRecording();
    // 30 Hz over 1 second -> ~30 samples (allowing +/- 2 for frame boundary alignment)
    expect(frames.length).toBeGreaterThanOrEqual(TIME_LOOP_RECORD_HZ - 2);
    expect(frames.length).toBeLessThanOrEqual(TIME_LOOP_RECORD_HZ + 2);

    const midSample = sampleTimeLoopFrame(frames, 500);
    expect(midSample).not.toBeNull();
    expect(midSample?.x).toBeGreaterThan(150);
    expect(midSample?.x).toBeLessThan(240);
  });

  it('enforces FIFO maxEchoes cap (up to 3) with cyan/violet/gold tints and zero memory leaks', () => {
    const baseLevel = getRequiredChronoLevel('chrono-8'); // maxEchoes: 3
    const { ctx, createdColliders, hero } = makeTimeLoopContext(baseLevel);
    const system = new TimeLoopSystem(ctx);
    system.initForLevel();

    const spawnedEchoes: Array<{
      active: boolean;
      auraGraphics: { active: boolean } | null;
      tintColor: number;
    }> = [];

    // Trigger 5 successive rewinds -> FIFO should cap at 3 and destroy all older EchoHeroes
    for (let loop = 1; loop <= 5; loop++) {
      hero.x = 100 + loop * 50;
      system.update(loop * 100, 100);
      system.triggerLoopRewind(true);
      for (const e of system.getActiveEchoes()) {
        spawnedEchoes.push(e);
      }
    }

    expect(system.getEchoRecordings().length).toBe(3);
    expect(system.getEchoCount()).toBe(3);
    expect(system.getActiveEchoes().map((e) => e.tintColor)).toEqual([...ECHO_TINTS]);

    // Every EchoHero from earlier iterations (not in the current active list) must be destroyed
    const currentSet = new Set(system.getActiveEchoes());
    for (const e of spawnedEchoes) {
      if (!currentSet.has(e as never)) {
        expect(e.active).toBe(false);
        expect(e.auraGraphics).toBeNull();
      }
    }

    // Earlier colliders must be destroyed; only latest collider remains active until system.destroy()
    for (let i = 0; i < createdColliders.length - 1; i++) {
      expect(createdColliders[i].destroy).toHaveBeenCalledTimes(1);
    }

    system.destroy();
    expect(system.getEchoCount()).toBe(0);
    expect(system.getEchoRecordings().length).toBe(0);
    for (const e of spawnedEchoes) {
      expect(e.active).toBe(false);
    }
    expect(createdColliders[createdColliders.length - 1].destroy).toHaveBeenCalledTimes(1);
  });

  it('emits timeloop:tick in the final second and auto-rewinds at cycleMs', () => {
    const level: LevelData = {
      ...getRequiredChronoLevel('chrono-1'),
      timeLoop: { cycleMs: 2000, maxEchoes: 2 }
    };
    const { ctx } = makeTimeLoopContext(level);
    const system = new TimeLoopSystem(ctx);
    system.initForLevel();

    const ticks: number[] = [];
    const rewinds: Array<{ echoCount: number; manual: boolean }> = [];
    gameEvents.on('timeloop:tick', ({ remainingMs }) => ticks.push(remainingMs));
    gameEvents.on('timeloop:rewind', ({ echoCount, manual }) =>
      rewinds.push({ echoCount, manual })
    );

    // Step in 100 ms chunks across 2100 ms
    for (let t = 100; t <= 2100; t += 100) {
      system.update(t, 100);
    }

    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.every((ms) => ms > 0 && ms <= 1000)).toBe(true);
    expect(rewinds.length).toBe(1);
    expect(rewinds[0]).toEqual({ echoCount: 1, manual: false });
  });

  it('supports Ghost Surfing (one-way top bounce) on an EchoHero head', () => {
    const level = getRequiredChronoLevel('chrono-2');
    const { ctx, hero } = makeTimeLoopContext(level);
    const system = new TimeLoopSystem(ctx);
    system.initForLevel();

    // Loop 1: position hero on mid-step (440, 400) and rewind
    hero.x = 440;
    hero.y = 400;
    system.update(100, 100);
    system.triggerLoopRewind(true);

    const echo = system.getActiveEchoes()[0];
    expect(echo).toBeDefined();

    // Ascending hero should NOT bounce
    expect(
      canSurfOnEcho({ x: 440, y: 380, vy: -200, upsideDown: 1, hasSurfedThisJump: false }, echo)
    ).toBe(false);

    // Descending hero landing on Echo's head triggers Ghost Surf bounce (-520 px/s)
    const surfEvents: Array<{ x: number; y: number }> = [];
    gameEvents.on('hero:ghost_surf', (p) => surfEvents.push(p));

    hero.x = 442;
    hero.y = 376;
    hero.body.velocity.y = 180;
    hero.hasSurfedThisJump = false;
    system.update(200, 50);

    expect(hero.setVelocityY).toHaveBeenCalledWith(getGhostSurfVelocity(1));
    expect(hero.hasSurfedThisJump).toBe(true);
    expect(surfEvents.length).toBe(1);
  });

  it('triggers Temporal Pauli Repulsion between active hero and Pauli-charged EchoHero', () => {
    const level = getRequiredChronoLevel('chrono-4');
    const { ctx, hero } = makeTimeLoopContext(level);
    const system = new TimeLoopSystem(ctx);
    system.initForLevel();

    // Loop 1: hero collects Pauli and stands at x = 360, y = 500
    ctx.isPauliActive = true;
    hero.x = 360;
    hero.y = 500;
    system.update(100, 100);
    system.triggerLoopRewind(true);

    // After rewind, level's isPauliActive is reset, but Echo 1 retains isPauliActive = true
    expect(ctx.isPauliActive).toBe(false);
    expect(system.getActiveEchoes()[0].isPauliActive).toBe(true);

    const blasts: Array<{ hero1Id: number; hero2Id: number }> = [];
    gameEvents.on('pauli:blast', (p) => blasts.push(p));

    // Loop 2: active hero approaches Echo 1 from the left (distance = 40 < 75 px)
    hero.x = 320;
    hero.y = 500;
    system.update(300, 50);

    expect(blasts.length).toBe(1);
    expect(hero.setVelocityX).toHaveBeenCalledWith(-620);
    expect(hero.setVelocityY).toHaveBeenCalledWith(-580);
  });

  describe('Chrono-Loop 8-level pack integrity & multi-level resolution', () => {
    it('exports 8 valid Chrono-Loop levels with timeLoop config', () => {
      expect(CHRONO_LOOP_LEVELS.length).toBe(8);
      for (const entry of CHRONO_LOOP_LEVELS) {
        expect(entry.levelData.timeLoop).toBeDefined();
        expect(entry.levelData.timeLoop?.cycleMs).toBeGreaterThanOrEqual(6000);
        expect(entry.levelData.timeLoop?.cycleMs).toBeLessThanOrEqual(8000);
        expect(entry.levelData.timeLoop?.maxEchoes).toBeGreaterThanOrEqual(1);
        expect(entry.levelData.timeLoop?.maxEchoes).toBeLessThanOrEqual(3);
      }
    });

    it('solves CL-01 (Echo Gate): 1 echo holds PressurePlate p1 open while hero reaches portal', () => {
      const level = getRequiredChronoLevel('chrono-1');
      const { ctx, hero } = makeTimeLoopContext(level);
      const timeLoop = new TimeLoopSystem(ctx);
      ctx.timeLoopSystem = timeLoop;
      const quantum = new QuantumSystems(ctx);
      timeLoop.initForLevel();

      const p1 = level.pressurePlates?.[0];
      const g1 = ctx.gatesMap.get('g1');
      expect(p1).toBeDefined();
      expect(g1).toBeDefined();
      if (!p1 || !g1) return;

      // Loop 1: move hero onto pressure plate p1 and rewind
      hero.x = p1.x + p1.width / 2;
      hero.y = p1.y - 10;
      expect(isHeroOnPressurePlate(hero.x, hero.y, p1)).toBe(true);
      timeLoop.update(100, 100);
      timeLoop.triggerLoopRewind(true);

      // Loop 2: hero is back at spawn (far from p1), Echo 1 is on p1 -> Gate g1 opens!
      hero.x = level.door.x;
      hero.y = level.door.y;
      timeLoop.update(200, 50);
      quantum.updateWorldMechanics(200, 50, 200, 1);

      expect(ctx.pressurePlatesList[0].isPressed).toBe(true);
      expect((g1.rect.body as { enable: boolean }).enable).toBe(false);
    });

    it('solves CL-02 (Ghost Stepping Stone): Echo 1 on mid-step launches hero up to high portal', () => {
      const level = getRequiredChronoLevel('chrono-2');
      const { ctx, hero } = makeTimeLoopContext(level);
      const timeLoop = new TimeLoopSystem(ctx);
      ctx.timeLoopSystem = timeLoop;
      timeLoop.initForLevel();

      // Loop 1: hero stands on mid-step (x: 460, y: 396) and rewinds
      hero.x = 460;
      hero.y = 396;
      timeLoop.update(100, 100);
      timeLoop.triggerLoopRewind(true);

      // Loop 2: hero jumps onto Echo 1's head -> Ghost Surf velocity (-520 px/s) reaches apex
      hero.x = 460;
      hero.y = 372;
      hero.body.velocity.y = 120;
      timeLoop.update(200, 50);

      expect(hero.body.velocity.y).toBe(getGhostSurfVelocity(1));
      // Kinematic peak height from y=372 with vy=-520, g=700: dy = v^2 / (2g) = 193 px -> y = 179 <= door.y (200)!
      const peakY =
        hero.y - (hero.body.velocity.y * hero.body.velocity.y) / (2 * PHYSICS.GRAVITY_Y);
      expect(peakY).toBeLessThanOrEqual(level.door.y);
    });

    it('solves CL-03 (Twin Locks): 2 echoes simultaneously unlock g1 and g2', () => {
      const level = getRequiredChronoLevel('chrono-3');
      const { ctx, hero } = makeTimeLoopContext(level);
      const timeLoop = new TimeLoopSystem(ctx);
      ctx.timeLoopSystem = timeLoop;
      const quantum = new QuantumSystems(ctx);
      timeLoop.initForLevel();

      const p1 = level.pressurePlates?.[0];
      const p2 = level.pressurePlates?.[1];
      const g1 = ctx.gatesMap.get('g1');
      const g2 = ctx.gatesMap.get('g2');
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(g1).toBeDefined();
      expect(g2).toBeDefined();
      if (!p1 || !p2 || !g1 || !g2) return;

      // Loop 1: Echo 1 holds p1
      hero.x = p1.x + p1.width / 2;
      hero.y = p1.y - 10;
      timeLoop.update(100, 100);
      timeLoop.triggerLoopRewind(true);

      // Loop 2: Echo 2 holds p2
      hero.x = p2.x + p2.width / 2;
      hero.y = p2.y - 10;
      timeLoop.update(200, 100);
      timeLoop.triggerLoopRewind(true);

      expect(timeLoop.getEchoCount()).toBe(2);

      // Loop 3: active hero runs to portal while Echo 1 & Echo 2 keep both gates open
      hero.x = level.door.x;
      hero.y = level.door.y;
      timeLoop.update(300, 50);
      quantum.updateWorldMechanics(300, 50, 300, 1);

      expect(ctx.pressurePlatesList[0].isPressed).toBe(true);
      expect(ctx.pressurePlatesList[1].isPressed).toBe(true);
      expect((g1.rect.body as { enable: boolean }).enable).toBe(false);
      expect((g2.rect.body as { enable: boolean }).enable).toBe(false);
    });
  });
});
