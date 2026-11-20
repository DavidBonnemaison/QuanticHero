import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameEvents } from '../tools/gameEvents';
import {
  COHERENCE_DECAY_PER_SEC,
  COHERENCE_GAINS,
  COHERENCE_IDLE_THRESHOLD_MS,
  COHERENCE_MAX,
  CoherenceSystem,
  getCoherenceTier,
  getTierMultiplier
} from './coherenceSystem';

describe('CoherenceSystem', () => {
  let system: CoherenceSystem;

  beforeEach(() => {
    gameEvents.clear();
    system = new CoherenceSystem();
    system.attach();
  });

  afterEach(() => {
    system.detach();
    gameEvents.clear();
  });

  describe('tier thresholds and multipliers', () => {
    it('classifies raw coherence into x1, x2, x3, and HYPER tiers', () => {
      expect(getCoherenceTier(0)).toBe('x1');
      expect(getCoherenceTier(24)).toBe('x1');
      expect(getCoherenceTier(25)).toBe('x2');
      expect(getCoherenceTier(54)).toBe('x2');
      expect(getCoherenceTier(55)).toBe('x3');
      expect(getCoherenceTier(84)).toBe('x3');
      expect(getCoherenceTier(85)).toBe('HYPER');
      expect(getCoherenceTier(100)).toBe('HYPER');
    });

    it('returns progressive style multipliers per tier', () => {
      expect(getTierMultiplier('x1')).toBe(1);
      expect(getTierMultiplier('x2')).toBe(2);
      expect(getTierMultiplier('x3')).toBe(3);
      expect(getTierMultiplier('HYPER')).toBe(4);
    });
  });

  describe('coherence gains from gameplay events', () => {
    it('awards +25 for Wave-Dash (hero:wavedash)', () => {
      gameEvents.emit('hero:wavedash', { x: 100, y: 200 });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.wavedash);
      expect(system.getValue()).toBeCloseTo(0.25);
      expect(system.getTier()).toBe('x2');
    });

    it('awards +15 for Wall-Jump on neon wall (hero:wall_bounce)', () => {
      gameEvents.emit('hero:wall_bounce', { x: 50, y: 120 });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.wallBounce);
      expect(system.getTier()).toBe('x1');
    });

    it('awards +20 for Phase-Switch (phase:shift) and +20 for Quantum Tunneling (tunnel:use)', () => {
      gameEvents.emit('phase:shift', { phase: 'magenta' });
      expect(system.getRaw()).toBe(20);

      gameEvents.emit('tunnel:use', { remaining: 1 });
      expect(system.getRaw()).toBe(40);
      expect(system.getTier()).toBe('x2');
    });

    it('awards +20 for particle:collect, tether:collect, and hero:wormhole', () => {
      gameEvents.emit('particle:collect', { type: 'speed' });
      expect(system.getRaw()).toBe(20);

      gameEvents.emit('tether:collect', { x: 10, y: 20, type: 'lowGravity' });
      expect(system.getRaw()).toBe(40);

      gameEvents.emit('hero:wormhole', { wormholeId: 'w1', outX: 300, outY: 100, speed: 400 });
      expect(system.getRaw()).toBe(60);
      expect(system.getTier()).toBe('x3');
    });

    it('awards +25 for Ghost Surfing (hero:ghost_surf) and Pauli Repulsion (pauli:blast)', () => {
      gameEvents.emit('hero:ghost_surf', { x: 120, y: 80 });
      expect(system.getRaw()).toBe(25);

      gameEvents.emit('pauli:blast', { hero1Id: 1, hero2Id: 2 });
      expect(system.getRaw()).toBe(50);
    });

    it('clamps raw coherence at 100 (normalized 1.0) and reaches HYPER tier', () => {
      for (let i = 0; i < 6; i++) {
        gameEvents.emit('hero:wavedash', { x: i * 10, y: 0 });
      }
      expect(system.getRaw()).toBe(COHERENCE_MAX);
      expect(system.getValue()).toBe(1);
      expect(system.getTier()).toBe('HYPER');
      expect(system.isCoherentRun()).toBe(true);
    });
  });

  describe('idle decay and death decoherence', () => {
    it('does not decay while grounded idle for <= 600ms, then decays at -25/s', () => {
      system.addCoherence(80);
      expect(system.getRaw()).toBe(80);

      // Exactly 600 ms grounded & stationary: no decay yet
      system.update(COHERENCE_IDLE_THRESHOLD_MS, 0, true);
      expect(system.getRaw()).toBe(80);

      // Next 1000 ms grounded & stationary: -25 / s
      system.update(1000, 5, true);
      expect(system.getRaw()).toBeCloseTo(80 - COHERENCE_DECAY_PER_SEC, 5);
      expect(system.getTier()).toBe('x3');

      // Moving horizontally (|vx| >= 20) resets the idle timer
      system.update(200, 120, true);
      system.update(500, 0, true);
      expect(system.getRaw()).toBeCloseTo(55, 5);
    });

    it('does not decay while airborne even when |vx| < 20', () => {
      system.addCoherence(60);
      system.update(2000, 0, false);
      expect(system.getRaw()).toBe(60);
    });

    it('drops instantly to 0 on hero:death and emits coherence:changed with decoherence=true', () => {
      const spy = vi.fn();
      gameEvents.on('coherence:changed', spy);

      system.addCoherence(90);
      expect(system.getTier()).toBe('HYPER');
      spy.mockClear();

      gameEvents.emit('hero:death', { remaining: 0 });

      expect(system.getRaw()).toBe(0);
      expect(system.getValue()).toBe(0);
      expect(system.getTier()).toBe('x1');
      expect(system.isCoherentRun()).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 0,
          raw: 0,
          tier: 'x1',
          decoherence: true
        })
      );
    });
  });

  describe('styleScore, COHERENT RUN, and lifecycle', () => {
    it('accumulates styleScore scaled by tier and exposes coherentRun snapshot', () => {
      // +15 -> raw 15 (x1, mult 1) -> +15
      gameEvents.emit('hero:wall_bounce', { x: 0, y: 0 });
      expect(system.getStyleScore()).toBe(15);
      expect(system.isCoherentRun()).toBe(false);

      // +25 -> raw 40 (x2, mult 2) -> +50 => 65
      gameEvents.emit('hero:wavedash', { x: 0, y: 0 });
      expect(system.getStyleScore()).toBe(65);

      // +20 -> raw 60 (x3, mult 3) -> +60 => 125
      gameEvents.emit('particle:collect', { type: 'speed' });
      expect(system.getStyleScore()).toBe(125);

      // +25 -> raw 85 (HYPER, mult 4) -> +100 => 225
      gameEvents.emit('hero:ghost_surf', { x: 0, y: 0 });
      expect(system.getStyleScore()).toBe(225);
      expect(system.isCoherentRun()).toBe(true);

      expect(system.getSnapshot()).toEqual({
        value: 0.85,
        raw: 85,
        tier: 'HYPER',
        styleScore: 225,
        coherentRun: true
      });
    });

    it('resets cleanly and stops listening after detach()', () => {
      system.addCoherence(90);
      system.reset(true);
      expect(system.getRaw()).toBe(0);
      expect(system.getStyleScore()).toBe(0);
      expect(system.getTier()).toBe('x1');

      system.detach();
      gameEvents.emit('hero:wavedash', { x: 0, y: 0 });
      expect(system.getRaw()).toBe(0);
    });
  });
});
