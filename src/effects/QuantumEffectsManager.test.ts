import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';

vi.mock('phaser', () => ({
  default: {
    BlendModes: {
      ADD: 1
    },
    Math: {
      FloatBetween: (min: number, max: number) => min + Math.random() * (max - min)
    }
  }
}));

import type Hero from '../scenes/Hero';
import { QuantumEffectsManager } from './QuantumEffectsManager';

describe('QuantumEffectsManager', () => {
  let mockScene: Phaser.Scene;
  let mockGraphics: Record<string, ReturnType<typeof vi.fn>>;
  let mockLoop: { actualFps: number };

  beforeEach(() => {
    useGameStore.setState({
      reducedEffects: false
    });

    mockGraphics = {
      setDepth: vi.fn().mockReturnThis(),
      setBlendMode: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis(),
      strokeEllipse: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      destroy: vi.fn()
    };

    mockLoop = {
      actualFps: 60
    };

    mockScene = {
      add: {
        graphics: vi.fn().mockReturnValue(mockGraphics)
      },
      game: {
        loop: mockLoop
      }
    } as unknown as Phaser.Scene;
  });

  it('initializes with graphics pipeline and additive blend mode', () => {
    const qe = new QuantumEffectsManager(mockScene);
    expect(mockScene.add.graphics).toHaveBeenCalled();
    expect(mockGraphics.setDepth).toHaveBeenCalledWith(15);
    expect(mockGraphics.setBlendMode).toHaveBeenCalled();
    expect(qe.getIsReduced()).toBe(false);
    qe.destroy();
  });

  it('syncs with Zustand store reducedEffects state', () => {
    const qe = new QuantumEffectsManager(mockScene);
    expect(qe.getIsReduced()).toBe(false);

    useGameStore.getState().setReducedEffects(true);
    expect(qe.getIsReduced()).toBe(true);

    useGameStore.getState().setReducedEffects(false);
    expect(qe.getIsReduced()).toBe(false);
    qe.destroy();
  });

  it('renders de Broglie probability waves when a hero is in motion', () => {
    const qe = new QuantumEffectsManager(mockScene);
    const movingHero = {
      active: true,
      x: 100,
      y: 100,
      isFocused: true,
      body: {
        velocity: { x: 120, y: 0 }
      }
    } as unknown as Hero;

    qe.update(1000, 16.6, [movingHero]);

    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeCircle).toHaveBeenCalled();
    qe.destroy();
  });

  it('does not emit matter waves if hero is stationary (velocity < 15)', () => {
    const qe = new QuantumEffectsManager(mockScene);
    const idleHero = {
      active: true,
      x: 100,
      y: 100,
      isFocused: true,
      body: {
        velocity: { x: 0, y: 0 }
      }
    } as unknown as Hero;

    qe.update(1000, 16.6, [idleHero]);

    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeCircle).not.toHaveBeenCalled();
    qe.destroy();
  });

  it('renders subtle probability wake for multiple moving clones without visual clutter', () => {
    const qe = new QuantumEffectsManager(mockScene);
    const hero1 = {
      active: true,
      x: 100,
      y: 100,
      isFocused: true,
      body: { velocity: { x: 100, y: 0 } }
    } as unknown as Hero;
    const hero2 = {
      active: true,
      x: 140,
      y: 100,
      isFocused: false,
      body: { velocity: { x: -100, y: 0 } }
    } as unknown as Hero;

    qe.update(1000, 16.6, [hero1, hero2]);

    expect(mockGraphics.strokeCircle).toHaveBeenCalled();
    qe.destroy();
  });

  it('renders spacetime vortex distortion and particle suction at portal', () => {
    const qe = new QuantumEffectsManager(mockScene);
    const portal = {
      active: true,
      x: 250,
      y: 200
    } as unknown as Phaser.Physics.Arcade.Sprite;

    qe.update(1000, 16.6, [], portal);

    expect(mockGraphics.strokeEllipse).toHaveBeenCalled();
    expect(mockGraphics.fillCircle).toHaveBeenCalled();
    qe.destroy();
  });

  it('throttles effects when low FPS (< 50 FPS) is detected over multiple frames', () => {
    const qe = new QuantumEffectsManager(mockScene);
    mockLoop.actualFps = 42; // Low FPS

    for (let i = 0; i < 70; i++) {
      qe.update(1000 + i * 16, 16.6, []);
    }

    expect(qe.getIsAutoThrottled()).toBe(true);
    expect(qe.getIsReduced()).toBe(true);

    // FPS recovers back to 60 FPS
    mockLoop.actualFps = 60;
    for (let i = 0; i < 95; i++) {
      qe.update(2500 + i * 16, 16.6, []);
    }
    expect(qe.getIsAutoThrottled()).toBe(false);

    qe.destroy();
  });

  it('cleans up resources and graphics on destroy', () => {
    const qe = new QuantumEffectsManager(mockScene);
    qe.destroy();
    expect(mockGraphics.destroy).toHaveBeenCalled();
  });
});
