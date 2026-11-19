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
});
