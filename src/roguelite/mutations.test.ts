import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MUTATION_MODIFIERS,
  MUTATION_SYNERGIES,
  QUANTUM_MUTATIONS,
  aggregateMutationModifiers,
  detectActiveSynergies,
  findPotentialSynergies,
  getMutationById,
  rollMutationChoices
} from './mutations';

const FORBIDDEN_EMOJIS = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];

describe('Quantum Mutations Catalog (Spec-03)', () => {
  it('defines at least 12 distinct mutations including all 8 Spec-03 core mutations', () => {
    expect(QUANTUM_MUTATIONS.length).toBeGreaterThanOrEqual(12);

    const ids = QUANTUM_MUTATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(QUANTUM_MUTATIONS.length);

    const requiredIds = [
      'hyper_spin',
      'broglie_wake',
      'phase_dash',
      'double_quantum',
      'relative_gravity',
      'infinite_tunnel',
      'reflex_dilation',
      'particle_magnet'
    ];
    for (const req of requiredIds) {
      expect(getMutationById(req)).toBeDefined();
    }
  });

  it('includes Common, Rare, and Exotic rarities and zero forbidden emojis in icons or copy', () => {
    const rarities = new Set(QUANTUM_MUTATIONS.map((m) => m.rarity));
    expect(rarities.has('Common')).toBe(true);
    expect(rarities.has('Rare')).toBe(true);
    expect(rarities.has('Exotic')).toBe(true);

    for (const m of QUANTUM_MUTATIONS) {
      const combined = `${m.icon} ${m.nameEn} ${m.nameFr} ${m.descriptionEn} ${m.descriptionFr}`;
      for (const emoji of FORBIDDEN_EMOJIS) {
        expect(combined.includes(emoji)).toBe(false);
      }
    }
  });

  it('aggregates individual Spec-03 mutation modifiers accurately', () => {
    expect(aggregateMutationModifiers([])).toEqual(DEFAULT_MUTATION_MODIFIERS);

    const hyper = aggregateMutationModifiers(['hyper_spin']);
    expect(hyper.speedMultiplier).toBeCloseTo(1.2, 4);
    expect(hyper.airControlMultiplier).toBeLessThan(1);

    const wake = aggregateMutationModifiers(['broglie_wake']);
    expect(wake.broglieWallWakeDurationMs).toBe(2000);

    const phase = aggregateMutationModifiers(['phase_dash']);
    expect(phase.phaseDashInvulnMs).toBe(350);

    const dbl = aggregateMutationModifiers(['double_quantum']);
    expect(dbl.startingClones).toBe(1);

    const grav = aggregateMutationModifiers(['relative_gravity']);
    expect(grav.gravityMultiplier).toBeCloseTo(0.85, 4);
    expect(grav.apexHangTimeMultiplier).toBeCloseTo(2, 4);

    const tunnel = aggregateMutationModifiers(['infinite_tunnel']);
    expect(tunnel.tunnelRegenIntervalMs).toBe(4000);

    const reflex = aggregateMutationModifiers(['reflex_dilation']);
    expect(reflex.reflexDilationRadiusPx).toBe(40);
    expect(reflex.reflexDilationScale).toBeCloseTo(0.35, 4);
    expect(reflex.reflexDilationDurationMs).toBe(400);
    expect(reflex.reflexDilationCooldownMs).toBe(5000);

    const magnet = aggregateMutationModifiers(['particle_magnet']);
    expect(magnet.particleMagnetRadiusPx).toBe(120);
  });

  it('detects synergies and applies synergy bonus modifiers cleanly', () => {
    expect(MUTATION_SYNERGIES.length).toBeGreaterThanOrEqual(4);

    const potential = findPotentialSynergies(['hyper_spin'], 'phase_dash');
    expect(potential.map((s) => s.id)).toContain('relativistic_blur');

    const active = detectActiveSynergies(['hyper_spin', 'phase_dash']);
    expect(active.map((s) => s.id)).toContain('relativistic_blur');

    const combined = aggregateMutationModifiers(['hyper_spin', 'phase_dash']);
    // Base 350 ms + 100 ms synergy bonus
    expect(combined.phaseDashInvulnMs).toBe(450);
    // Base 1.2 * 1.06 synergy bonus
    expect(combined.speedMultiplier).toBeCloseTo(1.272, 3);
  });

  it('stacks all mutations simultaneously without NaN, Infinity, or extreme physics conflicts', () => {
    const allIds = [...QUANTUM_MUTATIONS.map((m) => m.id), ...QUANTUM_MUTATIONS.map((m) => m.id)];
    const aggregated = aggregateMutationModifiers(allIds);

    for (const [key, value] of Object.entries(aggregated)) {
      expect(Number.isFinite(value), `modifier ${key} must be finite`).toBe(true);
      expect(Number.isNaN(value), `modifier ${key} must not be NaN`).toBe(false);
    }

    expect(aggregated.speedMultiplier).toBeGreaterThanOrEqual(0.75);
    expect(aggregated.speedMultiplier).toBeLessThanOrEqual(1.85);
    expect(aggregated.gravityMultiplier).toBeGreaterThanOrEqual(0.55);
    expect(aggregated.gravityMultiplier).toBeLessThanOrEqual(1.3);
    expect(aggregated.startingClones).toBeLessThanOrEqual(2);
    expect(aggregated.tunnelRegenIntervalMs).toBeGreaterThanOrEqual(1500);
  });

  it('drafts 2 distinct mutations deterministically for a given seed and respects non-stackable limits', () => {
    const first = rollMutationChoices([], 4242, 1);
    const second = rollMutationChoices([], 4242, 1);

    expect(first[0].id).toBe(second[0].id);
    expect(first[1].id).toBe(second[1].id);
    expect(first[0].id).not.toBe(first[1].id);

    // Non-stackable mutations already owned should not be drafted again while eligible pool >= 2
    for (let room = 0; room < 15; room++) {
      const pair = rollMutationChoices(['double_quantum', 'reflex_dilation'], 1337, room);
      expect(pair[0].id).not.toBe('double_quantum');
      expect(pair[1].id).not.toBe('double_quantum');
      expect(pair[0].id).not.toBe('reflex_dilation');
      expect(pair[1].id).not.toBe('reflex_dilation');
      expect(pair[0].id).not.toBe(pair[1].id);
    }
  });
});
