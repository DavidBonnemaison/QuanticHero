import { describe, expect, it } from 'vitest';
import { assembleCampaignLevel } from '../src/generator/chunkAssembler';
import { type SimWorld, simulateFullLevel } from '../src/generator/simulator';
import { PHYSICS } from '../src/physics/constants';
import type { LevelData, Platform } from '../src/types';

function buildSimWorld(levelData: LevelData): SimWorld {
  return {
    width: levelData.width,
    height: levelData.height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms: levelData.platforms,
    spikes: levelData.spikes,
    particles: levelData.particles,
    gates: levelData.gates,
    pressurePlates: levelData.pressurePlates,
    collapse: levelData.collapse,
    bounceWalls: true
  };
}

describe('Required Mechanics Invariant (Positive & Negative Tests)', () => {
  it('Level 2 (He): passes with speed, FAILS without speed particle', () => {
    const assembly = assembleCampaignLevel(2, 49);
    expect(assembly.simulation.success).toBe(true);

    const worldWithoutSpeed: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'speed')
    };
    const res = simulateFullLevel(
      worldWithoutSpeed,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 3 (Li): passes with lowGravity, FAILS without lowGravity particle', () => {
    const assembly = assembleCampaignLevel(3, 56);
    expect(assembly.simulation.success).toBe(true);

    const worldWithoutLowG: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'lowGravity')
    };
    const res = simulateFullLevel(
      worldWithoutLowG,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 4 (Be): passes with duplicate + requireLock plate, FAILS without duplicate', () => {
    const assembly = assembleCampaignLevel(4, 63);
    expect(assembly.simulation.success).toBe(true);
    expect(assembly.levelData.pressurePlates?.some((pl) => pl.requireLock)).toBe(true);

    const worldWithoutDuplicate: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'duplicate')
    };
    const res = simulateFullLevel(
      worldWithoutDuplicate,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 5 (B): passes with neon bounce walls, FAILS if kind=wall is removed', () => {
    const assembly = assembleCampaignLevel(5, 70);
    expect(assembly.simulation.success).toBe(true);
    expect(assembly.levelData.platforms.some((p) => p.kind === 'wall')).toBe(true);

    const platformsWithoutWalls: Platform[] = assembly.levelData.platforms.filter(
      (p) => p.kind !== 'wall'
    );
    const worldWithoutWalls: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      platforms: platformsWithoutWalls
    };
    const res = simulateFullLevel(
      worldWithoutWalls,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 6 (C): passes with antiGravity, FAILS without antiGravity particle', () => {
    const assembly = assembleCampaignLevel(6, 77);
    expect(assembly.simulation.success).toBe(true);

    const worldWithoutAntiG: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'antiGravity')
    };
    const res = simulateFullLevel(
      worldWithoutAntiG,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 7 (N): passes with 1 tunnel charge, FAILS without tunnel particle', () => {
    const assembly = assembleCampaignLevel(7, 84);
    expect(assembly.simulation.success).toBe(true);

    const worldWithoutTunnel: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'tunnel')
    };
    const res = simulateFullLevel(
      worldWithoutTunnel,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 8 (O): passes with Phase Shift, FAILS if magenta phase platforms are non-solid', () => {
    const assembly = assembleCampaignLevel(8, 91);
    expect(assembly.simulation.success).toBe(true);
    expect(assembly.levelData.platforms.some((p) => p.phase === 'magenta')).toBe(true);

    // Simulate what happens if phase never shifts away from initial 'cyan': magenta platforms remain intangible
    const worldWithoutPhaseShift: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      platforms: assembly.levelData.platforms.filter((p) => p.phase !== 'magenta')
    };
    const res = simulateFullLevel(
      worldWithoutPhaseShift,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });

  it('Level 9 (F): passes with duplicate + pauli, FAILS if either duplicate or pauli is removed', () => {
    const assembly = assembleCampaignLevel(9, 98);
    expect(assembly.simulation.success).toBe(true);

    const worldWithoutPauli: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'pauli')
    };
    expect(
      simulateFullLevel(
        worldWithoutPauli,
        assembly.levelData.player.position,
        assembly.levelData.door,
        assembly.fullPlatformPath
      ).success
    ).toBe(false);

    const worldWithoutDuplicate: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'duplicate')
    };
    expect(
      simulateFullLevel(
        worldWithoutDuplicate,
        assembly.levelData.player.position,
        assembly.levelData.door,
        assembly.fullPlatformPath
      ).success
    ).toBe(false);
  });

  it('Level 10 (Ne): passes with timeDilation + collapse, FAILS without timeDilation', () => {
    const assembly = assembleCampaignLevel(10, 105);
    expect(assembly.simulation.success).toBe(true);
    expect(assembly.levelData.collapse).toBeDefined();

    const worldWithoutTimeDilation: SimWorld = {
      ...buildSimWorld(assembly.levelData),
      particles: assembly.levelData.particles.filter((p) => p.type !== 'timeDilation')
    };
    const res = simulateFullLevel(
      worldWithoutTimeDilation,
      assembly.levelData.player.position,
      assembly.levelData.door,
      assembly.fullPlatformPath
    );
    expect(res.success).toBe(false);
  });
});
