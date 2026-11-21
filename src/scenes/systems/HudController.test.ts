import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTouchController } from '../../input/MobileTouchController';
import { SessionSwarmBuffer } from '../../services/GhostManager';
import { useGameStore } from '../../store';

vi.mock('phaser', () => ({
  default: {
    Geom: {
      Rectangle: class {
        static Contains = vi.fn(() => true);
        constructor(
          public x: number,
          public y: number,
          public width: number,
          public height: number
        ) {}
      }
    }
  }
}));

import { HudController } from './HudController';
import type { GameSceneContext } from './types';

function makeDisplayObj(x = 0, y = 0, text = '') {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  return {
    x,
    y,
    text,
    color: '#ffffff',
    alpha: 1,
    visible: true,
    active: true,
    scaleX: 1,
    scaleY: 1,
    listeners,
    setOrigin: vi.fn(),
    setScrollFactor: vi.fn(),
    setDepth: vi.fn(),
    setAlpha: vi.fn(function (this: { alpha: number }, a: number) {
      this.alpha = a;
    }),
    setVisible: vi.fn(function (this: { visible: boolean }, v: boolean) {
      this.visible = v;
    }),
    setInteractive: vi.fn(),
    setStrokeStyle: vi.fn(),
    setScale: vi.fn(function (this: { scaleX: number; scaleY: number }, sx: number, sy?: number) {
      this.scaleX = sx;
      this.scaleY = sy ?? sx;
    }),
    setPosition: vi.fn(function (this: { x: number; y: number }, nx: number, ny: number) {
      this.x = nx;
      this.y = ny;
    }),
    setText: vi.fn(function (this: { text: string }, t: string) {
      this.text = t;
    }),
    setColor: vi.fn(function (this: { color: string }, c: string) {
      this.color = c;
    }),
    on: vi.fn((ev: string, fn: (...args: unknown[]) => void) => {
      const list = listeners.get(ev) ?? [];
      list.push(fn);
      listeners.set(ev, list);
    }),
    add: vi.fn(),
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    lineStyle: vi.fn(),
    lineBetween: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    destroy: vi.fn()
  };
}

function makeHudContext(): GameSceneContext {
  return {
    levelData: {
      id: '1',
      atom: 'Hydrogen',
      symbol: 'H',
      width: 800,
      height: 600,
      hue: '#070737',
      antiHue: '#00e5ff',
      player: { position: { x: 100, y: 400 } },
      door: { x: 700, y: 400 },
      platforms: [],
      spikes: [],
      particles: []
    },
    heroes: [{ x: 150, y: 300, isFocused: true, active: true }],
    isEntangled: false,
    hasPhasePlatforms: true,
    currentPhase: 'cyan',
    hasAnyGhost: false,
    ghostFrames: [],
    swarmBuffer: new SessionSwarmBuffer(),
    touchController: new MobileTouchController(),
    edgePips: [],
    isLevelCompleted: false,
    isTransitioningLevel: false,
    isTimeDilationActive: false,
    dilatedElapsedMs: 0,
    lastTimerString: '',
    lastTimerColor: '',
    lastShownLevelId: null,
    jumpCount: 2,
    cameras: {
      main: { width: 800, height: 600, zoom: 1 }
    },
    add: {
      container: vi.fn(() => makeDisplayObj()),
      graphics: vi.fn(() => makeDisplayObj()),
      text: vi.fn((x: number, y: number, txt: string) => makeDisplayObj(x, y, txt)),
      rectangle: vi.fn((x: number, y: number) => makeDisplayObj(x, y)),
      zone: vi.fn((x: number, y: number) => makeDisplayObj(x, y))
    },
    tweens: { add: vi.fn() },
    quickRespawn: vi.fn(),
    applyGhostMode: vi.fn(),
    togglePhasePlatforms: vi.fn(),
    switchFocusTo: vi.fn(),
    resolveLevelData: vi.fn(),
    advanceToNextLevel: vi.fn()
  } as unknown as GameSceneContext;
}

describe('HudController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
  });

  it('creates HUD, updates timer with dirty-checking, and repositions on resize', () => {
    const ctx = makeHudContext();
    const hud = new HudController(ctx);

    hud.createHUD();
    expect(ctx.hudContainer).not.toBeNull();
    expect(ctx.phaseIndicatorText).not.toBeNull();
    expect(ctx.timerText.x).toBe(790);

    // Dirty-checked timer updates only when string or color changes
    ctx.dilatedElapsedMs = 1230;
    hud.updateTimerAndIndicators();
    const callsAfterFirst = (ctx.timerText.setText as ReturnType<typeof vi.fn>).mock.calls.length;
    hud.updateTimerAndIndicators();
    expect((ctx.timerText.setText as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callsAfterFirst
    );

    // Reposition on resize
    hud.repositionOnResize(1280, 800);
    expect(ctx.timerText.x).toBe(1270);
    expect(ctx.splitDeltaText?.x).toBe(1270);
    expect(ctx.thumbRestartBg?.x).toBe(1244);
    expect(ctx.thumbRestartBg?.y).toBe(764);
  });

  it('syncHudTransform compensates for camera zoom', () => {
    const ctx = makeHudContext();
    const hud = new HudController(ctx);
    hud.createHUD();

    ctx.cameras.main.zoom = 0.5;
    hud.syncHudTransform();

    expect(ctx.hudContainer?.setScale).toHaveBeenCalledWith(2);
    expect(ctx.hudContainer?.setPosition).toHaveBeenCalledWith(-400, -300);
  });

  it('renders level complete overlay and level title only once per level id', () => {
    const ctx = makeHudContext();
    const hud = new HudController(ctx);

    hud.showLevelTitle();
    hud.showLevelTitle();
    expect(ctx.add.text).toHaveBeenCalledTimes(1);

    hud.showLevelCompleteOverlay(2500, 2500, 0, 2, 'gold');
    expect(ctx.levelCompleteOverlay).not.toBeNull();
  });

  it('formats daily level entry title cleanly with responsive fontSize and wordWrap on mobile viewports', () => {
    const ctx = makeHudContext();
    ctx.cameras.main.width = 390;
    ctx.cameras.main.height = 844;
    ctx.levelData = {
      ...ctx.levelData,
      id: 'daily:2026-11-21',
      symbol: 'Nh',
      atom: 'Nihonium'
    };

    const hud = new HudController(ctx);
    hud.showLevelTitle();

    expect(ctx.add.text).toHaveBeenCalledWith(
      195,
      422,
      'DAILY — Nh Nihonium',
      expect.objectContaining({
        fontSize: '30px',
        wordWrap: { width: 358 }
      })
    );
  });

  it('renders slim coherence gauge, updates tier indicator, and displays COHERENT RUN badge at HYPER tier', async () => {
    const { CoherenceSystem } = await import('../../mechanics/coherenceSystem');
    const ctx = makeHudContext();
    const coherenceSystem = new CoherenceSystem();
    ctx.coherenceSystem = coherenceSystem;
    ctx.lastCoherenceValue = -1;
    ctx.lastCoherenceTier = 'x1';

    const hud = new HudController(ctx);
    hud.createHUD();

    expect(ctx.coherenceBarGraphics).not.toBeNull();
    expect(ctx.coherenceTierText).not.toBeNull();
    expect(ctx.coherenceTierText?.text).toBe('x1');

    coherenceSystem.addCoherence(90);
    hud.updateTimerAndIndicators();
    expect(ctx.coherenceTierText?.text).toBe('⚡ HYPER');
    expect(ctx.coherenceTierText?.setColor).toHaveBeenCalledWith('#fbbf24');

    hud.repositionOnResize(1280, 800);
    expect(ctx.coherenceTierText?.x).toBe(1170);

    hud.showLevelCompleteOverlay(2500, 2500, 0, 2, 'gold');
    const createdTexts = (ctx.add.text as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[2]);
    expect(
      createdTexts.some((txt) => typeof txt === 'string' && txt.includes('COHERENT RUN'))
    ).toBe(true);
    expect(createdTexts.some((txt) => typeof txt === 'string' && txt.includes('SHARE CARD'))).toBe(
      true
    );
  });

  it('triggers shareReplayCard when SHARE CARD button is clicked in the in-canvas overlay', async () => {
    const ReplayCardGenerator = await import('../../services/ReplayCardGenerator');
    const shareSpy = vi
      .spyOn(ReplayCardGenerator, 'shareReplayCard')
      .mockResolvedValue('downloaded');

    const ctx = makeHudContext();
    ctx.ghostRecorder = {
      getSerialized: () => 'v1|0,100,400,0,i;2500,700,400,0,r'
    } as unknown as GameSceneContext['ghostRecorder'];

    const hud = new HudController(ctx);
    hud.showLevelCompleteOverlay(2500, 2500, 0, 2, 'gold');

    const textResults = (ctx.add.text as ReturnType<typeof vi.fn>).mock.results
      .map((r) => r.value)
      .filter(Boolean);
    const shareCardObj = textResults.find(
      (obj: { text?: string }) => typeof obj.text === 'string' && obj.text.includes('SHARE CARD')
    );
    expect(shareCardObj).toBeDefined();

    const handlers = shareCardObj.listeners.get('pointerdown') ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    handlers[0]();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [cardInput] = shareSpy.mock.calls[0];
    expect(cardInput.level.id).toBe('1');
    expect(cardInput.timeMs).toBe(2500);
    expect(cardInput.medal).toBe('gold');
    expect(cardInput.ghostTrajectory).toBe('v1|0,100,400,0,i;2500,700,400,0,r');
    shareSpy.mockRestore();
  });

  it('shows dedicated [CONDENSE] HUD button when hasCondenseAbility is true and triggers tryCrystallizeBroglieTrail on tap', () => {
    const ctx = makeHudContext();
    ctx.hasCondenseAbility = false;
    ctx.tryCrystallizeBroglieTrail = vi.fn(() => true);

    const hud = new HudController(ctx);
    hud.createHUD();

    expect(ctx.condenseButtonBg?.visible).toBe(false);
    expect(ctx.condenseButtonLabel?.visible).toBe(false);
    expect(ctx.condenseButtonZone?.visible).toBe(false);

    ctx.hasCondenseAbility = true;
    hud.updateTimerAndIndicators();

    expect(ctx.condenseButtonBg?.visible).toBe(true);
    expect(ctx.condenseButtonLabel?.visible).toBe(true);
    expect(ctx.condenseButtonZone?.visible).toBe(true);

    hud.repositionOnResize(390, 844);
    expect(ctx.condenseButtonBg?.x).toBe(332);
    expect(ctx.condenseButtonBg?.y).toBe(748);

    const zone = ctx.condenseButtonZone as unknown as {
      listeners: Map<string, Array<() => void>>;
    };
    const handlers = zone.listeners.get('pointerdown') ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    handlers[0]();

    expect(ctx.uiPointerConsumed).toBe(true);
    expect(ctx.tryCrystallizeBroglieTrail).toHaveBeenCalledTimes(1);
  });
});
