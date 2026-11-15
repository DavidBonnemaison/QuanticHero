import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_ARCHETYPE_MAPPING,
  SMART_ARCHETYPES,
  createConservationCageArchetype,
  createLivingFloorArchetype,
  createMidairAssistArchetype,
  createPauliTrampolineArchetype,
  createPerpetualMetronomeArchetype,
  createPhaseRemoteArchetype,
  getSmartArchetype,
  listSmartArchetypes
} from '../src/generator/archetypes';
import { checkScreenEdgeTunnel, checkTunnelObstacle } from '../src/mechanics/quantumMechanics';

describe('Spec-11: 6 Smart Level Design Archetypes', () => {
  it('lists all 6 smart archetypes', () => {
    const ids = listSmartArchetypes();
    expect(ids).toHaveLength(6);
    expect(ids).toEqual(
      expect.arrayContaining([
        'living_floor',
        'phase_remote',
        'perpetual_metronome',
        'midair_assist',
        'pauli_trampoline',
        'conservation_cage'
      ])
    );
    expect(Object.keys(CAMPAIGN_ARCHETYPE_MAPPING)).toHaveLength(6);
  });

  it('1. living_floor: configures inverted_gravity with allowHeroCollision and open central chasm', () => {
    const level = createLivingFloorArchetype();
    expect(level.archetype).toBe('living_floor');
    expect(level.entanglement?.mode).toBe('inverted_gravity');
    expect(level.entanglement?.allowHeroCollision).toBe(true);
    expect(level.entanglement?.betaSpawn).toBeDefined();
    expect(level.entanglement?.portalMode).toBe('dual');
    // No floor or ceiling platform spanning the middle chasm
    const midX = level.width / 2;
    const midBlockingPlat = level.platforms.find((p) => p.x < midX && p.x + p.width > midX);
    expect(midBlockingPlat).toBeUndefined();
  });

  it('2. phase_remote: has low-ceiling spikes tunnel and alternating cyan/magenta bridge', () => {
    const level = createPhaseRemoteArchetype();
    expect(level.archetype).toBe('phase_remote');
    expect(level.particles.some((p) => p.type === 'duplicate')).toBe(true);
    const phases = level.platforms.filter((p) => p.phase).map((p) => p.phase);
    expect(phases).toEqual(['cyan', 'magenta', 'cyan']);
    expect(level.spikes.some((s) => s.y < 700 && (s.width ?? 0) >= 600)).toBe(true);
  });

  it('3. perpetual_metronome: has requireLock plate on 650ms decay platform framed by two bouncing walls', () => {
    const level = createPerpetualMetronomeArchetype();
    expect(level.archetype).toBe('perpetual_metronome');
    const decayPlat = level.platforms.find((p) => p.decayMs === 650);
    expect(decayPlat).toBeDefined();
    const walls = level.platforms.filter((p) => p.kind === 'wall');
    expect(walls.length).toBeGreaterThanOrEqual(2);
    expect(level.pressurePlates?.[0]?.requireLock).toBe(true);
    expect(level.gates?.length).toBeGreaterThanOrEqual(1);
  });

  it('4. midair_assist: has airborne autoSwitchOnTrigger pressure plate over chasm', () => {
    const level = createMidairAssistArchetype();
    expect(level.archetype).toBe('midair_assist');
    const plate = level.pressurePlates?.[0];
    expect(plate).toBeDefined();
    expect(plate?.autoSwitchOnTrigger).toBe(true);
    expect(plate?.y).toBeLessThan(650);
    expect(level.gates?.length).toBeGreaterThanOrEqual(1);
  });

  it('5. pauli_trampoline: has 280px vertical chimney, duplicate + pauli particles, and distant lock plate', () => {
    const level = createPauliTrampolineArchetype();
    expect(level.archetype).toBe('pauli_trampoline');
    expect(level.particles.some((p) => p.type === 'duplicate')).toBe(true);
    expect(level.particles.some((p) => p.type === 'pauli')).toBe(true);
    const chimneyWall = level.platforms.find((p) => p.height === 280);
    expect(chimneyWall).toBeDefined();
    expect(level.pressurePlates?.[0]?.requireLock).toBe(true);
  });

  it('6. conservation_cage: surrounds exit portal with #f1c40f ephemeral platforms and a bait particle', () => {
    const level = createConservationCageArchetype();
    expect(level.archetype).toBe('conservation_cage');
    const ephemeralPlats = level.platforms.filter(
      (p) => p.ephemeral === true && p.color === '#f1c40f'
    );
    expect(ephemeralPlats.length).toBeGreaterThanOrEqual(3);
    expect(level.particles.some((p) => p.restoresEphemeral === true)).toBe(true);
  });

  it('getSmartArchetype supports overrides for campaign integration', () => {
    const custom = getSmartArchetype('living_floor', { id: '999', atom: 'Testium' });
    expect(custom.id).toBe('999');
    expect(custom.atom).toBe('Testium');
    expect(SMART_ARCHETYPES.living_floor).toBe(createLivingFloorArchetype);
  });
});

describe('Spec-11 WOW #3: Screen-Edge Quantum Tunneling', () => {
  it('teleports hero from right edge (x >= width - 24) to x = 28', () => {
    const res = checkTunnelObstacle(1180, 400, 40, 40, 'right', null, 1200);
    expect(res).toEqual({ canTunnel: true, exitX: 28, thickness: 0 });
  });

  it('teleports hero from left edge (x <= 24) to x = width - 28', () => {
    const res = checkTunnelObstacle(20, 400, 40, 40, 'left', null, 1200);
    expect(res).toEqual({ canTunnel: true, exitX: 1172, thickness: 0 });
  });

  it('returns null when hero is not pressing against screen edge', () => {
    expect(checkScreenEdgeTunnel(600, 'right', 1200)).toBeNull();
    expect(checkScreenEdgeTunnel(600, 'left', 1200)).toBeNull();
    expect(checkTunnelObstacle(600, 400, 40, 40, 'right', null, 1200)).toBeNull();
  });

  it('preserves standard thin-platform tunneling behavior', () => {
    const wall = { x: 200, y: 360, width: 40, height: 100 };
    const res = checkTunnelObstacle(180, 400, 40, 40, 'right', wall);
    expect(res?.canTunnel).toBe(true);
    expect(res?.exitX).toBe(264);
  });
});
