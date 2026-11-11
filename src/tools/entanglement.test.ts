import { describe, expect, it } from 'vitest';
import * as allLevels from '../data/levels';
import type { LevelData } from '../types';

describe('Quantum Entanglement Mode & Physics', () => {
  const levels = allLevels as unknown as Record<string, LevelData>;

  describe('5 Dedicated Entanglement Levels Validation', () => {
    it('defines levels 110 to 114 with proper symbols and atoms', () => {
      expect(levels.level110).toBeDefined();
      expect(levels.level111).toBeDefined();
      expect(levels.level112).toBeDefined();
      expect(levels.level113).toBeDefined();
      expect(levels.level114).toBeDefined();

      expect(levels.level110.symbol).toBe('Ds');
      expect(levels.level110.atom).toBe('Darmstadtium');

      expect(levels.level111.symbol).toBe('Rg');
      expect(levels.level111.atom).toBe('Roentgenium');

      expect(levels.level112.symbol).toBe('Cn');
      expect(levels.level112.atom).toBe('Copernicium');

      expect(levels.level113.symbol).toBe('Nh');
      expect(levels.level113.atom).toBe('Nihonium');

      expect(levels.level114.symbol).toBe('Fl');
      expect(levels.level114.atom).toBe('Flerovium');
    });

    it('configures mode mirror_x for levels 110 and 111', () => {
      expect(levels.level110.entanglement?.mode).toBe('mirror_x');
      expect(levels.level110.entanglement?.portalMode).toBe('dual');
      expect(levels.level110.entanglement?.betaDoor).toBeDefined();

      expect(levels.level111.entanglement?.mode).toBe('mirror_x');
      expect(levels.level111.entanglement?.portalMode).toBe('single');
      expect(levels.level111.door).toBeDefined();
    });

    it('configures mode inverted_gravity for levels 112 and 113', () => {
      expect(levels.level112.entanglement?.mode).toBe('inverted_gravity');
      expect(levels.level112.entanglement?.betaSpawn?.y).toBeLessThan(levels.level112.player.position.y);
      expect(levels.level112.entanglement?.betaDoor?.y).toBeLessThan(levels.level112.door.y);

      expect(levels.level113.entanglement?.mode).toBe('inverted_gravity');
      expect(levels.level113.entanglement?.portalMode).toBe('dual');
    });

    it('configures mode mirror_and_gravity for level 114 (ultimate challenge)', () => {
      const l114 = levels.level114;
      expect(l114.entanglement?.mode).toBe('mirror_and_gravity');
      expect(l114.entanglement?.portalMode).toBe('dual');

      // Alpha starts at bottom left, Beta starts at top right
      expect(l114.player.position.x).toBeLessThan(800);
      expect(l114.player.position.y).toBeGreaterThan(500);

      expect(l114.entanglement?.betaSpawn?.x).toBeGreaterThan(800);
      expect(l114.entanglement?.betaSpawn?.y).toBeLessThan(500);

      // Doors are cross-positioned
      expect(l114.door.x).toBeGreaterThan(800);
      expect(l114.entanglement?.betaDoor?.x).toBeLessThan(800);
    });

    it('provides informative explanations for every entanglement level', () => {
      for (const id of [110, 111, 112, 113, 114]) {
        const lvl = levels[`level${id}`];
        expect(lvl.explanations).toBeDefined();
        expect(lvl.explanations!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Adaptive Camera Centroid & Dynamic Bounding Box Framing', () => {
    const calculateCameraView = (
      alphaX: number,
      alphaY: number,
      betaX: number,
      betaY: number,
      screenWidth = 800,
      screenHeight = 600,
      paddingX = 240,
      paddingY = 200
    ) => {
      const cx = (alphaX + betaX) / 2;
      const cy = (alphaY + betaY) / 2;
      const dx = Math.abs(alphaX - betaX);
      const dy = Math.abs(alphaY - betaY);

      const requiredZoomX = screenWidth / (dx + paddingX);
      const requiredZoomY = screenHeight / (dy + paddingY);
      const targetZoom = Math.min(1.0, Math.max(0.6, Math.min(requiredZoomX, requiredZoomY)));

      return { cx, cy, dx, dy, targetZoom };
    };

    it('centers on the midpoint of Alpha and Beta', () => {
      const view = calculateCameraView(200, 800, 600, 800);
      expect(view.cx).toBe(400);
      expect(view.cy).toBe(800);
    });

    it('maintains 1.0x zoom when heroes are close together', () => {
      const view = calculateCameraView(300, 500, 350, 500);
      expect(view.dx).toBe(50);
      expect(view.targetZoom).toBe(1.0);
    });

    it('adjusts zoom dynamically as heroes move apart horizontally', () => {
      const view = calculateCameraView(100, 500, 900, 500);
      expect(view.dx).toBe(800);
      // requiredZoomX = 800 / (800 + 240) = 800 / 1040 = 0.769
      expect(view.targetZoom).toBeCloseTo(0.769, 2);
    });

    it('clamps minimum zoom at 0.6x when heroes are at opposite edges of large levels', () => {
      const view = calculateCameraView(50, 900, 1550, 100);
      expect(view.dx).toBe(1500);
      expect(view.dy).toBe(800);
      expect(view.targetZoom).toBe(0.6);
    });
  });

  describe('Quantum Laser Beam Wave Envelope', () => {
    it('envelope reaches 0 at endpoints and peaks in the center (t=0.5)', () => {
      const envelope = (t: number) => Math.sin(t * Math.PI);

      expect(envelope(0)).toBeCloseTo(0, 5);
      expect(envelope(1)).toBeCloseTo(0, 5);
      expect(envelope(0.5)).toBeCloseTo(1, 5);
    });

    it('amplitude modulates with sinusoidal pulsation', () => {
      const getAmplitude = (time: number) => 8 + 4 * Math.sin(time * 0.004);

      // Base is 8, varies between 4 and 12
      expect(getAmplitude(0)).toBe(8);
      expect(getAmplitude(1000)).toBeGreaterThanOrEqual(4);
      expect(getAmplitude(1000)).toBeLessThanOrEqual(12);
    });
  });
});
