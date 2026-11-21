import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameEvents } from '../tools/gameEvents';
import {
  COHERENCE_DECAY_PER_SEC,
  COHERENCE_GAINS,
  COHERENCE_HYPER_DECAY_PER_SEC,
  COHERENCE_IDLE_THRESHOLD_MS,
  COHERENCE_MAX,
  COHERENCE_PASSIVE_DECAY_PER_SEC,
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
    it('awards balanced gains for Wave-Dash and Wall-Bounce (requiring chained flow to climb)', () => {
      gameEvents.emit('hero:wavedash', { x: 100, y: 200 });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.wavedash);
      expect(system.getTier()).toBe('x1');

      gameEvents.emit('hero:wall_bounce', { x: 50, y: 120 });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.wavedash + COHERENCE_GAINS.wallBounce);
      expect(system.getTier()).toBe('x1');

      gameEvents.emit('hero:wavedash', { x: 120, y: 200 });
      expect(system.getTier()).toBe('x2');
    });

    it('awards balanced gains for Phase-Switch, Quantum Tunneling, particle, wormhole, and Pauli', () => {
      gameEvents.emit('phase:shift', { phase: 'magenta' });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.phaseShift);

      gameEvents.emit('tunnel:use', { remaining: 1 });
      expect(system.getRaw()).toBe(COHERENCE_GAINS.phaseShift + COHERENCE_GAINS.tunnel);

      gameEvents.emit('particle:collect', { type: 'speed' });
      gameEvents.emit('tether:collect', { x: 10, y: 20, type: 'lowGravity' });
      gameEvents.emit('hero:wormhole', { wormholeId: 'w1', outX: 300, outY: 100, speed: 400 });
      gameEvents.emit('pauli:blast', { hero1Id: 1, hero2Id: 2 });

      const expected =
        COHERENCE_GAINS.phaseShift +
        COHERENCE_GAINS.tunnel +
        COHERENCE_GAINS.particleCollect * 2 +
        COHERENCE_GAINS.wormhole +
        COHERENCE_GAINS.pauliBlast;
      expect(system.getRaw()).toBe(expected);
      expect(system.getTier()).toBe('x3');
    });

    it('clamps raw coherence at 100 (normalized 1.0) and reaches HYPER tier after sustained chain', () => {
      for (let i = 0; i < 8; i++) {
        gameEvents.emit('hero:wavedash', { x: i * 10, y: 0 });
      }
      expect(system.getRaw()).toBe(COHERENCE_MAX);
      expect(system.getValue()).toBe(1);
      expect(system.getTier()).toBe('HYPER');
      expect(system.isCoherentRun()).toBe(true);
    });
  });

  describe('passive decay, rapid idle decay, and death decoherence', () => {
    it('applies continuous passive decay while moving/airborne and faster decay in HYPER', () => {
      system.addCoherence(60);
      expect(system.getTier()).toBe('x3');

      // Moving for 1s: passive decay (-COHERENCE_PASSIVE_DECAY_PER_SEC)
      system.update(1000, 180, true);
      expect(system.getRaw()).toBeCloseTo(60 - COHERENCE_PASSIVE_DECAY_PER_SEC, 5);

      // Airborne for 1s: still passively drains
      const beforeAir = system.getRaw();
      system.update(1000, 0, false);
      expect(system.getRaw()).toBeCloseTo(beforeAir - COHERENCE_PASSIVE_DECAY_PER_SEC, 5);

      // In HYPER tier: drains faster (-COHERENCE_HYPER_DECAY_PER_SEC / s)
      system.addCoherence(100);
      expect(system.getTier()).toBe('HYPER');
      system.update(1000, 200, true);
      expect(system.getRaw()).toBeCloseTo(100 - COHERENCE_HYPER_DECAY_PER_SEC, 5);
    });

    it('drains passively during initial idle grace then rapidly at -COHERENCE_DECAY_PER_SEC when idle', () => {
      system.addCoherence(80);

      // During idle grace window (350 ms): only passive decay
      system.update(COHERENCE_IDLE_THRESHOLD_MS, 0, true);
      const afterGrace =
        80 - (COHERENCE_IDLE_THRESHOLD_MS / 1000) * COHERENCE_PASSIVE_DECAY_PER_SEC;
      expect(system.getRaw()).toBeCloseTo(afterGrace, 5);

      // Next 1000 ms grounded & stationary: rapid idle decay (-45 / s)
      system.update(1000, 5, true);
      expect(system.getRaw()).toBeCloseTo(afterGrace - COHERENCE_DECAY_PER_SEC, 5);
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
      // +8 -> raw 8 (x1, mult 1) -> +8
      gameEvents.emit('hero:wall_bounce', { x: 0, y: 0 });
      expect(system.getStyleScore()).toBe(8);
      expect(system.isCoherentRun()).toBe(false);

      // +14 -> raw 22 (x1, mult 1) -> +14 => 22
      gameEvents.emit('hero:wavedash', { x: 0, y: 0 });
      expect(system.getStyleScore()).toBe(22);

      // +10 -> raw 32 (x2, mult 2) -> +20 => 42
      gameEvents.emit('particle:collect', { type: 'speed' });
      expect(system.getStyleScore()).toBe(42);

      // Reach HYPER (85+)
      system.addCoherence(53); // raw 85 (HYPER, mult 4) -> +212 => 254
      expect(system.isCoherentRun()).toBe(true);
      expect(system.getSnapshot()).toEqual({
        value: 0.85,
        raw: 85,
        tier: 'HYPER',
        styleScore: 254,
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
