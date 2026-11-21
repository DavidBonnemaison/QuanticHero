import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameEvents } from '../../tools/gameEvents';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Linear: (a: number, b: number, t: number) => a + (b - a) * t
    }
  }
}));

import { CameraDirector } from './CameraDirector';
import type { HudController } from './HudController';
import type { GameSceneContext } from './types';

function makeCameraContext(): GameSceneContext {
  const cam = {
    width: 800,
    height: 600,
    zoom: 1,
    midPoint: { x: 400, y: 300 },
    followOffset: { x: 0, y: 0, set: vi.fn() },
    setViewport: vi.fn(function (
      this: { width: number; height: number },
      _x: number,
      _y: number,
      w: number,
      h: number
    ) {
      this.width = w;
      this.height = h;
    }),
    setBounds: vi.fn(),
    setZoom: vi.fn(function (this: { zoom: number }, z: number) {
      this.zoom = z;
    }),
    centerOn: vi.fn(),
    startFollow: vi.fn(),
    stopFollow: vi.fn(),
    flash: vi.fn(),
    shake: vi.fn()
  };

  return {
    levelData: {
      id: '110',
      atom: 'Darmstadtium',
      symbol: 'Ds',
      width: 1400,
      height: 800,
      hue: '#070737',
      antiHue: '#00e5ff',
      player: { position: { x: 100, y: 400 } },
      door: { x: 1200, y: 400 },
      platforms: [],
      spikes: [],
      particles: [],
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 1200, y: 400 },
        revealAtX: 500
      }
    },
    isEntangled: true,
    entanglementRevealed: false,
    heroes: [
      { id: 'alpha', x: 100, y: 400, isBeta: false, isFocused: true, active: true },
      { id: 'beta', x: 1200, y: 400, isBeta: true, isFocused: true, active: true }
    ],
    betaHero: { id: 'beta', x: 1200, y: 400, isBeta: true, isFocused: true, active: true },
    muralObjects: [
      { active: true, setPosition: vi.fn() },
      { active: true, setPosition: vi.fn() },
      { active: true, setPosition: vi.fn() }
    ],
    bohrBackground: { resize: vi.fn() },
    switchCount: 0,
    focusBulletTimeUntil: 0,
    time: { now: 1000, delayedCall: vi.fn() },
    cameras: { main: cam },
    syncHudTransform: vi.fn(),
    updateEdgePips: vi.fn(),
    showRetroToast: vi.fn()
  } as unknown as GameSceneContext;
}

describe('CameraDirector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers revealAtX zoom-out to 0.45 when Alpha crosses reveal threshold', () => {
    const ctx = makeCameraContext();
    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);

    const revealed: number[] = [];
    const unsub = gameEvents.on('entanglement:reveal', (p) => revealed.push(p.revealAtX));

    ctx.heroes[0].x = 550;
    director.checkEntanglementReveal();
    unsub();

    expect(ctx.entanglementRevealed).toBe(true);
    expect(revealed).toEqual([500]);
    expect(ctx.cameras.main.setZoom).toHaveBeenCalledWith(0.45);
    expect(ctx.showRetroToast).toHaveBeenCalledWith('ENTANGLEMENT REVEALED !');
  });

  it('updates viewport, HUD anchoring, Bohr background, and mural on handleResize', () => {
    const ctx = makeCameraContext();
    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);

    director.handleResize({ width: 1280, height: 720 });

    expect(ctx.cameras.main.width).toBe(1280);
    expect(ctx.cameras.main.height).toBe(720);
    expect(hud.repositionOnResize).toHaveBeenCalledWith(1280, 720);
    expect(ctx.bohrBackground?.resize).toHaveBeenCalledWith(640, 360);
    expect(
      (ctx.muralObjects[0] as unknown as { setPosition: unknown }).setPosition
    ).toHaveBeenCalled();
  });

  it('switches focus between non-entangled clones and updates switchCount', () => {
    const ctx = makeCameraContext();
    ctx.isEntangled = false;
    ctx.heroes = [
      { id: 'c1', x: 100, y: 400, isFocused: true, active: true, setFocus: vi.fn() },
      { id: 'c2', x: 300, y: 400, isFocused: false, active: true, setFocus: vi.fn() }
    ] as unknown as GameSceneContext['heroes'];
    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);

    director.cycleFocusNext();

    expect(ctx.switchCount).toBe(1);
    expect(ctx.cameras.main.startFollow).toHaveBeenCalledWith(ctx.heroes[1], true, 0.1, 0.1);
    expect(ctx.updateEdgePips).toHaveBeenCalledTimes(1);
  });

  it('frames Alpha at readable zoom on narrow mobile portrait when entangled heroes start far apart', () => {
    const ctx = makeCameraContext();
    ctx.cameras.main.width = 390;
    ctx.cameras.main.height = 844;
    if (ctx.levelData.entanglement) {
      ctx.levelData.entanglement.revealAtX = undefined;
    }
    ctx.heroes[0].x = 190;
    ctx.heroes[0].y = 831;
    if (ctx.betaHero) {
      ctx.betaHero.x = 2361;
      ctx.betaHero.y = 291;
    }

    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);
    director.setupInitialFraming(ctx.heroes[0]);

    expect(ctx.cameras.main.zoom).toBeGreaterThanOrEqual(0.65);
    expect(ctx.cameras.main.centerOn).toHaveBeenCalledWith(190, 831);
  });

  it('hands camera focus to Beta once Alpha enters their portal', () => {
    const ctx = makeCameraContext();
    if (ctx.levelData.entanglement) {
      ctx.levelData.entanglement.revealAtX = undefined;
    }
    ctx.cameras.main.width = 390;
    ctx.cameras.main.height = 844;
    ctx.cameras.main.midPoint.x = 2200;
    ctx.cameras.main.midPoint.y = 800;
    ctx.heroes[0].x = 2271;
    ctx.heroes[0].y = 840;
    ctx.heroes[0].enteredPortal = true;
    ctx.heroes[1].x = 500;
    ctx.heroes[1].y = 300;
    ctx.heroes[1].enteredPortal = false;

    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);
    director.updateFraming(16);

    const [targetX, targetY] = (ctx.cameras.main.centerOn as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(targetX).toBeLessThan(2200);
    expect(targetY).toBeLessThan(800);
  });

  it('spawns and cleans up Beta PiP camera on narrow mobile portrait when entangled heroes are far apart', () => {
    const pipCam = {
      setZoom: vi.fn(),
      setBackgroundColor: vi.fn(),
      setBounds: vi.fn(),
      setViewport: vi.fn(),
      ignore: vi.fn(),
      centerOn: vi.fn()
    };
    const makeHudObj = () => ({
      active: true,
      setStrokeStyle: vi.fn(),
      setScrollFactor: vi.fn(),
      setDepth: vi.fn(),
      setPosition: vi.fn(),
      destroy: vi.fn()
    });
    const hudContainer = { add: vi.fn() };
    const ctx = makeCameraContext();
    if (ctx.levelData.entanglement) {
      ctx.levelData.entanglement.revealAtX = undefined;
    }
    ctx.cameras.main.width = 390;
    ctx.cameras.main.height = 844;
    const camMgr = ctx.cameras as unknown as {
      add: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
    camMgr.add = vi.fn(() => pipCam);
    camMgr.remove = vi.fn();
    (ctx as unknown as { hudContainer: typeof hudContainer }).hudContainer = hudContainer;
    (ctx as unknown as { add: Record<string, ReturnType<typeof vi.fn>> }).add = {
      rectangle: vi.fn(() => makeHudObj()),
      text: vi.fn(() => makeHudObj())
    };
    ctx.heroes[0].x = 190;
    ctx.heroes[0].y = 831;
    ctx.heroes[1].x = 2361;
    ctx.heroes[1].y = 291;
    if (ctx.betaHero) {
      ctx.betaHero.x = 2361;
      ctx.betaHero.y = 291;
    }

    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);

    director.updateFraming(16);

    expect(ctx.betaPipCamera).toBe(pipCam);
    expect(pipCam.setZoom).toHaveBeenCalledWith(0.42);
    expect(pipCam.ignore).toHaveBeenCalledWith(hudContainer);
    expect(pipCam.centerOn).toHaveBeenCalledWith(2361, 291);
    expect(ctx.betaPipFrame).not.toBeNull();
    expect(ctx.betaPipLabel).not.toBeNull();

    // Resizing to a wide desktop viewport where both fit destroys the PiP camera cleanly
    const frameRef = ctx.betaPipFrame;
    const labelRef = ctx.betaPipLabel;
    director.handleResize({ width: 1600, height: 900 });

    expect(ctx.betaPipCamera).toBeNull();
    expect(ctx.betaPipFrame).toBeNull();
    expect(ctx.betaPipLabel).toBeNull();
    expect(camMgr.remove).toHaveBeenCalledWith(pipCam);
    expect(frameRef?.destroy).toHaveBeenCalledTimes(1);
    expect(labelRef?.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps Alpha centered inside central third when PiP is active even during Dual->PiP transition and fast movement, with hysteresis', () => {
    const pipCam = {
      setZoom: vi.fn(),
      setBackgroundColor: vi.fn(),
      setBounds: vi.fn(),
      setViewport: vi.fn(),
      ignore: vi.fn(),
      centerOn: vi.fn()
    };
    const makeHudObj = () => ({
      active: true,
      setStrokeStyle: vi.fn(),
      setScrollFactor: vi.fn(),
      setDepth: vi.fn(),
      setPosition: vi.fn(),
      destroy: vi.fn()
    });
    const ctx = makeCameraContext();
    if (ctx.levelData.entanglement) {
      ctx.levelData.entanglement.revealAtX = undefined;
    }
    ctx.cameras.main.width = 400;
    ctx.cameras.main.height = 800;
    ctx.cameras.main.midPoint.x = 1000;
    ctx.cameras.main.midPoint.y = 400;
    (ctx.cameras.main.centerOn as ReturnType<typeof vi.fn>).mockImplementation(
      (cx: number, cy: number) => {
        ctx.cameras.main.midPoint.x = cx;
        ctx.cameras.main.midPoint.y = cy;
        return ctx.cameras.main;
      }
    );
    const camMgr = ctx.cameras as unknown as {
      add: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
    camMgr.add = vi.fn(() => pipCam);
    camMgr.remove = vi.fn();
    (ctx as unknown as { add: Record<string, ReturnType<typeof vi.fn>> }).add = {
      rectangle: vi.fn(() => makeHudObj()),
      text: vi.fn(() => makeHudObj())
    };

    // Start far apart -> rawZoom = 400 / (1200 + 240) = 0.277 < 0.42 -> enters PiP
    ctx.heroes[0].x = 200;
    ctx.heroes[0].y = 400;
    ctx.heroes[1].x = 1400;
    ctx.heroes[1].y = 400;

    const hud = { repositionOnResize: vi.fn() } as unknown as HudController;
    const director = new CameraDirector(ctx, hud);

    // Transition Dual -> PiP: snaps directly to Alpha even though midPoint was at 1000
    director.updateFraming(16);
    expect(ctx.betaPipCamera).toBe(pipCam);
    expect(ctx.cameras.main.midPoint.x).toBeCloseTo(200, 1);

    // Simulate rapid speed-boost movement of Alpha (120px in a single step)
    ctx.heroes[0].x = 320;
    director.updateFraming(16);
    const maxThirdOffset = ctx.cameras.main.width / ctx.cameras.main.zoom / 6;
    expect(Math.abs(ctx.cameras.main.midPoint.x - ctx.heroes[0].x)).toBeLessThanOrEqual(
      maxThirdOffset + 0.01
    );

    // Hysteresis: move Beta closer so rawZoom = 400 / (650 + 240) = 0.449 (between 0.42 and 0.48)
    // PiP must remain active (no oscillation)
    ctx.heroes[1].x = ctx.heroes[0].x + 650;
    director.updateFraming(16);
    expect(ctx.betaPipCamera).toBe(pipCam);

    // Move Beta even closer so rawZoom = 400 / (500 + 240) = 0.54 >= 0.48 -> exits PiP cleanly
    ctx.heroes[1].x = ctx.heroes[0].x + 500;
    director.updateFraming(16);
    expect(ctx.betaPipCamera).toBeNull();
  });
});
