import { describe, expect, it } from 'vitest';
import { assemblePacedLevel } from '../src/generator/chunkAssembler';
import {
  checkChunksOverlap,
  computeChunkBounds,
  createDecayZoneChunk,
  createElectronChasmChunk,
  createGravityWellChunk,
  createResolutionChunk,
  createSpawnChunk,
  createSpeedrunHighwayChunk,
  createSuperpositionChamberChunk,
  translateChunk
} from '../src/generator/chunks';
import { generateQuantumLevel } from '../src/generator/dagGenerator';
import { isReachable } from '../src/generator/kinematics';
import {
  createInitialHeroState,
  simulatePlatformTransition,
  stepSimulation
} from '../src/generator/simulator';
import { PHYSICS } from '../src/physics/constants';

describe('Spec-04: Modular Level Design Chunks & Paced Assembler Suite', () => {
  describe('1. Individual Chunk Archetypes Conformance', () => {
    it('generates Archetype 1: Le Puits Gravitationnel (Vertical Ascent)', () => {
      const well = createGravityWellChunk({
        wellWidth: 360,
        height: 440,
        steps: 3
      });

      expect(well.archetype).toBe('gravity_well');
      expect(well.bounds.width).toBeGreaterThanOrEqual(320);
      expect(well.bounds.width).toBeLessThanOrEqual(420);

      // Neon rebound vertical walls with kind: 'wall'
      const walls = well.platforms.filter((p) => p.kind === 'wall');
      expect(walls.length).toBeGreaterThanOrEqual(2);
      expect(walls[0].kind).toBe('wall');
      expect(walls[1].kind).toBe('wall');

      // Hazard spikes at the bottom of the pit
      expect(well.spikes.length).toBeGreaterThan(0);
      const bottomSpike = well.spikes[0];
      expect(bottomSpike.y).toBeGreaterThan(well.entry.y);

      // Zigzag climbing ledges and entry/exit positions
      expect(well.pathPlatforms.length).toBeGreaterThanOrEqual(4);
      expect(well.entry.y).toBeGreaterThan(well.exit.y); // Vertical climb: entry is at bottom, exit at top
    });

    it('generates Archetype 2: L’Autoroute Quantique (Speedrun Highway)', () => {
      const highway = createSpeedrunHighwayChunk({
        steps: 4,
        horizontalSpacing: 220,
        verticalDrop: 50,
        platformWidth: 200
      });

      expect(highway.archetype).toBe('speedrun_highway');
      expect(highway.platforms.length).toBe(4);

      // Fluid descending steps
      for (let i = 1; i < highway.platforms.length; i++) {
        const prev = highway.platforms[i - 1];
        const curr = highway.platforms[i];
        expect(curr.x - prev.x).toBe(220);
        expect(curr.y - prev.y).toBe(50);
        // Each step must be kinematically reachable from the previous
        expect(isReachable(prev, curr)).toBe(true);
      }

      // Contains speed power-up particle
      const speedPart = highway.particles.find((p) => p.type === 'speed');
      expect(speedPart).toBeDefined();

      expect(highway.exit.x).toBeGreaterThan(highway.entry.x);
    });

    it('generates Archetype 3: Le Gouffre à Électrons (Mid-Air Power Catch)', () => {
      const chasm = createElectronChasmChunk({
        chasmWidth: 600,
        powerType: 'lowGravity'
      });

      expect(chasm.archetype).toBe('electron_chasm');
      expect(chasm.platforms.length).toBe(2);

      const [startLedge, landingLedge] = chasm.platforms;
      const horizontalGap = landingLedge.x - (startLedge.x + startLedge.width);
      expect(horizontalGap).toBe(600);

      // Mid-air particle suspended in the apex jump arc
      expect(chasm.particles.length).toBe(1);
      const part = chasm.particles[0];
      expect(part.type).toBe('lowGravity');
      expect(part.x).toBeGreaterThan(startLedge.x + startLedge.width);
      expect(part.x).toBeLessThan(landingLedge.x);

      // Hazard spikes below
      expect(chasm.spikes.length).toBeGreaterThan(0);
      expect(chasm.spikes[0].y).toBeGreaterThan(startLedge.y);
    });

    it('generates Archetype 4: La Chambre de Superposition (Phase Shift Labyrinth)', () => {
      const phaseChamber = createSuperpositionChamberChunk({
        steps: 4,
        stepSpacing: 180,
        initialPhase: 'cyan'
      });

      expect(phaseChamber.archetype).toBe('superposition_chamber');
      expect(phaseChamber.platforms.length).toBe(4);

      // Strict alternating cyan/magenta phase layout
      expect(phaseChamber.platforms[0].phase).toBe('cyan');
      expect(phaseChamber.platforms[1].phase).toBe('magenta');
      expect(phaseChamber.platforms[2].phase).toBe('cyan');
      expect(phaseChamber.platforms[3].phase).toBe('magenta');

      // Spikes pit underneath
      expect(phaseChamber.spikes.length).toBeGreaterThan(0);
      expect(phaseChamber.spikes[0].y).toBeGreaterThan(phaseChamber.platforms[0].y);
    });

    it('generates Archetype 5: La Zone de Demi-Vie (Decay Platforms)', () => {
      const decayZone = createDecayZoneChunk({
        steps: 4,
        decayMs: 750,
        stepSpacing: 170
      });

      expect(decayZone.archetype).toBe('decay_zone');
      const decayingPlats = decayZone.platforms.filter(
        (p) => p.decayMs !== undefined && p.decayMs > 0
      );
      expect(decayingPlats.length).toBe(4);

      // All decay platforms have decayMs within 600-900 ms
      for (const p of decayingPlats) {
        expect(p.decayMs).toBeGreaterThanOrEqual(600);
        expect(p.decayMs).toBeLessThanOrEqual(900);
      }

      // Safe stable landing platform at exit
      const lastPlat = decayZone.platforms[decayZone.platforms.length - 1];
      expect(lastPlat.decayMs).toBeUndefined();

      // Hazard spikes underneath
      expect(decayZone.spikes.length).toBeGreaterThan(0);
    });

    it('generates Awakening (Spawn) and Resolution chunks', () => {
      const spawn = createSpawnChunk({ width: 300 });
      expect(spawn.archetype).toBe('spawn');
      expect(spawn.platforms[0].width).toBe(300);

      const resolution = createResolutionChunk({ width: 280 });
      expect(resolution.archetype).toBe('resolution');
      expect(resolution.platforms[0].width).toBe(280);
    });
  });

  describe('2. Geometry, Translation & Overlap Verification', () => {
    it('accurately computes bounding boxes and translates chunks', () => {
      const chunk = createSpawnChunk({ originX: 100, originY: 200, width: 200 });
      const bounds = computeChunkBounds(chunk.platforms);
      expect(bounds.minX).toBe(100);
      expect(bounds.maxX).toBe(300);
      expect(bounds.minY).toBe(200);

      const translated = translateChunk(chunk, 50, -30);
      expect(translated.entry.x).toBe(chunk.entry.x + 50);
      expect(translated.entry.y).toBe(chunk.entry.y - 30);
      expect(translated.platforms[0].x).toBe(150);
      expect(translated.platforms[0].y).toBe(170);
      expect(translated.bounds.minX).toBe(150);
      expect(translated.bounds.maxX).toBe(350);
    });

    it('detects bounding-box overlaps correctly with safety padding', () => {
      const chunkA = createSpawnChunk({ originX: 0, originY: 0, width: 200 });
      const chunkB = createSpawnChunk({ originX: 250, originY: 0, width: 200 });
      const chunkOverlap = createSpawnChunk({ originX: 100, originY: 0, width: 200 });

      expect(checkChunksOverlap(chunkA, chunkB, 10)).toBe(false);
      expect(checkChunksOverlap(chunkA, chunkOverlap, 10)).toBe(true);
    });
  });

  describe('3. Pacing Assembler & 4-Phase Curve', () => {
    it('assembles a full level following the 4-phase pacing curve', () => {
      const assembly = assemblePacedLevel({
        atom: 14,
        seed: 42,
        difficulty: 'medium',
        accelerationArchetype: 'speedrun_highway',
        climaxArchetype: 'superposition_chamber'
      });

      // 4 distinct phases
      expect(assembly.pacingPhases.awakening.archetype).toBe('spawn');
      expect(assembly.pacingPhases.acceleration.archetype).toBe('speedrun_highway');
      expect(assembly.pacingPhases.climax.archetype).toBe('superposition_chamber');
      expect(assembly.pacingPhases.resolution.archetype).toBe('resolution');

      expect(assembly.chunks.length).toBe(4);

      // Verify no aberrant collision overlaps between sequential chunks
      for (let i = 1; i < assembly.chunks.length; i++) {
        const prev = assembly.chunks[i - 1];
        const curr = assembly.chunks[i];
        expect(checkChunksOverlap(prev, curr, 5)).toBe(false);
      }

      // Verify kinematic reachability between chunk transitions
      const p1Exit =
        assembly.pacingPhases.awakening.pathPlatforms[
          assembly.pacingPhases.awakening.pathPlatforms.length - 1
        ];
      const p2Entry = assembly.pacingPhases.acceleration.pathPlatforms[0];
      expect(isReachable(p1Exit, p2Entry)).toBe(true);

      const p2Exit =
        assembly.pacingPhases.acceleration.pathPlatforms[
          assembly.pacingPhases.acceleration.pathPlatforms.length - 1
        ];
      const p3Entry = assembly.pacingPhases.climax.pathPlatforms[0];
      expect(isReachable(p2Exit, p3Entry)).toBe(true);

      const p3Exit =
        assembly.pacingPhases.climax.pathPlatforms[
          assembly.pacingPhases.climax.pathPlatforms.length - 1
        ];
      const p4Entry = assembly.pacingPhases.resolution.pathPlatforms[0];
      expect(isReachable(p3Exit, p4Entry)).toBe(true);

      // Compliant LevelData
      expect(assembly.levelData.player.position.x).toBeGreaterThan(0);
      expect(assembly.levelData.door.x).toBeGreaterThan(assembly.levelData.player.position.x);
      expect(assembly.levelData.platforms.length).toBeGreaterThan(8);
      expect(assembly.levelData.spikes.length).toBeGreaterThan(0);
      expect(assembly.levelData.meta?.generatorVersion).toBe('2.0.0');
    });

    it('assembles properly with electron_chasm and decay_zone archetypes', () => {
      const assembly = assemblePacedLevel({
        atom: 8,
        seed: 123,
        accelerationArchetype: 'electron_chasm',
        climaxArchetype: 'decay_zone'
      });

      expect(assembly.pacingPhases.acceleration.archetype).toBe('electron_chasm');
      expect(assembly.pacingPhases.climax.archetype).toBe('decay_zone');
      expect(assembly.fullPlatformPath.length).toBeGreaterThan(5);
    });

    it('integrates seamlessly with generateQuantumLevel(mode: "paced")', () => {
      const result = generateQuantumLevel({
        atom: 6,
        seed: 777,
        mode: 'paced'
      });

      expect(result.levelData.symbol).toBe('C');
      expect(result.levelData.atom).toBe('Carbon');
      expect(result.levelData.authorGhost).toBeDefined();
      expect(result.levelData.platforms.length).toBeGreaterThan(5);
    });
  });

  describe('4. Deterministic Simulator Integration with Spec-04 Mechanics', () => {
    it('simulates wall bounce recoil off internal kind: "wall" platforms', () => {
      const hero = createInitialHeroState(100, 300);
      hero.touchingGround = false;
      hero.vx = PHYSICS.HERO_SPEED_X;

      const world = {
        width: 1000,
        height: 1000,
        platforms: [{ x: 120, y: 250, width: 24, height: 100, kind: 'wall' as const }]
      };

      // Moving right towards the neon wall at x = 120
      const next = stepSimulation(hero, { left: false, right: true, jump: false }, world);
      expect(next.recoilTimer).toBe(PHYSICS.WALL_RECOIL_TIMER_MS);
      expect(next.recoilVx).toBe(-PHYSICS.WALL_RECOIL_VX);
    });

    it('simulates airborne collection of lowGravity particle and reduces gravity', () => {
      const hero = createInitialHeroState(100, 300);
      hero.touchingGround = false;

      const world = {
        width: 1000,
        height: 1000,
        platforms: [],
        particles: [{ x: 100, y: 300, type: 'lowGravity' as const }]
      };

      const next = stepSimulation(hero, { left: false, right: false, jump: false }, world);
      expect(next.gravityMultiplier).toBe(0.5);
      expect(next.collectedParticleIndices?.length).toBe(1);
    });

    it('simulates phase shifting on jump and enforces phase solidity', () => {
      const hero = createInitialHeroState(100, 200);
      hero.touchingGround = true;
      expect(hero.currentPhase).toBe('cyan');

      const world = {
        width: 1000,
        height: 1000,
        platforms: [
          { x: 50, y: 232, width: 100, height: 20, phase: 'cyan' as const },
          { x: 200, y: 232, width: 100, height: 20, phase: 'magenta' as const }
        ]
      };

      // Jump toggles phase from cyan to magenta
      const jumped = stepSimulation(hero, { left: false, right: true, jump: true }, world);
      expect(jumped.currentPhase).toBe('magenta');
      expect(jumped.touchingGround).toBe(false);
    });

    it('simulates safe traversal across Speedrun Highway platforms', () => {
      const highway = createSpeedrunHighwayChunk({
        steps: 3,
        horizontalSpacing: 210,
        verticalDrop: 45,
        platformWidth: 200
      });

      const world = {
        width: 1500,
        height: 1000,
        platforms: highway.platforms,
        particles: highway.particles
      };

      const startState = createInitialHeroState(
        highway.platforms[0].x + 50,
        highway.platforms[0].y - PHYSICS.HERO_HEIGHT / 2
      );

      const transResult = simulatePlatformTransition(
        startState,
        highway.platforms[0],
        highway.platforms[1],
        world
      );

      expect(transResult.success).toBe(true);
      expect(transResult.finalState.touchingGround).toBe(true);
    });

    it('simulates decay platform collapse when staying longer than decayMs', () => {
      const plat: import('../src/types').Platform = {
        x: 100,
        y: 300,
        width: 200,
        height: 20,
        decayMs: 300 // 300 ms half-life
      };

      const world = {
        width: 1000,
        height: 1000,
        platforms: [plat]
      };

      let hero = createInitialHeroState(150, 300 - PHYSICS.HERO_HEIGHT / 2);
      expect(hero.touchingGround).toBe(true);

      // Advance simulation frame by frame for 400 ms without jumping (exceeding decayMs of 300ms)
      const frames = Math.ceil(400 / PHYSICS.DELTA_FIXED_MS);
      for (let f = 0; f < frames; f++) {
        hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
      }

      // Hero should fall through the collapsed platform
      expect(hero.touchingGround).toBe(false);
      expect(hero.y).toBeGreaterThan(268);
      expect(hero.vy).toBeGreaterThan(0);
    });

    it('successfully assembles and simulates across 20 distinct seeds with various archetypes', () => {
      for (let s = 1; s <= 20; s++) {
        const atom = (s % 36) + 1;
        const diff = s % 3 === 0 ? 'easy' : s % 3 === 1 ? 'medium' : 'hard';
        const assembly = assemblePacedLevel({
          atom,
          seed: s * 101,
          difficulty: diff
        });

        expect(assembly.levelData.platforms.length).toBeGreaterThan(6);
        expect(assembly.chunks.length).toBe(4);
        expect(assembly.levelData.door).toBeDefined();
        expect(assembly.levelData.player.position).toBeDefined();
        expect(assembly.simulation.authorGhost).toBeTruthy();
        expect(assembly.simulation.authorTime).toBeGreaterThan(0);
      }
    });
  });
});
