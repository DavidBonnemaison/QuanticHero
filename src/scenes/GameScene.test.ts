import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { soundManager } from '../audio/SoundManager';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import type { LevelData } from '../types';

vi.mock('phaser', () => {
  class MockGameObject {
    public scene: any;
    public x = 0;
    public y = 0;
    public width = 64;
    public height = 64;
    public alpha = 1;
    public scaleX = 1;
    public scaleY = 1;
    public angle = 0;
    public tint = 0;
    public depth = 0;
    public active = true;
    public visible = true;
    public flipX = false;
    public flipY = false;
    public data: Map<string, any> = new Map();
    public body: any = null;
    public listeners: Map<string, Function[]> = new Map();

    constructor(scene?: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setScale(sx: number, sy?: number) {
      this.scaleX = sx;
      this.scaleY = sy ?? sx;
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
    clearTint() {
      this.tint = 0;
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
    setActive(a: boolean) {
      this.active = a;
      return this;
    }
    setScrollFactor() {
      return this;
    }
    setOrigin() {
      return this;
    }
    setInteractive() {
      return this;
    }
    setStrokeStyle() {
      return this;
    }
    setFillStyle() {
      return this;
    }
    setText() {
      return this;
    }
    setColor() {
      return this;
    }
    setFlipX(f: boolean) {
      this.flipX = f;
      return this;
    }
    setFlipY(f: boolean) {
      this.flipY = f;
      return this;
    }
    setBounce() {
      return this;
    }
    setCollideWorldBounds() {
      return this;
    }
    setVelocity(vx = 0, vy = 0) {
      if (this.body) {
        this.body.velocity = { x: vx, y: vy };
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
    play() {
      return this;
    }
    setTexture() {
      return this;
    }
    setBlendMode() {
      return this;
    }
    setData(k: string, v: any) {
      this.data.set(k, v);
      return this;
    }
    getData(k: string) {
      return this.data.get(k);
    }
    on(ev: string, fn: Function) {
      const list = this.listeners.get(ev) || [];
      list.push(fn);
      this.listeners.set(ev, list);
      return this;
    }
    add() {
      return this;
    }
    destroy() {
      this.active = false;
    }
  }

  class MockSprite extends MockGameObject {
    public anims = { currentAnim: { key: 'idle' } };
    constructor(scene?: any, x = 0, y = 0) {
      super(scene, x, y);
      this.body = {
        enable: true,
        touching: { down: false, up: false, left: false, right: false },
        blocked: { down: false, up: false, left: false, right: false },
        velocity: { x: 0, y: 0 },
        checkCollision: { none: false },
        setImmovable: vi.fn(),
        setAllowGravity: vi.fn(),
        setGravityY: vi.fn(),
        setVelocity: vi.fn(),
        reset: vi.fn(),
        updateFromGameObject: vi.fn()
      };
    }
    public enableBody = vi.fn(
      (_reset: boolean, x: number, y: number, active: boolean, visible: boolean) => {
        this.x = x;
        this.y = y;
        this.active = active;
        this.visible = visible;
        if (this.body) this.body.enable = true;
      }
    );
    public disableBody = vi.fn((disableGameObject: boolean, hideGameObject: boolean) => {
      if (disableGameObject) this.active = false;
      if (hideGameObject) this.visible = false;
      if (this.body) this.body.enable = false;
    });
  }

  class MockRectangle extends MockGameObject {
    constructor(scene: any, x: number, y: number, w: number, h: number) {
      super(scene, x, y);
      this.width = w;
      this.height = h;
    }
    setY(y: number) {
      this.y = y;
      return this;
    }
  }

  class MockGraphics extends MockGameObject {
    clear = vi.fn().mockReturnThis();
    lineStyle = vi.fn().mockReturnThis();
    fillStyle = vi.fn().mockReturnThis();
    fillRect = vi.fn().mockReturnThis();
    lineBetween = vi.fn().mockReturnThis();
    fillTriangle = vi.fn().mockReturnThis();
    strokeTriangle = vi.fn().mockReturnThis();
    strokeCircle = vi.fn().mockReturnThis();
    strokeEllipse = vi.fn().mockReturnThis();
    strokeRect = vi.fn().mockReturnThis();
    fillCircle = vi.fn().mockReturnThis();
    beginPath = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    strokePath = vi.fn().mockReturnThis();
  }

  class MockGroup {
    public children: any[] = [];
    add = vi.fn((obj: any) => {
      this.children.push(obj);
      return obj;
    });
    getChildren = vi.fn(() => this.children);
    clear = vi.fn((_removeFromScene?: boolean, destroyChild?: boolean) => {
      if (destroyChild) {
        for (const c of this.children) c.destroy?.();
      }
      this.children = [];
    });
  }

  class MockScene {
    public add: any;
    public physics: any;
    public cameras: any;
    public tweens: any;
    public time: any;
    public input: any;
    public events: any;
    public scene: any;
    public game: any;
    public scale: any;

    constructor() {
      const eventMap = new Map<string, Function[]>();
      this.events = {
        on: vi.fn((ev: string, fn: Function) => {
          const list = eventMap.get(ev) || [];
          list.push(fn);
          eventMap.set(ev, list);
        }),
        once: vi.fn(),
        emit: vi.fn((ev: string, ...args: any[]) => {
          for (const fn of eventMap.get(ev) || []) fn(...args);
        })
      };
      this.add = {
        existing: vi.fn((obj: any) => obj),
        rectangle: vi.fn(
          (x: number, y: number, w: number, h: number) => new MockRectangle(this, x, y, w, h)
        ),
        circle: vi.fn((x: number, y: number) => new MockGameObject(this, x, y)),
        sprite: vi.fn((x: number, y: number) => new MockSprite(this, x, y)),
        text: vi.fn((x: number, y: number) => new MockGameObject(this, x, y)),
        zone: vi.fn((x: number, y: number) => new MockGameObject(this, x, y)),
        graphics: vi.fn(() => new MockGraphics(this)),
        container: vi.fn((x: number, y: number) => new MockGameObject(this, x, y))
      };
      this.physics = {
        world: {
          gravity: { x: 0, y: 700 },
          timeScale: 1,
          setBounds: vi.fn(),
          setBoundsCollision: vi.fn(),
          colliders: { destroy: vi.fn() }
        },
        add: {
          staticGroup: vi.fn(() => new MockGroup()),
          group: vi.fn(() => new MockGroup()),
          sprite: vi.fn((x: number, y: number) => {
            const s = new MockSprite(this, x, y);
            s.body = {
              enable: true,
              velocity: { x: 0, y: 0 },
              setImmovable: vi.fn(),
              setAllowGravity: vi.fn(),
              moves: true
            };
            return s;
          }),
          existing: vi.fn((obj: any, isStatic?: boolean) => {
            obj.body = {
              enable: true,
              velocity: { x: 0, y: 0 },
              touching: { down: false, up: false, left: false, right: false },
              blocked: { down: false, up: false, left: false, right: false },
              checkCollision: { none: false },
              setImmovable: vi.fn(),
              setAllowGravity: vi.fn(),
              setGravityY: vi.fn(),
              setVelocity: vi.fn(),
              setVelocityX: vi.fn(),
              setVelocityY: vi.fn(),
              reset: vi.fn(),
              updateFromGameObject: vi.fn(),
              isStatic
            };
            return obj;
          }),
          collider: vi.fn(),
          overlap: vi.fn()
        }
      };
      this.cameras = {
        main: {
          width: 800,
          height: 600,
          zoom: 1,
          midPoint: { x: 400, y: 300 },
          followOffset: { x: 0, y: 0, set: vi.fn() },
          setViewport: vi.fn(function (this: any, _x: number, _y: number, w: number, h: number) {
            this.width = w;
            this.height = h;
          }),
          setBounds: vi.fn(),
          setBackgroundColor: vi.fn(),
          setZoom: vi.fn(function (this: any, z: number) {
            this.zoom = z;
          }),
          centerOn: vi.fn(),
          startFollow: vi.fn(),
          flash: vi.fn(),
          fadeOut: vi.fn(),
          fadeIn: vi.fn(),
          once: vi.fn((_ev: string, cb: Function) => cb())
        }
      };
      const scaleEventMap = new Map<string, Array<{ fn: Function; ctx?: any }>>();
      this.scale = {
        on: vi.fn((ev: string, fn: Function, ctx?: any) => {
          const list = scaleEventMap.get(ev) || [];
          list.push({ fn, ctx });
          scaleEventMap.set(ev, list);
        }),
        off: vi.fn((ev: string, fn: Function) => {
          const list = scaleEventMap.get(ev) || [];
          scaleEventMap.set(
            ev,
            list.filter((entry) => entry.fn !== fn)
          );
        }),
        emit: vi.fn((ev: string, ...args: any[]) => {
          for (const entry of scaleEventMap.get(ev) || []) {
            entry.fn.apply(entry.ctx, args);
          }
        })
      };
      this.tweens = {
        add: vi.fn(),
        killAll: vi.fn(),
        killTweensOf: vi.fn()
      };
      this.time = {
        now: 1000,
        delayedCall: vi.fn((_ms: number, cb: Function) => cb())
      };
      this.input = {
        on: vi.fn(),
        keyboard: {
          createCursorKeys: vi.fn(() => ({})),
          addKeys: vi.fn(() => ({})),
          addKey: vi.fn(() => ({ on: vi.fn() }))
        }
      };
      this.scene = {
        restart: vi.fn()
      };
      this.game = {
        destroy: vi.fn(),
        loop: { actualFps: 60 }
      };
    }
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Sprite: MockSprite
      },
      Physics: {
        Arcade: {
          Sprite: MockSprite
        }
      },
      Scenes: {
        Events: {
          SHUTDOWN: 'shutdown',
          DESTROY: 'destroy'
        }
      },
      Input: {
        Keyboard: {
          KeyCodes: {
            W: 87,
            A: 65,
            S: 83,
            D: 68,
            X: 88,
            TAB: 9,
            E: 69,
            ONE: 49,
            TWO: 50,
            THREE: 51,
            R: 82,
            Q: 81,
            C: 67,
            F: 70,
            SPACE: 32,
            ENTER: 13
          }
        }
      },
      Display: {
        Color: {
          HexStringToColor: (hex: string) => ({
            color: Number.parseInt(hex.replace('#', ''), 16) || 0xffffff
          })
        }
      },
      BlendModes: {
        ADD: 1
      },
      Geom: {
        Rectangle: class {
          static Contains = () => true;
        }
      },
      Math: {
        Between: (a: number, b: number) => Math.floor((a + b) / 2),
        FloatBetween: (a: number, b: number) => (a + b) / 2,
        Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
        Linear: (a: number, b: number, t: number) => a + (b - a) * t
      }
    }
  };
});

import GameScene from './GameScene';
import Hero from './Hero';

const makeTestLevel = (id: string, atom: string, symbol: string): LevelData => ({
  id,
  atom,
  symbol,
  width: 800,
  height: 600,
  hue: '#070737',
  antiHue: '#00e5ff',
  player: { position: { x: 100, y: 400 } },
  door: { x: 700, y: 400 },
  platforms: [
    { x: 0, y: 500, width: 800, height: 20 },
    { x: 200, y: 400, width: 120, height: 20, phase: 'magenta' },
    { x: 350, y: 350, width: 100, height: 20, decayMs: 600 },
    { x: 500, y: 300, width: 100, height: 20, movesTo: { x: 650 } }
  ],
  spikes: [{ x: 300, y: 480, width: 40, height: 20 }],
  particles: [{ x: 250, y: 450, type: 'duplicate' }],
  gates: [{ id: 'g1', x: 600, y: 400, width: 20, height: 100 }],
  pressurePlates: [
    { id: 'p1', x: 180, y: 494, width: 40, height: 6, targetGateId: 'g1', requireLock: true }
  ],
  collapse: { speedY: 20, delayMs: 500 }
});

describe('GameScene Spec-05: Zero-Cut Loop & quickRespawn', () => {
  let scene: GameScene;

  beforeAll(async () => {
    const { loadLevel } = await import('../data/levels');
    await Promise.all([loadLevel(1), loadLevel(2)]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
    useGameStore.getState().updateCurrentLevel(1);
    scene = new GameScene();
    scene.levelData = makeTestLevel('1', 'Hydrogen', 'H');
    scene.create();
  });

  it('quickRespawn() never calls scene.restart(), soundManager.stopBgm(), or game.destroy()', () => {
    const stopBgmSpy = vi.spyOn(soundManager, 'stopBgm');

    scene.quickRespawn({ x: 310, y: 475 });

    expect(scene.scene.restart).not.toHaveBeenCalled();
    expect(stopBgmSpy).not.toHaveBeenCalled();
    expect(scene.game.destroy).not.toHaveBeenCalled();
    expect(scene.cameras.main.flash).toHaveBeenCalledWith(120, 0, 229, 255, false);
  });

  it('deposits persistent Death Echoes at death coordinates with alpha 0.16', () => {
    scene.quickRespawn({ x: 310, y: 475 });
    scene.quickRespawn({ x: 420, y: 460 });

    const echoes = (scene as any).deathEchoes;
    expect(echoes).toHaveLength(2);
    expect(echoes[0].x).toBe(310);
    expect(echoes[0].y).toBe(475);
    expect(echoes[0].alpha).toBe(0.16);
    expect(echoes[1].x).toBe(420);
  });

  it('restores heroes, clones, particles, decay/moving/phase platforms, plates, gates, collapse & timer on quickRespawn()', () => {
    // Mutate level state as if mid-run
    const clone = new Hero(scene, 260, 380, false);
    scene.heroes.push(clone);
    scene.heroGroup.add(clone);
    scene.heroes[0].x = 450;
    scene.heroes[0].y = 200;

    // Collect particle
    const particle = scene.particles.getChildren()[0] as any;
    (scene as any).collectParticle(scene.heroes[0], particle);
    expect(particle.disableBody).toHaveBeenCalledWith(true, true);

    // Shift phase, trigger decay platform, move moving platform, press plate & open gate, advance collapse & timer
    scene.toggleLevelPhase();
    expect(scene.currentPhase).toBe('magenta');

    const decayPlat = (scene as any).decayPlatforms[0];
    decayPlat.state.triggered = true;
    decayPlat.state.collapsed = true;
    decayPlat.rect.alpha = 0;

    const movingPlat = (scene as any).movingPlatforms[0];
    movingPlat.rect.setPosition(620, 310);
    movingPlat.direction.x = 'left';

    const plate = scene.pressurePlatesList[0];
    plate.isPressed = true;
    const gate = scene.gatesMap.get('g1')!;
    const gateBody = gate.rect.body as Phaser.Physics.Arcade.StaticBody;
    gate.rect.setAlpha(0);
    gateBody.enable = false;

    const topCollapse = (scene as any).collapseTopSpikes;
    topCollapse.y = 200;

    (scene as any).timerStarted = true;
    (scene as any).dilatedElapsedMs = 4200;

    // Trigger quickRespawn
    scene.quickRespawn({ x: 450, y: 200 });

    // Hero reset to spawn and clones destroyed
    expect(scene.heroes).toHaveLength(1);
    expect(scene.heroes[0].x).toBe(100);
    expect(scene.heroes[0].y).toBe(400);

    // Particle reactivated via enableBody(true, px, py, true, true)
    expect(particle.enableBody).toHaveBeenCalledWith(true, 250, 450, true, true);

    // Phase, decay, moving platforms restored
    expect(scene.currentPhase).toBe('cyan');
    expect(decayPlat.state.triggered).toBe(false);
    expect(decayPlat.state.collapsed).toBe(false);
    expect(decayPlat.rect.alpha).toBe(1);
    expect(movingPlat.rect.x).toBe(movingPlat.startX);
    expect(movingPlat.direction.x).toBe('right');

    // Pressure plate & gate restored
    expect(plate.isPressed).toBe(false);
    expect(gate.rect.alpha).toBe(1);
    expect(gateBody.enable).toBe(true);

    // Collapse & timer reset
    expect(topCollapse.y).toBeLessThan(200);
    expect((scene as any).timerStarted).toBe(false);
    expect((scene as any).dilatedElapsedMs).toBe(0);
  });

  it('shows level title only on first entry to a level, never on quickRespawn()', () => {
    const initialTextCalls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls.length;

    scene.quickRespawn({ x: 200, y: 400 });

    const titleCallsAfterRespawn = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls
      .slice(initialTextCalls)
      .filter((call) => String(call[2]).includes('1 - Hydrogen'));
    expect(titleCallsAfterRespawn).toHaveLength(0);

    // Advancing to Level 2 should show Level 2 title
    const level2 = makeTestLevel('2', 'Helium', 'He');
    scene.rebuildForLevel(level2);
    const titleCallsForLevel2 = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => String(call[2]).includes('2 - Helium')
    );
    expect(titleCallsForLevel2).toHaveLength(1);
  });

  it('completeLevel() & advanceToNextLevel() preserve Phaser.Game instance and BGM across levels', () => {
    const stopBgmSpy = vi.spyOn(soundManager, 'stopBgm');
    const gameInstance = scene.game;

    (scene as any).completeLevel();

    expect(scene.game.destroy).not.toHaveBeenCalled();
    expect(stopBgmSpy).not.toHaveBeenCalled();
    expect((scene as any).isLevelCompleted).toBe(true);
    expect((scene as any).levelCompleteOverlay).not.toBeNull();

    // Advance to Level 2
    scene.advanceToNextLevel();

    expect(scene.game).toBe(gameInstance);
    expect(scene.game.destroy).not.toHaveBeenCalled();
    expect(stopBgmSpy).not.toHaveBeenCalled();
    expect(scene.levelData.id).toBe('2');
    expect((scene as any).deathEchoes).toHaveLength(0);
  });

  it('completeLevel() on level 109 unlocks level 115 and sets nextLevelNumberPending to 115', () => {
    useGameStore.setState({ currentLevel: 109, maxLevel: 109, maxEntanglementLevel: 110 });
    const level109 = makeTestLevel('109', 'Meitnerium', 'Mt');
    scene.rebuildForLevel(level109);

    (scene as any).completeLevel();

    expect((scene as any).nextLevelNumberPending).toBe(115);
    expect(useGameStore.getState().maxLevel).toBe(115);
    expect(useGameStore.getState().maxEntanglementLevel).toBe(110);
    expect(useGameStore.getState().currentLevel).toBe(115);
  });
});

describe('GameScene Spec-06: Swarm Replay & Isotope Medals', () => {
  let scene: GameScene;

  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
    useGameStore.getState().updateCurrentLevel(1);
    scene = new GameScene();
    scene.levelData = {
      ...makeTestLevel('1', 'Hydrogen', 'H'),
      parTimeMs: 10000,
      parJumps: 3
    };
    scene.create();
  });

  it('tracks jumpCount on hero:jump and switchCount on switchFocusTo(), resetting both on quickRespawn()', () => {
    gameEvents.emit('hero:jump');
    gameEvents.emit('hero:jump');
    expect(scene.jumpCount).toBe(2);

    const clone = new Hero(scene, 200, 400, false);
    scene.heroes.push(clone);
    scene.heroGroup.add(clone);
    scene.switchFocusTo(clone);
    expect(scene.switchCount).toBe(1);

    scene.quickRespawn({ x: 250, y: 400 });
    expect(scene.jumpCount).toBe(0);
    expect(scene.switchCount).toBe(0);
  });

  it('buffers 3 failed attempts + 1 winning attempt into SessionSwarmBuffer and spawns 4 translucent swarm ghosts on victory', () => {
    // Simulate 3 failed runs
    for (let i = 0; i < 3; i++) {
      (scene as any).ghostRecorder.recordFrame(0, 100, 400, false, 'idle', undefined, true);
      (scene as any).ghostRecorder.recordFrame(
        500 + i * 100,
        200 + i * 30,
        400,
        false,
        'right',
        undefined,
        true
      );
      scene.quickRespawn({ x: 200 + i * 30, y: 400 });
    }

    expect(scene.swarmBuffer.size).toBe(3);

    // Winning run
    (scene as any).ghostRecorder.recordFrame(0, 100, 400, false, 'idle', undefined, true);
    (scene as any).ghostRecorder.recordFrame(3000, 700, 400, false, 'right', undefined, true);
    (scene as any).dilatedElapsedMs = 3000;
    scene.jumpCount = 2;

    (scene as any).completeLevel();

    expect(scene.swarmBuffer.size).toBe(4);
    expect(scene.swarmGhosts).toHaveLength(4);
    for (const sg of scene.swarmGhosts) {
      expect(sg.alpha).toBe(0.22);
    }

    const saved = useGameStore.getState().scores[1];
    expect(saved.bestJumps).toBe(2);
    expect(saved.lastJumps).toBe(2);
    expect(saved.medal).toBe('gold');
  });

  it('renders high-visibility 36px screen-space power-up banner with extended hold duration', () => {
    (scene as any).add.text.mockClear();
    (scene as any).tweens.add.mockClear();
    scene.showRetroToast('QUANTUM SPEED !');

    expect((scene as any).add.text).toHaveBeenCalledTimes(1);
    const [tx, ty, msg, style] = (scene as any).add.text.mock.calls[0];
    expect(tx).toBe((scene as any).cameras.main.width / 2);
    expect(ty).toBe(88);
    expect(msg).toBe('QUANTUM SPEED !');
    const fontSizePx = Number.parseInt(String(style.fontSize), 10);
    expect(fontSizePx).toBeGreaterThanOrEqual(34);
    const tweenConfig = (scene as any).tweens.add.mock.calls[0]?.[0];
    expect(tweenConfig?.delay).toBeGreaterThanOrEqual(1500);
    expect(tweenConfig?.duration).toBeGreaterThanOrEqual(500);
  });

  it('Spec-07: creates BohrBackgroundRenderer and holographic mural (depth 2, alpha 0.35) and adds valence electron on collectParticle', () => {
    expect(scene.bohrBackground).not.toBeNull();
    expect(scene.muralObjects).toHaveLength(3);
    for (const mural of scene.muralObjects as any[]) {
      expect(mural.depth).toBe(2);
      expect(mural.alpha).toBe(0.35);
    }

    const initialTotal = scene.bohrBackground!.getTotalElectronCount();
    const mockParticle = {
      active: true,
      getData: vi.fn(() => 'speed'),
      disableBody: vi.fn()
    };
    (scene as any).collectParticle(scene.heroes[0], mockParticle);
    expect(scene.bohrBackground!.getTotalElectronCount()).toBe(initialTotal + 1);
  });
});

describe('GameScene Spec-08: Entanglement Tether, Clone Fusion/Fission & Screen-Wrap', () => {
  let scene: GameScene;

  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
    useGameStore.getState().updateCurrentLevel(1);
    scene = new GameScene();
  });

  it('collects a particle placed on the [Alpha, Beta] entanglement tether segment', () => {
    scene.levelData = {
      ...makeTestLevel('110', 'Darmstadtium', 'Ds'),
      player: { position: { x: 100, y: 300 } },
      particles: [{ x: 300, y: 300, type: 'speed' }],
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 500, y: 300 },
        tetherPhysical: true
      }
    };
    scene.create();

    const tetherEvents: Array<{ x: number; y: number; type: string }> = [];
    const unsub = gameEvents.on('tether:collect', (payload) => tetherEvents.push(payload));

    scene.updateEntanglementTether(1000);
    unsub();

    const particle = scene.particles.getChildren()[0] as any;
    expect(particle.disableBody).toHaveBeenCalledWith(true, true);
    expect(tetherEvents).toHaveLength(1);
    expect(tetherEvents[0]).toEqual({ x: 300, y: 300, type: 'speed' });
  });

  it('hooks onto a magnetic tether pylon and constrains Beta distance', () => {
    scene.levelData = {
      ...makeTestLevel('110', 'Darmstadtium', 'Ds'),
      player: { position: { x: 150, y: 200 } },
      particles: [],
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 350, y: 200 },
        tetherPhysical: true,
        tetherMaxLength: 250
      },
      tetherPylons: [{ x: 250, y: 200, radius: 18 }]
    };
    scene.create();

    // First update hooks the pylon
    scene.updateEntanglementTether(1000);

    // Move Beta far down over an abyss (dAlpha=100, dBeta=250 => total=350 > 250)
    scene.betaHero!.setPosition(250, 450);
    scene.betaHero!.setVelocity(30, 150);
    scene.updateEntanglementTether(1016);

    expect(scene.betaHero!.y).toBeCloseTo(350, 3);
    expect(scene.betaHero!.body!.velocity.x).toBeCloseTo(30, 3);
    expect(scene.betaHero!.body!.velocity.y).toBeCloseTo(0, 3);
  });

  it('fuses two clones into Super-Quanta (fusionStack=2), shatters cracked platforms, and performs in-flight fission', () => {
    scene.levelData = {
      ...makeTestLevel('1', 'Hydrogen', 'H'),
      platforms: [
        { x: 0, y: 500, width: 800, height: 20 },
        { x: 200, y: 420, width: 120, height: 20, cracked: true }
      ]
    };
    scene.create();

    const hero = scene.heroes[0];
    hero.createdAtMs = 0;
    hero.setPosition(200, 380);

    const clone = new Hero(scene, 215, 380, false);
    clone.createdAtMs = 100;
    scene.heroes.push(clone);
    scene.heroGroup.add(clone);

    // After 500 ms grace period, clones fuse
    const fused = scene.tryCloneFusion(700);
    expect(fused).toBe(true);
    expect(scene.heroes).toHaveLength(1);
    expect(hero.fusionStack).toBe(2);
    expect(hero.scaleX).toBe(1.25);

    // Shatter cracked platform and verify quickRespawn restores it
    const crackedRect = (scene as any).crackedPlatforms[0];
    scene.shatterCrackedPlatform(crackedRect);
    expect(crackedRect.visible).toBe(false);
    expect(crackedRect.body.enable).toBe(false);

    // In-flight fission (mid-air)
    hero.body!.touching.down = false;
    hero.body!.blocked.down = false;
    const fissioned = scene.tryInFlightFission();
    expect(fissioned).toBe(true);
    expect(scene.heroes).toHaveLength(2);
    expect(hero.fusionStack).toBe(1);
    expect(hero.scaleX).toBe(1);
    expect(hero.body!.velocity.y).toBe(-480);
    expect(scene.heroes[1].body!.velocity.y).toBe(300);

    // quickRespawn restores cracked platform
    scene.quickRespawn({ x: 200, y: 380 });
    expect(crackedRect.visible).toBe(true);
    expect(crackedRect.body.enable).toBe(true);
  });

  it('wraps hero across x=0 <-> x=width preserving velocity and projects spectral edge ghost', () => {
    scene.levelData = {
      ...makeTestLevel('1', 'Hydrogen', 'H'),
      width: 800,
      height: 600,
      screenWrap: 'horizontal'
    };
    scene.create();

    const hero = scene.heroes[0];
    hero.setPosition(-6, 300);
    hero.setVelocity(-320, -140);
    hero.recoilVx = -180;

    scene.updateScreenWrap(1000);

    expect(hero.x).toBe(794);
    expect(hero.body!.velocity.x).toBe(-320);
    expect(hero.body!.velocity.y).toBe(-140);
    expect(hero.recoilVx).toBe(-180);

    // Ghost projected on opposite edge (794 is within 32 px of 800 -> ghost at -6)
    const ghosts = (scene as any).screenWrapGhosts;
    expect(ghosts.length).toBeGreaterThanOrEqual(1);
    expect(ghosts[0].visible).toBe(true);
    expect(ghosts[0].x).toBe(-6);
  });
});

describe('GameScene Spec-10: Curiosity Secrets (HUD Phase, Bubble Antigravity & Bell Sync)', () => {
  let scene: GameScene;

  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
    useGameStore.getState().updateCurrentLevel(1);
    scene = new GameScene();
  });

  it('Secret #1: tapping phaseIndicatorText or pressing Q toggles phase platforms and flashes badge', () => {
    scene.levelData = makeTestLevel('1', 'Hydrogen', 'H');
    scene.create();

    const phaseText = (scene as any).phaseIndicatorText;
    expect(phaseText).not.toBeNull();
    expect(scene.currentPhase).toBe('cyan');

    // Simulate tapping/clicking the interactive HUD badge
    const pointerHandlers = phaseText.listeners.get('pointerdown') || [];
    expect(pointerHandlers.length).toBeGreaterThan(0);
    pointerHandlers[0]();
    expect(scene.currentPhase).toBe('magenta');
    expect(phaseText.scaleX).toBe(1.25);

    // Simulate calling togglePhasePlatforms (as triggered by Q key)
    scene.togglePhasePlatforms();
    expect(scene.currentPhase).toBe('cyan');
  });

  it('Secret #3: entangled twins arriving within <= 50ms trigger bell:violation and award Bell Sync Gold Isotope', () => {
    scene.levelData = {
      ...makeTestLevel('110', 'Darmstadtium', 'Ds'),
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 600, y: 400 },
        portalMode: 'dual',
        betaDoor: { x: 650, y: 400 }
      }
    };
    scene.create();

    const bellEvents: Array<{ level: number; deltaMs: number }> = [];
    const unsub = gameEvents.on('bell:violation', (p) => bellEvents.push(p));

    const alpha = scene.heroes.find((h) => !h.isBeta)!;
    const beta = scene.heroes.find((h) => h.isBeta)!;
    const portalA = (scene as any).portalSprite;
    const portalB = (scene as any).betaPortalSprite;

    scene.time.now = 5000;
    (scene as any).handleEntangledPortalArrival(alpha, portalA, false);
    scene.time.now = 5035;
    (scene as any).handleEntangledPortalArrival(beta, portalB, true);
    unsub();

    expect(bellEvents).toHaveLength(1);
    expect(bellEvents[0]).toEqual({ level: 110, deltaMs: 35 });
    expect(scene.cameras.main.flash).toHaveBeenCalledWith(400, 255, 215, 0, false);

    const score110 = useGameStore.getState().scores[110];
    expect(score110?.bellSync).toBe(true);
    expect(score110?.medal).toBe('gold');
  });

  it('Spec-11 #1: allowHeroCollision registers heroGroup-to-heroGroup collider for Living Floor', () => {
    scene.levelData = {
      ...makeTestLevel('112', 'Copernicium', 'Cn'),
      entanglement: {
        mode: 'inverted_gravity',
        allowHeroCollision: true,
        betaSpawn: { x: 100, y: 120 },
        portalMode: 'dual',
        betaDoor: { x: 700, y: 120 }
      }
    };
    scene.create();

    const colliderCalls = (scene.physics.add.collider as any).mock.calls;
    const hasHeroToHero = colliderCalls.some(
      (args: unknown[]) => args[0] === scene.heroGroup && args[1] === scene.heroGroup
    );
    expect(hasHeroToHero).toBe(true);
  });

  it('Spec-11 WOW #1: revealAtX starts zoomed at 1.0 on Alpha and zooms out to 0.45 when Alpha crosses revealAtX', () => {
    scene.levelData = {
      ...makeTestLevel('110', 'Darmstadtium', 'Ds'),
      width: 1400,
      height: 800,
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 1200, y: 400 },
        portalMode: 'dual',
        betaDoor: { x: 850, y: 400 },
        revealAtX: 500
      }
    };
    scene.create();

    expect(scene.cameras.main.setZoom).toHaveBeenCalledWith(1);

    const revealEvents: Array<{ revealAtX: number }> = [];
    const unsub = gameEvents.on('entanglement:reveal', (p) => revealEvents.push(p));

    const alpha = scene.heroes.find((h) => !h.isBeta)!;
    alpha.x = 520;
    scene.update(1000, 16);
    unsub();

    expect(revealEvents).toHaveLength(1);
    expect(revealEvents[0]).toEqual({ revealAtX: 500 });
    expect(scene.cameras.main.setZoom).toHaveBeenCalledWith(0.45);
  });

  it('Spec-11 #6: Conservation Cage vanishes #f1c40f platforms on touch and restoreEphemeralPlatforms restores them', () => {
    scene.levelData = {
      ...makeTestLevel('88', 'Radium', 'Ra'),
      platforms: [
        { x: 0, y: 500, width: 800, height: 28 },
        { x: 600, y: 400, width: 24, height: 100, color: '#f1c40f', ephemeral: true }
      ]
    };
    scene.create();

    expect(scene.ephemeralPlatforms).toHaveLength(1);
    const cagePlat = scene.ephemeralPlatforms[0];
    scene.vanishEphemeralPlatform(cagePlat);
    expect(cagePlat.visible).toBe(false);
    expect(cagePlat.alpha).toBe(0);

    const restored = scene.restoreEphemeralPlatforms();
    expect(restored).toBe(1);
    expect(cagePlat.visible).toBe(true);
    expect(cagePlat.alpha).toBe(1);
  });

  it('Spec-11 WOW #3: GameScene.update teleports hero across screen edge and consumes 1 tunnel charge', () => {
    scene.levelData = {
      ...makeTestLevel('50', 'Tin', 'Sn'),
      width: 1000,
      height: 600
    };
    scene.create();

    const hero = scene.heroes[0];
    hero.tunnelCharges = 1;
    hero.x = 980;
    hero.y = 400;
    if (!hero.body) {
      hero.body = { x: 960, y: 380, width: 32, height: 40, velocity: { x: 0, y: 0 } } as any;
    }

    (scene as any).touchController.state.right = true;
    scene.update(1000, 16);
    (scene as any).touchController.state.right = false;

    expect(hero.x).toBe(28);
    expect(hero.tunnelCharges).toBe(0);
  });

  it('Spec-12: renders non-blocking 2-step holographic Safe Discovery Box at depth 2 on milestone levels', () => {
    scene.levelData = {
      ...makeTestLevel('4', 'Beryllium', 'Be'),
      discoveryBox: {
        enabled: true,
        mechanic: 'superposition_orbital',
        hintSteps: ['JUMP / TAP', 'SWITCH ORBIT']
      }
    };
    scene.create();

    expect(scene.discoveryBoxObjects).toHaveLength(3);
    for (const obj of scene.discoveryBoxObjects as any[]) {
      expect(obj.depth).toBe(2);
    }
  });

  it('Spec-02: handles scale resize events by updating camera, edge-anchored HUD, and Bohr background', () => {
    scene.levelData = makeTestLevel('6', 'Carbon', 'C');
    scene.create();

    expect((scene as any).scale.on).toHaveBeenCalledWith('resize', scene.handleResize, scene);

    // Emit a resize event simulating desktop wide 1280x800
    (scene as any).scale.emit('resize', { width: 1280, height: 800 });

    expect(scene.cameras.main.width).toBe(1280);
    expect(scene.cameras.main.height).toBe(800);

    // Top-right HUD anchored to new width
    expect((scene as any).timerText.x).toBe(1270);
    expect((scene as any).timerText.y).toBe(3);
    expect((scene as any).splitDeltaText.x).toBe(1270);
    expect((scene as any).splitDeltaText.y).toBe(28);

    // Bottom-right quick restart button anchored to new bottom-right corner
    expect((scene as any).thumbRestartBg.x).toBe(1244);
    expect((scene as any).thumbRestartBg.y).toBe(764);
    expect((scene as any).thumbRestartLabel.x).toBe(1244);
    expect((scene as any).thumbRestartLabel.y).toBe(764);
    expect((scene as any).thumbRestartZone.x).toBe(1244);
    expect((scene as any).thumbRestartZone.y).toBe(764);

    // BohrBackgroundRenderer re-centered without artifacts
    expect(scene.bohrBackground?.getCenter()).toEqual({ x: 640, y: 400 });

    // Rotating to mobile portrait 390x844 repositions cleanly again
    (scene as any).scale.emit('resize', { width: 390, height: 844 });
    expect((scene as any).timerText.x).toBe(380);
    expect((scene as any).thumbRestartBg.x).toBe(354);
    expect((scene as any).thumbRestartBg.y).toBe(808);
    expect(scene.bohrBackground?.getCenter()).toEqual({ x: 195, y: 422 });
  });
});
