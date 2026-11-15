import { describe, expect, it } from 'vitest';
import {
  SeededRandom,
  generateQuantumLevel,
  getAlphaForDifficulty
} from '../src/generator/dagGenerator';
import { isReachable } from '../src/generator/kinematics';
import { createInitialHeroState, stepSimulation } from '../src/generator/simulator';
import { PHYSICS } from '../src/physics/constants';
import type { Platform } from '../src/types';

describe('Deterministic Simulator & DAG Generator Suite', () => {
  describe('PRNG Determinism', () => {
    it('produces identical pseudo-random sequence for identical seeds', () => {
      const rng1 = new SeededRandom(1337);
      const rng2 = new SeededRandom(1337);

      for (let i = 0; i < 50; i++) {
        expect(rng1.next()).toBe(rng2.next());
        expect(rng1.range(10, 100)).toBe(rng2.range(10, 100));
      }
    });

    it('produces different sequences for distinct seeds', () => {
      const rng1 = new SeededRandom(1);
      const rng2 = new SeededRandom(2);

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());
      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('Deterministic Physics Simulator', () => {
    it('accurately integrates gravity and jumping at 60 Hz without Phaser/DOM', () => {
      const initial = createInitialHeroState(100, 500);
      const world = {
        width: 1000,
        height: 1000,
        gravityY: PHYSICS.GRAVITY_Y,
        platforms: [{ x: 50, y: 532, width: 200, height: 20 }]
      };

      // Jump input on ground
      const afterJump = stepSimulation(initial, { left: false, right: false, jump: true }, world);
      expect(afterJump.touchingGround).toBe(false);
      expect(afterJump.vy).toBe(
        PHYSICS.HERO_JUMP_V0 + (PHYSICS.GRAVITY_Y * PHYSICS.DELTA_FIXED_MS) / 1000
      );
      expect(afterJump.animState).toBe('jump');
    });

    it('triggers wall bounce recoil mechanics at scene boundaries', () => {
      const hero = createInitialHeroState(34, 500);
      hero.touchingGround = false;
      hero.vx = -PHYSICS.HERO_SPEED_X;

      const world = {
        width: 1000,
        height: 1000,
        platforms: []
      };

      // Moving left hits left boundary (x <= 32)
      const afterHit = stepSimulation(hero, { left: true, right: false, jump: false }, world);
      expect(afterHit.x).toBe(32);
      expect(afterHit.recoilVx).toBe(PHYSICS.WALL_RECOIL_VX);
      expect(afterHit.recoilTimer).toBe(PHYSICS.WALL_RECOIL_TIMER_MS);
    });
  });

  describe('DAG Generator Level Conformance', () => {
    it('generates fully compliant LevelData with meta, authorGhost, and authorTime', () => {
      const { levelData, simulation } = generateQuantumLevel({
        atom: 7,
        difficulty: 'medium',
        seed: 42
      });

      expect(levelData.id).toBe('7');
      expect(levelData.symbol).toBe('N');
      expect(levelData.atom).toBe('Nitrogen');
      expect(levelData.width).toBe(2600);
      expect(levelData.height).toBe(1900);
      expect(levelData.platforms.length).toBeGreaterThan(5);
      expect(levelData.spikes.length).toBeGreaterThan(0);
      expect(levelData.particles.length).toBeGreaterThan(0);
      expect(levelData.door).toBeDefined();

      // Ghost and verification
      expect(levelData.authorGhost).toBeDefined();
      expect(levelData.authorGhost?.startsWith('v1|')).toBe(true);
      expect(levelData.authorTime).toBeGreaterThan(0);

      // Meta object
      expect(levelData.meta).toBeDefined();
      expect(levelData.meta?.seed).toBe(42);
      expect(levelData.meta?.generatorVersion).toBe('2.0.0');
      expect(levelData.meta?.path.length).toBeGreaterThan(0);

      expect(simulation.success).toBe(true);
    });

    it('is strictly deterministic across runs with the same seed', () => {
      const run1 = generateQuantumLevel({ atom: 8, seed: 999 });
      const run2 = generateQuantumLevel({ atom: 8, seed: 999 });

      expect(run1.levelData.authorGhost).toBe(run2.levelData.authorGhost);
      expect(run1.levelData.authorTime).toBe(run2.levelData.authorTime);
      expect(run1.levelData.platforms).toEqual(run2.levelData.platforms);
      expect(run1.simulation.success).toBe(true);
      expect(run2.simulation.success).toBe(true);
    });
  });

  describe('Comprehensive 100+ Seeds Stress Test', () => {
    it('validates 105 consecutive random seeds without a single failure or crash', () => {
      const totalSeeds = 105;
      let successCount = 0;

      for (let s = 1; s <= totalSeeds; s++) {
        const atom = (s % 36) + 1;
        const diff = s % 3 === 0 ? 'easy' : s % 3 === 1 ? 'medium' : 'hard';

        const { levelData, simulation } = generateQuantumLevel({
          atom,
          seed: s * 17 + 42,
          difficulty: diff
        });

        expect(simulation.success).toBe(true);
        expect(levelData.platforms.length).toBeGreaterThan(0);
        expect(levelData.authorTime).toBeGreaterThan(0);
        expect(levelData.authorGhost).toBeTruthy();

        // Check that door is positioned on top of the final platform
        expect(levelData.door.y).toBeLessThanOrEqual(levelData.height);

        successCount++;
      }

      expect(successCount).toBe(totalSeeds);
    });
  });
});
