import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameEvents } from '../tools/gameEvents';
import { BohrBackgroundRenderer, getElectronShells } from './BohrBackgroundRenderer';

function createMockScene() {
  const createdCircles: any[] = [];
  return {
    createdCircles,
    add: {
      circle: vi.fn((x: number, y: number, radius: number, color: number, alpha: number) => {
        const obj = {
          x,
          y,
          radius,
          color,
          alpha,
          active: true,
          scrollFactor: 1,
          depth: 0,
          scaleX: 1,
          scaleY: 1,
          setScrollFactor: vi.fn(function (this: any, sf: number) {
            this.scrollFactor = sf;
            return this;
          }),
          setDepth: vi.fn(function (this: any, d: number) {
            this.depth = d;
            return this;
          }),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setScale: vi.fn(function (this: any, s: number) {
            this.scaleX = s;
            this.scaleY = s;
            return this;
          }),
          setAlpha: vi.fn(function (this: any, a: number) {
            this.alpha = a;
            return this;
          }),
          setPosition: vi.fn(function (this: any, nx: number, ny: number) {
            this.x = nx;
            this.y = ny;
            return this;
          }),
          destroy: vi.fn(function (this: any) {
            this.active = false;
          })
        };
        createdCircles.push(obj);
        return obj;
      })
    }
  };
}

describe('BohrBackgroundRenderer & getElectronShells', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  describe('getElectronShells(Z = 1..118)', () => {
    it('computes exact shells for key reference elements', () => {
      expect(getElectronShells(1)).toEqual([1]); // H
      expect(getElectronShells(2)).toEqual([2]); // He
      expect(getElectronShells(6)).toEqual([2, 4]); // C
      expect(getElectronShells(10)).toEqual([2, 8]); // Ne
      expect(getElectronShells(24)).toEqual([2, 8, 13, 1]); // Cr (exception)
      expect(getElectronShells(26)).toEqual([2, 8, 14, 2]); // Fe
      expect(getElectronShells(29)).toEqual([2, 8, 18, 1]); // Cu (exception)
      expect(getElectronShells(79)).toEqual([2, 8, 18, 32, 18, 1]); // Au
      expect(getElectronShells(118)).toEqual([2, 8, 18, 32, 32, 18, 8]); // Og
    });

    it('ensures total electrons equal Z for every element Z = 1..118', () => {
      for (let z = 1; z <= 118; z++) {
        const shells = getElectronShells(z);
        const sum = shells.reduce((acc, n) => acc + n, 0);
        expect(sum).toBe(z);
        expect(shells.every((n) => n > 0)).toBe(true);
      }
    });
  });

  describe('BohrBackgroundRenderer instance', () => {
    it('renders nucleus, orbital rings, and electrons with scrollFactor 0.25 and depth 1', () => {
      const mockScene = createMockScene();
      const renderer = new BohrBackgroundRenderer(mockScene as any, 6, 400, 300);

      expect(renderer.getShells()).toEqual([2, 4]);
      expect(renderer.getOrbitalRingCount()).toBe(2);
      expect(renderer.getTotalElectronCount()).toBe(6);

      for (const circle of mockScene.createdCircles) {
        expect(circle.scrollFactor).toBe(0.25);
        expect(circle.depth).toBe(1);
      }

      renderer.destroy();
    });

    it('adds a luminous electron to the valence shell on addValenceElectron()', () => {
      const mockScene = createMockScene();
      const renderer = new BohrBackgroundRenderer(mockScene as any, 6, 400, 300);

      expect(renderer.getValenceElectronCount()).toBe(4);
      expect(renderer.getTotalElectronCount()).toBe(6);

      const newValence = renderer.addValenceElectron();
      expect(newValence).toBe(5);
      expect(renderer.getValenceElectronCount()).toBe(5);
      expect(renderer.getTotalElectronCount()).toBe(7);

      renderer.destroy();
    });

    it('pulses on bgm:beat event and decays smoothly in update()', () => {
      const mockScene = createMockScene();
      const renderer = new BohrBackgroundRenderer(mockScene as any, 10, 400, 300);

      expect(renderer.getBeatPulse()).toBe(0);
      gameEvents.emit('bgm:beat', { step: 0, bpm: 108 });
      expect(renderer.getBeatPulse()).toBe(1);

      renderer.update(100, 50);
      expect(renderer.getBeatPulse()).toBeLessThan(1);
      expect(renderer.getBeatPulse()).toBeGreaterThan(0);

      renderer.destroy();
    });

    it('resets bonus valence electrons on resetValenceElectrons() while keeping ground-state electrons', () => {
      const mockScene = createMockScene();
      const renderer = new BohrBackgroundRenderer(mockScene as any, 6, 400, 300);

      expect(renderer.getShells()).toEqual([2, 4]);
      expect(renderer.getTotalElectronCount()).toBe(6);

      renderer.addValenceElectron();
      renderer.addValenceElectron();
      expect(renderer.getShells()).toEqual([2, 6]);
      expect(renderer.getValenceElectronCount()).toBe(6);
      expect(renderer.getTotalElectronCount()).toBe(8);

      renderer.resetValenceElectrons();
      expect(renderer.getShells()).toEqual([2, 4]);
      expect(renderer.getValenceElectronCount()).toBe(4);
      expect(renderer.getTotalElectronCount()).toBe(6);

      renderer.destroy();
    });
  });
});
