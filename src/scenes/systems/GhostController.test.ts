import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionSwarmBuffer } from '../../services/GhostManager';
import { useGameStore } from '../../store';
import { GhostRecorder, compressTrajectory } from '../../tools/GhostRecorder';
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
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    setTint() {
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
    play() {
      return this;
    }
    destroy() {
      this.active = false;
    }
  }
  const GameObjects = { Sprite: MockSprite };
  const Physics = { Arcade: { Sprite: MockSprite } };
  return { default: { GameObjects, Physics }, GameObjects, Physics };
});

import { GhostController } from './GhostController';
import type { GameSceneContext } from './types';

function makeGhostContext(): GameSceneContext {
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
    heroes: [
      {
        x: 200,
        y: 286,
        flipX: false,
        flipY: false,
        active: true,
        isFocused: true,
        upsideDown: 1,
        hasSurfedThisJump: false,
        isDiving: true,
        body: { velocity: { x: 100, y: 120 } },
        getAnimState: () => 'right',
        setVelocityY: vi.fn()
      }
    ],
    ghostHero: null,
    ghostFrames: [],
    ghostRecorder: new GhostRecorder(),
    swarmBuffer: new SessionSwarmBuffer(),
    swarmGhosts: [],
    swarmPlaybackActive: false,
    swarmPlaybackElapsedMs: 0,
    swarmPlaybackSpeed: 2,
    swarmPlaybackMaxMs: 0,
    hasAnyGhost: true,
    isLevelCompleted: false,
    lastSplitUpdateMs: 0,
    lastSplitString: '',
    lastSplitColor: '',
    ghostButton: {
      active: true,
      setText: vi.fn(),
      setAlpha: vi.fn(),
      setVisible: vi.fn()
    },
    splitDeltaText: {
      active: true,
      setVisible: vi.fn(),
      setText: vi.fn(),
      setColor: vi.fn()
    },
    add: {
      existing: vi.fn(),
      circle: vi.fn(() => ({ setDepth: vi.fn(), destroy: vi.fn() }))
    },
    anims: { exists: vi.fn(() => false) },
    tweens: { add: vi.fn() }
  } as unknown as GameSceneContext;
}

describe('GhostController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetGame();
  });

  it('switches cleanly between optimal, swarm, and off ghost modes', () => {
    const ctx = makeGhostContext();
    const traj = compressTrajectory([
      { timeMs: 0, x: 100, y: 400, flipX: false, animState: 'idle' },
      { timeMs: 500, x: 200, y: 300, flipX: false, animState: 'right' }
    ]);
    ctx.authorTrajectory = traj;
    ctx.swarmBuffer.addAttempt(
      [
        { timeMs: 0, x: 100, y: 400, flipX: false, animState: 'idle' },
        { timeMs: 400, x: 180, y: 320, flipX: false, animState: 'right' }
      ],
      false
    );

    const controller = new GhostController(ctx);

    useGameStore.setState({ ghostMode: 'optimal' });
    controller.applyGhostMode();
    expect(ctx.ghostHero).not.toBeNull();
    expect(ctx.ghostFrames.length).toBe(2);

    useGameStore.setState({ ghostMode: 'swarm' });
    controller.applyGhostMode();
    expect(ctx.ghostHero).toBeNull();
    expect(ctx.swarmGhosts).toHaveLength(1);
    expect(ctx.swarmGhosts[0].alpha).toBe(0.22);

    useGameStore.setState({ ghostMode: 'off' });
    controller.applyGhostMode();
    expect(ctx.ghostHero).toBeNull();
    expect(ctx.swarmGhosts).toHaveLength(0);
  });

  it('updates live split delta and triggers Ghost Surfing boost when landing on ghost', () => {
    const ctx = makeGhostContext();
    const traj = compressTrajectory([
      { timeMs: 0, x: 200, y: 300, flipX: false, animState: 'idle' },
      { timeMs: 500, x: 200, y: 300, flipX: false, animState: 'right' }
    ]);
    ctx.authorTrajectory = traj;
    useGameStore.setState({ ghostMode: 'optimal' });

    const controller = new GhostController(ctx);
    controller.applyGhostMode();

    const replaySpy = vi.spyOn(ctx.ghostHero as NonNullable<typeof ctx.ghostHero>, 'updateReplay');
    const isActive = controller.updateActiveGhostsAndSplit(250, 250);
    expect(isActive).toBe(true);
    expect(replaySpy).toHaveBeenCalledWith(250);
    expect(ctx.splitDeltaText?.setText).toHaveBeenCalled();

    const surfEvents: Array<{ x: number; y: number }> = [];
    const unsub = gameEvents.on('hero:ghost_surf', (p) => surfEvents.push(p));
    controller.updateGhostSurfing(true);
    unsub();

    expect(surfEvents).toHaveLength(1);
    expect(ctx.heroes[0].setVelocityY).toHaveBeenCalled();
    expect(ctx.heroes[0].hasSurfedThisJump).toBe(true);
  });

  it('loads activeDuel challenger ghost with golden tint (0xfbbf24), alpha 0.55, and live split delta even on first attempt with ghostMode off', () => {
    const ctx = makeGhostContext();
    ctx.hasAnyGhost = false;
    (ctx.add as unknown as { text: ReturnType<typeof vi.fn> }).text = vi.fn(() => ({
      active: true,
      setOrigin: vi.fn(),
      setDepth: vi.fn(),
      setAlpha: vi.fn(),
      setPosition: vi.fn(),
      destroy: vi.fn()
    }));

    const rivalTraj = compressTrajectory([
      { timeMs: 0, x: 100, y: 400, flipX: false, animState: 'idle' },
      { timeMs: 600, x: 260, y: 310, flipX: false, animState: 'right' }
    ]);

    useGameStore.setState({
      maxLevel: 1,
      scores: {},
      ghostMode: 'off',
      ghostEnabled: false,
      activeDuel: {
        kind: 'campaign',
        levelId: 1,
        challengerName: 'ALPHA',
        challengerTimeMs: 8420,
        challengerJumps: 4,
        ghostTrajectory: rivalTraj
      }
    });

    const controller = new GhostController(ctx);
    controller.initForLevel();

    expect(ctx.hasAnyGhost).toBe(true);
    expect(ctx.ghostHero).not.toBeNull();
    expect(ctx.ghostHero?.alpha).toBe(0.55);
    expect(ctx.ghostFrames).toHaveLength(2);
    expect(ctx.splitDeltaText?.setVisible).toHaveBeenCalledWith(true);

    const isActive = controller.updateActiveGhostsAndSplit(300, 300);
    expect(isActive).toBe(true);
    expect(ctx.splitDeltaText?.setText).toHaveBeenCalled();
  });
});
