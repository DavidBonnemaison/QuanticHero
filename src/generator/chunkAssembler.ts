import { getCampaignExplanations, getNarrativeForLevel } from '../data/cosmicNarrative';
import { getElementSpectroscopy } from '../data/spectroscopy';
import { PHYSICS } from '../physics/constants';
import type {
  CollapseConfig,
  Door,
  Gate,
  LevelData,
  Particle,
  Platform,
  PressurePlate,
  Spike
} from '../types';
import {
  type Chunk,
  type ChunkArchetype,
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
} from './chunks';
import { SeededRandom, getAlphaForDifficulty } from './dagGenerator';
import { isReachable, x_reach } from './kinematics';
import { type SimulationResult, simulateFullLevel } from './simulator';

export interface PacedAssemblerOptions {
  atom?: number;
  seed?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  width?: number;
  height?: number;
  accelerationArchetype?: 'speedrun_highway' | 'electron_chasm';
  climaxArchetype?: 'gravity_well' | 'superposition_chamber' | 'decay_zone';
}

export interface PacedLevelAssembly {
  levelData: LevelData;
  chunks: Chunk[];
  pacingPhases: {
    awakening: Chunk; // 15% - Spawn & ramp-up
    acceleration: Chunk; // 35% - Speedrun Highway or Electron Chasm
    climax: Chunk; // 35% - Gravity Well, Superposition, or Decay Zone
    resolution: Chunk; // 15% - Secure finish & portal
  };
  fullPlatformPath: Platform[];
  simulation: SimulationResult;
}

/**
 * Positions and connects `nextChunk` right after `prevChunk` ensuring kinematic reachability
 * and absence of bounding-box collision overlaps.
 */
function connectAndTranslateChunk(
  prevChunk: Chunk,
  rawNextChunk: Chunk,
  alpha: number,
  deltaY = -20
): Chunk {
  const lastPlat = prevChunk.pathPlatforms[prevChunk.pathPlatforms.length - 1];
  const firstPlat = rawNextChunk.pathPlatforms[0];

  // Calculate safe horizontal gap respecting kinematic reach
  const maxReach = x_reach(deltaY, alpha);
  const safeGap = Math.max(35, Math.min(110, Math.round(maxReach * 0.65)));

  const targetX = Math.round(lastPlat.x + lastPlat.width + safeGap);
  const targetY = Math.round(lastPlat.y + deltaY);

  const dx = targetX - firstPlat.x;
  const dy = targetY - firstPlat.y;

  let translated = translateChunk(rawNextChunk, dx, dy);

  // If bounding box overlap occurs, nudge rightwards while preserving kinematic reach
  let nudgeCount = 0;
  while (checkChunksOverlap(prevChunk, translated, 15) && nudgeCount < 5) {
    nudgeCount++;
    const testDeltaY = deltaY + nudgeCount * 10;
    const testReach = x_reach(testDeltaY, alpha);
    const nudgeX = Math.min(testReach * 0.8, safeGap + nudgeCount * 15);
    const nudgedTargetX = Math.round(lastPlat.x + lastPlat.width + nudgeX);
    translated = translateChunk(rawNextChunk, nudgedTargetX - firstPlat.x, targetY - firstPlat.y);
  }

  return translated;
}

/**
 * Assembles a fully paced level following the 4-phase pacing curve:
 * 1. Éveil (15%): Safe spawn platform, onboarding
 * 2. Accélération (35%): Speedrun Highway or Electron Chasm
 * 3. Climax / Tension (35%): Gravity Well, Superposition Chamber, or Decay Zone
 * 4. Résolution (15%): Safe arrival platform and exit portal
 */
export function assemblePacedLevel(options: PacedAssemblerOptions = {}): PacedLevelAssembly {
  const atom = options.atom ?? 14;
  const seed = options.seed ?? 42;
  const difficulty = options.difficulty ?? (atom <= 4 ? 'easy' : atom <= 8 ? 'medium' : 'hard');
  const width = options.width ?? 2600;
  const height = options.height ?? 1900;

  const alpha = getAlphaForDifficulty(atom, difficulty);
  const rng = new SeededRandom(seed);

  const elementInfo = getElementSpectroscopy(atom);

  // 1. Phase 1: Éveil (15%)
  const spawnX = 140;
  const spawnY = height - 220;
  const awakeningChunk = createSpawnChunk({
    originX: spawnX,
    originY: spawnY,
    width: 280
  });

  // 2. Phase 2: Accélération (35%)
  const accelerationType =
    options.accelerationArchetype ?? (rng.next() > 0.5 ? 'speedrun_highway' : 'electron_chasm');

  let rawAccelerationChunk: Chunk;
  if (accelerationType === 'speedrun_highway') {
    rawAccelerationChunk = createSpeedrunHighwayChunk({
      steps: 4,
      horizontalSpacing: 210,
      verticalDrop: 46,
      platformWidth: 190
    });
  } else {
    rawAccelerationChunk = createElectronChasmChunk({
      chasmWidth: 540,
      powerType: 'lowGravity',
      startWidth: 170,
      landingWidth: 190,
      verticalDrop: 25
    });
  }

  const accelerationChunk = connectAndTranslateChunk(
    awakeningChunk,
    rawAccelerationChunk,
    alpha,
    -15
  );

  // 3. Phase 3: Climax / Tension (35%)
  let climaxType = options.climaxArchetype;
  if (!climaxType) {
    const choice = Math.floor(rng.next() * 3);
    climaxType =
      choice === 0 ? 'gravity_well' : choice === 1 ? 'superposition_chamber' : 'decay_zone';
  }

  let rawClimaxChunk: Chunk;
  let climaxDeltaY = -20;
  if (climaxType === 'gravity_well') {
    rawClimaxChunk = createGravityWellChunk({
      wellWidth: 360,
      height: 380,
      steps: 3
    });
    climaxDeltaY = 10;
  } else if (climaxType === 'superposition_chamber') {
    rawClimaxChunk = createSuperpositionChamberChunk({
      steps: 4,
      stepSpacing: 180,
      platformWidth: 160,
      verticalStep: -25,
      initialPhase: 'magenta'
    });
    climaxDeltaY = -20;
  } else {
    rawClimaxChunk = createDecayZoneChunk({
      steps: 4,
      decayMs: 750,
      stepSpacing: 170,
      platformWidth: 150,
      verticalDelta: -20
    });
    climaxDeltaY = -20;
  }

  const climaxChunk = connectAndTranslateChunk(
    accelerationChunk,
    rawClimaxChunk,
    alpha,
    climaxDeltaY
  );

  // 4. Phase 4: Résolution (15%)
  const rawResolutionChunk = createResolutionChunk({
    width: 260
  });

  const resolutionChunk = connectAndTranslateChunk(climaxChunk, rawResolutionChunk, alpha, -15);

  // Aggregate all chunks
  const chunks: Chunk[] = [awakeningChunk, accelerationChunk, climaxChunk, resolutionChunk];

  // Consolidate platforms, spikes, particles
  const allPlatforms: Platform[] = [];
  const allSpikes: Spike[] = [
    // Pit hazard spikes at bottom
    { x: 0, y: height - 15, width, height: 15 }
  ];
  const allParticles: Particle[] = [];
  const fullPlatformPath: Platform[] = [];

  for (const c of chunks) {
    allPlatforms.push(...c.platforms);
    allSpikes.push(...c.spikes);
    allParticles.push(...c.particles);
    fullPlatformPath.push(...c.pathPlatforms);
  }

  const player = {
    position: {
      x: Math.round(awakeningChunk.entry.x),
      y: Math.round(awakeningChunk.entry.y - PHYSICS.HERO_HEIGHT / 2)
    }
  };

  const door: Door = {
    x: Math.round(resolutionChunk.exit.x),
    y: Math.round(resolutionChunk.exit.y)
  };

  // Deterministic physics simulation verification
  const world = {
    width,
    height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms: allPlatforms,
    spikes: allSpikes,
    particles: allParticles,
    bounceWalls: true
  };

  const simulation = simulateFullLevel(world, player.position, door, fullPlatformPath);

  const levelData: LevelData = {
    id: String(atom),
    symbol: elementInfo.symbol,
    atom: elementInfo.name,
    uncertainty: atom,
    width,
    height,
    hue: elementInfo.hue,
    antiHue: elementInfo.antiHue,
    explanations: getNarrativeForLevel(atom),
    player,
    spikes: allSpikes,
    particles: allParticles,
    platforms: allPlatforms,
    door,
    authorGhost: simulation.authorGhost,
    authorTime: simulation.authorTime,
    meta: {
      seed,
      generatorVersion: '2.0.0',
      path: simulation.path
    }
  };

  return {
    levelData,
    chunks,
    pacingPhases: {
      awakening: awakeningChunk,
      acceleration: accelerationChunk,
      climax: climaxChunk,
      resolution: resolutionChunk
    },
    fullPlatformPath,
    simulation
  };
}

/**
 * Assembles a campaign level (Levels 1 to 10) with its designated hallmark mechanic:
 * - Niv 1 (H) : Éveil & Tuto (sauts confortables, texte "Oops..." conservé)
 * - Niv 2 (He) : Autoroute speedrun fluide
 * - Niv 3 (Li) : Gouffre à électrons & lowGravity
 * - Niv 4 (Be) : Clonage quantique (duplicate, uncertainty: 4)
 * - Niv 5 (B) : Puits gravitationnel vertical avec murs néon rebondissants (kind: 'wall')
 * - Niv 6 (C) : Inversion de gravité (antiGravity)
 * - Niv 7 (N) : Effet Tunnel (tunnel, barrière de potentiel)
 * - Niv 8 (O) : Chambre de Superposition de Phase (alternance cyan/magenta)
 * - Niv 9 (F) : Répulsion de Pauli (pauli) + Plateformes de demi-vie (decayMs)
 * - Niv 10 (Ne) : Dilatation temporelle (timeDilation) + plateformes mobiles + Mini-boss effondrement (collapse)
 */
export function assembleCampaignLevel(level: number, seed = 42): PacedLevelAssembly {
  const elementInfo = getElementSpectroscopy(level);
  const narrative = getCampaignExplanations(level);

  let width = 2200;
  let height = 1100;
  const alpha = 0.75;

  let awakeningChunk: Chunk;
  let accelerationChunk: Chunk;
  let climaxChunk: Chunk;
  let resolutionChunk: Chunk;
  let collapseConfig: CollapseConfig | undefined;
  let gates: Gate[] | undefined;
  let pressurePlates: PressurePlate[] | undefined;

  switch (level) {
    case 1: {
      // Niv 1 (H) : Éveil & Tuto (sauts confortables, texte "Oops..." conservé).
      width = 1800;
      height = 1000;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 280 });

      const p1: Platform = { x: 480, y: 700, width: 210, height: 20 };
      const p2: Platform = { x: 760, y: 680, width: 210, height: 20 };
      const p3: Platform = { x: 1040, y: 660, width: 210, height: 20 };
      const accelPlatforms = [p1, p2, p3];

      accelerationChunk = {
        id: 'chunk_tuto_stepping',
        name: 'Tutoriel Quantique',
        archetype: 'speedrun_highway',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p3.x + p3.width - 40, y: p3.y },
        platforms: accelPlatforms,
        pathPlatforms: accelPlatforms,
        spikes: [],
        particles: [],
        bounds: computeChunkBounds(accelPlatforms)
      };

      const p4: Platform = { x: 1310, y: 640, width: 210, height: 20 };
      climaxChunk = {
        id: 'chunk_tuto_climax',
        name: "L'Éveil",
        archetype: 'speedrun_highway',
        entry: { x: p4.x + 40, y: p4.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: [p4],
        pathPlatforms: [p4],
        spikes: [],
        particles: [],
        bounds: computeChunkBounds([p4])
      };

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 2: {
      // Niv 2 (He) : Autoroute speedrun fluide (gouffre de 510 px impossible sans le boost speed)
      width = 2500;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 600, width: 260 });

      const p1: Platform = { x: 460, y: 600, width: 220, height: 20 };
      const speedPart: Particle = { x: p1.x + 110, y: p1.y - 30, type: 'speed' };
      // 580 px chasm: edge-to-edge standard reach = 510 px max, speed-boosted reach = 690 px
      const p2: Platform = { x: p1.x + p1.width + 580, y: 600, width: 240, height: 20 };
      const accelPlats = [p1, p2];

      accelerationChunk = {
        id: 'chunk_speedrun_chasm',
        name: 'Autoroute Quantique',
        archetype: 'speedrun_highway',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p2.x + p2.width - 40, y: p2.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [speedPart],
        bounds: computeChunkBounds(accelPlats, [], [speedPart])
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_speedrun_climax',
        steps: 3,
        horizontalSpacing: 220,
        verticalDrop: 32,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -10);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 3: {
      // Niv 3 (Li) : Approche puis gouffre à électrons & lowGravity
      width = 2800;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 680, width: 240 });

      const intro1: Platform = { x: 430, y: 660, width: 170, height: 20 };
      const intro2: Platform = { x: 670, y: 640, width: 170, height: 20 };
      const rawChasm = createElectronChasmChunk({
        chasmWidth: 480,
        powerType: 'lowGravity',
        startWidth: 180,
        landingWidth: 200,
        verticalDrop: 20
      });
      const introChunk: Chunk = {
        id: 'chunk_li_intro',
        name: 'Approche',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: intro2.x + intro2.width - 40, y: intro2.y },
        platforms: [intro1, intro2],
        pathPlatforms: [intro1, intro2],
        spikes: [],
        particles: [],
        bounds: computeChunkBounds([intro1, intro2])
      };
      const chasmTranslated = connectAndTranslateChunk(introChunk, rawChasm, alpha, -15);
      accelerationChunk = {
        id: 'chunk_li_accel',
        name: 'Gouffre à Électrons',
        archetype: 'electron_chasm',
        entry: introChunk.entry,
        exit: chasmTranslated.exit,
        platforms: [...introChunk.platforms, ...chasmTranslated.platforms],
        pathPlatforms: [...introChunk.pathPlatforms, ...chasmTranslated.pathPlatforms],
        spikes: [...introChunk.spikes, ...chasmTranslated.spikes],
        particles: [...introChunk.particles, ...chasmTranslated.particles],
        bounds: computeChunkBounds(
          [...introChunk.platforms, ...chasmTranslated.platforms],
          [...introChunk.spikes, ...chasmTranslated.spikes],
          [...introChunk.particles, ...chasmTranslated.particles]
        )
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_chasm_climax',
        steps: 3,
        horizontalSpacing: 190,
        verticalDrop: 22,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -10);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 4: {
      // Niv 4 (Be) : Parcours d'approche puis clonage quantique (duplicate, uncertainty: 4) & dalle requireLock + porte
      width = 2700;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 700, width: 240 });

      const intro1: Platform = { x: 430, y: 680, width: 170, height: 20 };
      const intro2: Platform = { x: 670, y: 660, width: 170, height: 20 };
      const p1: Platform = { x: 910, y: 640, width: 190, height: 20 };
      const p2: Platform = { x: 1160, y: 620, width: 190, height: 20 };
      const p3: Platform = { x: 1410, y: 600, width: 210, height: 20 };
      const dupPart: Particle = { x: p2.x + 95, y: p2.y - 30, type: 'duplicate' };
      const accelPlats = [intro1, intro2, p1, p2, p3];

      accelerationChunk = {
        id: 'chunk_cloning_accel',
        name: 'Clonage Quantique',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: p3.x + p3.width - 40, y: p3.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [dupPart],
        bounds: computeChunkBounds(accelPlats, [], [dupPart])
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_cloning_climax',
        steps: 3,
        horizontalSpacing: 190,
        verticalDrop: 22,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -10);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);

      const resPlat = resolutionChunk.platforms[0];
      const gate: Gate = {
        id: 'gate_be_4',
        x: Math.round(resPlat.x + 60),
        y: 0,
        width: 24,
        height: Math.round(resPlat.y)
      };
      const plate: PressurePlate = {
        id: 'plate_be_4',
        x: p3.x + 60,
        y: p3.y - 12,
        width: 90,
        height: 12,
        targetGateId: 'gate_be_4',
        requireLock: true
      };
      gates = [gate];
      pressurePlates = [plate];
      break;
    }

    case 5: {
      // Niv 5 (B) : Puits gravitationnel vertical avec murs néon rebondissants (kind: 'wall')
      width = 2200;
      height = 1300;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 880, width: 240 });

      const rawLeadIn = createSpeedrunHighwayChunk({
        steps: 2,
        horizontalSpacing: 180,
        verticalDrop: 25,
        platformWidth: 180,
        speedBoostParticle: false
      });
      accelerationChunk = connectAndTranslateChunk(awakeningChunk, rawLeadIn, alpha, -10);

      const rawWell = createGravityWellChunk({
        wellWidth: 320,
        height: 600,
        steps: 2
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawWell, alpha, 20);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 6: {
      // Niv 6 (C) : Parcours d'approche puis inversion de gravité (antiGravity)
      width = 2900;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });

      const intro1: Platform = { x: 430, y: 700, width: 170, height: 20 };
      const intro2: Platform = { x: 670, y: 680, width: 170, height: 20 };
      const p1: Platform = { x: 910, y: 660, width: 200, height: 20 };
      const antiGravPart: Particle = { x: 1090, y: 540, type: 'antiGravity' };

      // Inverted ceiling traversal (hero stands upside-down against bottom of platform)
      const p2: Platform = { x: 1210, y: 240, width: 240, height: 20 };
      const p3: Platform = { x: 1530, y: 240, width: 240, height: 20 };
      const p3b: Platform = { x: 1850, y: 240, width: 220, height: 20 };
      const restorePart: Particle = { x: 2110, y: 350, type: 'antiGravity' };

      const p4: Platform = { x: 2150, y: 640, width: 240, height: 20 };
      const invPlats = [intro1, intro2, p1, p2, p3, p3b, p4];
      const invParts = [antiGravPart, restorePart];

      accelerationChunk = {
        id: 'chunk_antigravity',
        name: 'Inversion de Gravité',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: invPlats,
        pathPlatforms: invPlats,
        spikes: [],
        particles: invParts,
        bounds: computeChunkBounds(invPlats, [], invParts)
      };
      climaxChunk = accelerationChunk;

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(accelerationChunk, rawRes, alpha, -15);
      break;
    }

    case 7: {
      // Niv 7 (N) : Parcours d'approche puis Effet Tunnel (barrière de potentiel étanche sol-plafond)
      width = 2800;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });

      const intro1: Platform = { x: 430, y: 700, width: 170, height: 20 };
      const intro2: Platform = { x: 670, y: 680, width: 170, height: 20 };
      const p1: Platform = { x: 910, y: 680, width: 200, height: 20 };
      const tunnelPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'tunnel' };

      // Barrière continue du sol au plafond (épaisseur 30 px <= 80 px) infranchissable par saut
      const barrier: Platform = { x: 1165, y: 0, width: 30, height: 1100 };

      const p2: Platform = { x: 1210, y: 680, width: 220, height: 20 };
      const p3: Platform = { x: 1490, y: 660, width: 220, height: 20 };
      const p4: Platform = { x: 1770, y: 640, width: 220, height: 20 };
      const tunnelPlatforms = [intro1, intro2, p1, barrier, p2, p3, p4];

      accelerationChunk = {
        id: 'chunk_tunnel_barrier',
        name: 'Effet Tunnel',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: tunnelPlatforms,
        pathPlatforms: [intro1, intro2, p1, p2, p3, p4],
        spikes: [],
        particles: [tunnelPart],
        bounds: computeChunkBounds(tunnelPlatforms, [], [tunnelPart])
      };
      climaxChunk = accelerationChunk;

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(accelerationChunk, rawRes, alpha, -15);
      break;
    }

    case 8: {
      // Niv 8 (O) : Chambre de Superposition de Phase (alternance cyan/magenta)
      width = 2400;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 700, width: 240 });

      const rawLead = createSpeedrunHighwayChunk({
        steps: 2,
        horizontalSpacing: 180,
        verticalDrop: 25,
        platformWidth: 180,
        speedBoostParticle: false
      });
      accelerationChunk = connectAndTranslateChunk(awakeningChunk, rawLead, alpha, -15);

      const rawSuperpos = createSuperpositionChamberChunk({
        steps: 4,
        stepSpacing: 180,
        platformWidth: 160,
        verticalStep: -25,
        initialPhase: 'cyan'
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawSuperpos, alpha, -20);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 9: {
      // Niv 9 (F) : Parcours d'approche puis Répulsion de Pauli (pauli) au-dessus d'un gouffre de 680 px
      width = 3300;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });

      const intro1: Platform = { x: 430, y: 700, width: 170, height: 20 };
      const intro2: Platform = { x: 670, y: 680, width: 170, height: 20 };

      // Plateforme avec duplication & particule de Pauli après l'approche
      const p1: Platform = { x: 910, y: 680, width: 280, height: 20 };
      const dupPart: Particle = { x: p1.x + 80, y: p1.y - 30, type: 'duplicate' };
      const pauliPart: Particle = { x: p1.x + 180, y: p1.y - 30, type: 'pauli' };

      // Gouffre de 680 px sans plateforme intermédiaire (infranchissable sans la propulsion de Pauli)
      const p2: Platform = { x: 1870, y: 680, width: 260, height: 20 };
      const chasmPlats = [intro1, intro2, p1, p2];
      const chasmParts = [dupPart, pauliPart];

      accelerationChunk = {
        id: 'chunk_pauli_chasm',
        name: 'Gouffre de Pauli',
        archetype: 'electron_chasm',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: p2.x + p2.width - 40, y: p2.y },
        platforms: chasmPlats,
        pathPlatforms: [intro1, intro2, p1, p2],
        spikes: [{ x: 1190, y: height - 20, width: 680, height: 20 }],
        particles: chasmParts,
        bounds: computeChunkBounds(chasmPlats, [], chasmParts)
      };

      const rawDecay = createDecayZoneChunk({
        steps: 3,
        decayMs: 750,
        stepSpacing: 170,
        platformWidth: 150,
        verticalDelta: -20,
        includeStableExit: true
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawDecay, alpha, -15);

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 10: {
      // Niv 10 (Ne) : Dilatation temporelle (timeDilation) + plateformes mobiles + Mini-boss effondrement (collapse)
      width = 2400;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 700, width: 240 });

      const mp1: Platform = {
        x: 450,
        y: 680,
        width: 180,
        height: 20,
        movesTo: { x: 530 }
      };
      const mp2: Platform = {
        x: 740,
        y: 660,
        width: 180,
        height: 20,
        movesTo: { y: 630 }
      };
      const movingPlats = [mp1, mp2];

      accelerationChunk = {
        id: 'chunk_moving_platforms',
        name: 'Plateformes Temporelles',
        archetype: 'speedrun_highway',
        entry: { x: mp1.x + 40, y: mp1.y },
        exit: { x: mp2.x + mp2.width - 40, y: mp2.y },
        platforms: movingPlats,
        pathPlatforms: movingPlats,
        spikes: [],
        particles: [],
        bounds: computeChunkBounds(movingPlats)
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_collapse_highway',
        steps: 3,
        horizontalSpacing: 180,
        verticalDrop: 25,
        platformWidth: 170,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      // Place timeDilation mid-level on the first climax platform, after moving platforms & visible collapse
      const midPlat = climaxChunk.platforms[0];
      climaxChunk.particles.push({
        x: midPlat.x + Math.round(midPlat.width / 2),
        y: midPlat.y - 30,
        type: 'timeDilation'
      });

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);

      collapseConfig = {
        speedY: 42,
        delayMs: 1200
      };
      break;
    }

    default: {
      // Levels 11-109: Progressive Universe Campaign + Multi-Power-Up Bosses
      const rng = new SeededRandom(seed + level * 31);
      const progress = Math.min(1, Math.max(0, (level - 11) / 98));
      const levelAlpha = 0.74 + progress * 0.12;
      const decayMs = Math.round(850 - progress * 280);
      const speedChasm = Math.round(520 + progress * 70);
      const lowGChasm = Math.round(450 + progress * 40);

      height = 1250;
      const baseY = 820;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 230 });

      // Introductory 2-step approach before power-up so player earns it first
      const intro1: Platform = { x: 420, y: baseY - 25, width: 165, height: 20 };
      const intro2: Platform = { x: 655, y: baseY - 50, width: 165, height: 20 };
      const introChunk: Chunk = {
        id: `chunk_intro_${level}`,
        name: 'Approche',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: intro2.x + intro2.width - 40, y: intro2.y },
        platforms: [intro1, intro2],
        pathPlatforms: [intro1, intro2],
        spikes: [],
        particles: [],
        bounds: computeChunkBounds([intro1, intro2])
      };

      const isSpeedTunnelBoss = level === 20 || level === 84 || level === 109;
      const isPauliBoss = level === 40 || level === 68 || level === 100;
      const isAntiGravBoss = level === 26 || level === 62 || level === 88;
      const isCollapsePhaseBoss = level === 46;

      if (isSpeedTunnelBoss) {
        // Boss combining speed chasm + 30px tunnel barrier (+ timeDilation & collapse on 109)
        const p1: Platform = { x: 890, y: baseY - 60, width: 210, height: 20 };
        const speedPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'speed' };
        const p2: Platform = {
          x: p1.x + p1.width + speedChasm,
          y: baseY - 60,
          width: 220,
          height: 20
        };
        const tunnelPart: Particle = { x: p2.x + 100, y: p2.y - 30, type: 'tunnel' };
        const barrier: Platform = { x: p2.x + p2.width + 25, y: 0, width: 30, height: height };
        const p3: Platform = { x: barrier.x + 55, y: baseY - 60, width: 210, height: 20 };
        const bossPlats = [intro1, intro2, p1, p2, barrier, p3];
        const bossParts = [speedPart, tunnelPart];
        if (level === 84) {
          bossParts.push({ x: p3.x + 100, y: p3.y - 30, type: 'lowGravity' });
        }

        accelerationChunk = {
          id: `chunk_boss_st_${level}`,
          name: 'Creuset Vitesse-Tunnel',
          archetype: 'speedrun_highway',
          entry: introChunk.entry,
          exit: { x: p3.x + p3.width - 40, y: p3.y },
          platforms: bossPlats,
          pathPlatforms: [intro1, intro2, p1, p2, p3],
          spikes: [],
          particles: bossParts,
          bounds: computeChunkBounds(bossPlats, [], bossParts)
        };

        const rawClimax =
          level === 109
            ? createSpeedrunHighwayChunk({
                steps: 4,
                horizontalSpacing: 190,
                verticalDrop: 24,
                platformWidth: 165,
                speedBoostParticle: false
              })
            : createDecayZoneChunk({
                steps: 4,
                decayMs,
                stepSpacing: 175,
                platformWidth: 150,
                verticalDelta: -20,
                includeStableExit: true
              });
        climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, levelAlpha, -15);
        if (level === 109) {
          const midP = climaxChunk.platforms[0];
          climaxChunk.particles.push({
            x: midP.x + Math.round(midP.width / 2),
            y: midP.y - 30,
            type: 'timeDilation'
          });
          collapseConfig = { speedY: 14, delayMs: 2000 };
        }
      } else if (isPauliBoss) {
        // Boss combining duplicate + pauli 680px chasm + decay (+ tunnel barrier on 100)
        const p1: Platform = { x: 890, y: baseY - 60, width: 270, height: 20 };
        const dupPart: Particle = { x: p1.x + 80, y: p1.y - 30, type: 'duplicate' };
        const pauliPart: Particle = { x: p1.x + 180, y: p1.y - 30, type: 'pauli' };
        const p2: Platform = { x: p1.x + p1.width + 680, y: baseY - 60, width: 250, height: 20 };
        const bossPlats = [intro1, intro2, p1, p2];
        const bossParts = [dupPart, pauliPart];
        const pathPlats = [intro1, intro2, p1, p2];

        if (level === 100) {
          const tunPart: Particle = { x: p2.x + 120, y: p2.y - 30, type: 'tunnel' };
          const barrier: Platform = { x: p2.x + p2.width + 25, y: 0, width: 30, height: height };
          const p3: Platform = { x: barrier.x + 55, y: baseY - 60, width: 200, height: 20 };
          bossPlats.push(barrier, p3);
          pathPlats.push(p3);
          bossParts.push(tunPart);
        }

        const lastP = pathPlats[pathPlats.length - 1];
        accelerationChunk = {
          id: `chunk_boss_pauli_${level}`,
          name: 'Gouffre de Pauli',
          archetype: 'electron_chasm',
          entry: introChunk.entry,
          exit: { x: lastP.x + lastP.width - 40, y: lastP.y },
          platforms: bossPlats,
          pathPlatforms: pathPlats,
          spikes: [{ x: p1.x + p1.width, y: height - 20, width: 680, height: 20 }],
          particles: bossParts,
          bounds: computeChunkBounds(bossPlats, [], bossParts)
        };

        const rawDecay = createDecayZoneChunk({
          steps: 4,
          decayMs,
          stepSpacing: 175,
          platformWidth: 150,
          verticalDelta: -20,
          includeStableExit: true
        });
        climaxChunk = connectAndTranslateChunk(accelerationChunk, rawDecay, levelAlpha, -15);
      } else if (isAntiGravBoss) {
        // Boss combining antiGravity ceiling run + phase or decay/collapse
        const p1: Platform = { x: 890, y: baseY - 60, width: 200, height: 20 };
        const antiGravPart: Particle = { x: p1.x + 170, y: p1.y - 120, type: 'antiGravity' };
        const ceilingY = 260;
        const p2: Platform = { x: 1180, y: ceilingY, width: 240, height: 20 };
        const p3: Platform = { x: 1500, y: ceilingY, width: 240, height: 20 };
        const restorePart: Particle = { x: 1790, y: ceilingY + 110, type: 'antiGravity' };
        const p4: Platform = { x: 1830, y: baseY - 80, width: 230, height: 20 };
        const bossPlats = [intro1, intro2, p1, p2, p3, p4];
        const bossParts = [antiGravPart, restorePart];
        const pathPlats = [intro1, intro2, p1, p2, p3, p4];

        if (level === 88) {
          bossParts.push({ x: p4.x + 115, y: p4.y - 30, type: 'tunnel' });
          const barrier: Platform = { x: p4.x + p4.width + 25, y: 0, width: 30, height: height };
          const p5: Platform = { x: barrier.x + 55, y: baseY - 80, width: 210, height: 20 };
          bossPlats.push(barrier, p5);
          pathPlats.push(p5);
        }

        const lastAgP = pathPlats[pathPlats.length - 1];
        accelerationChunk = {
          id: `chunk_boss_ag_${level}`,
          name: 'Inversion Critique',
          archetype: 'speedrun_highway',
          entry: introChunk.entry,
          exit: { x: lastAgP.x + lastAgP.width - 40, y: lastAgP.y },
          platforms: bossPlats,
          pathPlatforms: pathPlats,
          spikes: [],
          particles: bossParts,
          bounds: computeChunkBounds(bossPlats, [], bossParts)
        };

        const rawClimax =
          level === 88
            ? createSuperpositionChamberChunk({
                steps: 4,
                stepSpacing: 185,
                platformWidth: 155,
                verticalStep: -20,
                initialPhase: 'cyan'
              })
            : createDecayZoneChunk({
                steps: 4,
                decayMs,
                stepSpacing: 175,
                platformWidth: 150,
                verticalDelta: -20,
                includeStableExit: true
              });
        climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, levelAlpha, -15);
      } else if (isCollapsePhaseBoss) {
        // Boss 46: speed chasm + superposition phase + collapse
        const p1: Platform = { x: 890, y: baseY - 60, width: 210, height: 20 };
        const speedPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'speed' };
        const p2: Platform = {
          x: p1.x + p1.width + speedChasm,
          y: baseY - 60,
          width: 220,
          height: 20
        };
        accelerationChunk = {
          id: 'chunk_boss_46',
          name: 'Cataclysme de Phase',
          archetype: 'speedrun_highway',
          entry: introChunk.entry,
          exit: { x: p2.x + p2.width - 40, y: p2.y },
          platforms: [intro1, intro2, p1, p2],
          pathPlatforms: [intro1, intro2, p1, p2],
          spikes: [],
          particles: [speedPart],
          bounds: computeChunkBounds([intro1, intro2, p1, p2], [], [speedPart])
        };

        const rawPhase = createSuperpositionChamberChunk({
          steps: 4,
          stepSpacing: 185,
          platformWidth: 155,
          verticalStep: -22,
          initialPhase: 'magenta'
        });
        climaxChunk = connectAndTranslateChunk(accelerationChunk, rawPhase, levelAlpha, -15);
        collapseConfig = { speedY: 14, delayMs: 2000 };
      } else {
        // Standard progressive levels 11-109 rotating across 6 archetypes
        const variant = (level + Math.floor(rng.next() * 2)) % 6;
        if (variant === 0) {
          // Speed chasm + Superposition
          const p1: Platform = { x: 890, y: baseY - 60, width: 200, height: 20 };
          const speedPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'speed' };
          const p2: Platform = {
            x: p1.x + p1.width + speedChasm,
            y: baseY - 60,
            width: 220,
            height: 20
          };
          accelerationChunk = {
            id: `chunk_spd_${level}`,
            name: 'Accélération',
            archetype: 'speedrun_highway',
            entry: introChunk.entry,
            exit: { x: p2.x + p2.width - 40, y: p2.y },
            platforms: [intro1, intro2, p1, p2],
            pathPlatforms: [intro1, intro2, p1, p2],
            spikes: [],
            particles: [speedPart],
            bounds: computeChunkBounds([intro1, intro2, p1, p2], [], [speedPart])
          };
          const rawPhase = createSuperpositionChamberChunk({
            steps: 4,
            stepSpacing: 185,
            platformWidth: 160,
            verticalStep: -22,
            initialPhase: level % 2 === 0 ? 'cyan' : 'magenta'
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawPhase, levelAlpha, -15);
        } else if (variant === 1) {
          // Moving platforms + Decay zone (with timeDilation on 55 and every 12 levels)
          const mp1: Platform = {
            x: 890,
            y: baseY - 60,
            width: 175,
            height: 20,
            movesTo: { x: 960 }
          };
          const mp2: Platform = {
            x: 1160,
            y: baseY - 80,
            width: 175,
            height: 20,
            movesTo: { y: baseY - 115 }
          };
          const accelPlats = [intro1, intro2, mp1, mp2];
          accelerationChunk = {
            id: `chunk_mov_${level}`,
            name: 'Dérive Temporelle',
            archetype: 'speedrun_highway',
            entry: introChunk.entry,
            exit: { x: mp2.x + mp2.width - 40, y: mp2.y },
            platforms: accelPlats,
            pathPlatforms: accelPlats,
            spikes: [],
            particles: [],
            bounds: computeChunkBounds(accelPlats)
          };
          const rawDecay = createDecayZoneChunk({
            steps: 4,
            decayMs,
            stepSpacing: 175,
            platformWidth: 150,
            verticalDelta: -20,
            includeStableExit: true
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawDecay, levelAlpha, -15);
          if (level === 55 || level % 12 === 0) {
            const firstClimax = climaxChunk.platforms[0];
            climaxChunk.particles.push({
              x: firstClimax.x + Math.round(firstClimax.width / 2),
              y: firstClimax.y - 30,
              type: 'timeDilation'
            });
          }
        } else if (variant === 2) {
          // LowGravity chasm + Speedrun highway
          const rawChasm = createElectronChasmChunk({
            chasmWidth: lowGChasm,
            powerType: 'lowGravity',
            startWidth: 180,
            landingWidth: 200,
            verticalDrop: 20
          });
          const chasmT = connectAndTranslateChunk(introChunk, rawChasm, levelAlpha, -15);
          accelerationChunk = {
            id: `chunk_lg_${level}`,
            name: 'Gouffre Léger',
            archetype: 'electron_chasm',
            entry: introChunk.entry,
            exit: chasmT.exit,
            platforms: [...introChunk.platforms, ...chasmT.platforms],
            pathPlatforms: [...introChunk.pathPlatforms, ...chasmT.pathPlatforms],
            spikes: [...introChunk.spikes, ...chasmT.spikes],
            particles: [...introChunk.particles, ...chasmT.particles],
            bounds: computeChunkBounds(
              [...introChunk.platforms, ...chasmT.platforms],
              [...introChunk.spikes, ...chasmT.spikes],
              [...introChunk.particles, ...chasmT.particles]
            )
          };
          const rawHigh = createSpeedrunHighwayChunk({
            steps: 4,
            horizontalSpacing: 195,
            verticalDrop: 26,
            platformWidth: 170,
            speedBoostParticle: false
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawHigh, levelAlpha, -15);
        } else if (variant === 3) {
          // Neon bounce gravity well + Superposition
          height = 1350;
          accelerationChunk = introChunk;
          const rawWell = createGravityWellChunk({
            wellWidth: 320,
            height: 540,
            steps: 2
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawWell, levelAlpha, 15);
        } else if (variant === 4) {
          // Tunnel barrier + Decay zone
          const p1: Platform = { x: 890, y: baseY - 60, width: 200, height: 20 };
          const tunPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'tunnel' };
          const barrier: Platform = { x: p1.x + p1.width + 25, y: 0, width: 30, height: height };
          const p2: Platform = { x: barrier.x + 55, y: baseY - 60, width: 210, height: 20 };
          const tunPlats = [intro1, intro2, p1, barrier, p2];
          accelerationChunk = {
            id: `chunk_tun_${level}`,
            name: 'Barrière Quantique',
            archetype: 'speedrun_highway',
            entry: introChunk.entry,
            exit: { x: p2.x + p2.width - 40, y: p2.y },
            platforms: tunPlats,
            pathPlatforms: [intro1, intro2, p1, p2],
            spikes: [],
            particles: [tunPart],
            bounds: computeChunkBounds(tunPlats, [], [tunPart])
          };
          const rawDecay = createDecayZoneChunk({
            steps: 4,
            decayMs,
            stepSpacing: 175,
            platformWidth: 150,
            verticalDelta: -20,
            includeStableExit: true
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawDecay, levelAlpha, -15);
        } else {
          // AntiGravity ceiling run + Highway
          const p1: Platform = { x: 890, y: baseY - 60, width: 200, height: 20 };
          const ag1: Particle = { x: p1.x + 170, y: p1.y - 120, type: 'antiGravity' };
          const p2: Platform = { x: 1180, y: 260, width: 230, height: 20 };
          const p3: Platform = { x: 1490, y: 260, width: 230, height: 20 };
          const ag2: Particle = { x: 1770, y: 370, type: 'antiGravity' };
          const p4: Platform = { x: 1810, y: baseY - 80, width: 220, height: 20 };
          const agPlats = [intro1, intro2, p1, p2, p3, p4];
          const agParts = [ag1, ag2];
          accelerationChunk = {
            id: `chunk_ag_${level}`,
            name: 'Plafond Inversé',
            archetype: 'speedrun_highway',
            entry: introChunk.entry,
            exit: { x: p4.x + p4.width - 40, y: p4.y },
            platforms: agPlats,
            pathPlatforms: agPlats,
            spikes: [],
            particles: agParts,
            bounds: computeChunkBounds(agPlats, [], agParts)
          };
          const rawHigh = createSpeedrunHighwayChunk({
            steps: 3,
            horizontalSpacing: 195,
            verticalDrop: 24,
            platformWidth: 170,
            speedBoostParticle: false
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawHigh, levelAlpha, -15);
        }
      }

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, levelAlpha, -15);
      width = Math.max(2600, Math.round(resolutionChunk.exit.x + 320));
      break;
    }
  }

  // Aggregate all chunks
  const chunks: Chunk[] = [awakeningChunk, accelerationChunk, climaxChunk, resolutionChunk];

  const allPlatforms: Platform[] = [];
  const allSpikes: Spike[] = [
    // Pit hazard spikes at bottom
    { x: 0, y: height - 15, width, height: 15 }
  ];
  const allParticles: Particle[] = [];
  const fullPlatformPath: Platform[] = [];

  for (const c of [awakeningChunk, accelerationChunk, climaxChunk, resolutionChunk]) {
    // Deduplicate in case climax === acceleration
    for (const p of c.platforms) {
      if (!allPlatforms.includes(p)) allPlatforms.push(p);
    }
    for (const s of c.spikes) {
      if (!allSpikes.includes(s)) allSpikes.push(s);
    }
    for (const part of c.particles) {
      if (!allParticles.includes(part)) allParticles.push(part);
    }
    for (const pp of c.pathPlatforms) {
      if (!fullPlatformPath.includes(pp)) fullPlatformPath.push(pp);
    }
  }

  const player = {
    position: {
      x: Math.round(awakeningChunk.entry.x),
      y: Math.round(awakeningChunk.entry.y - PHYSICS.HERO_HEIGHT / 2)
    }
  };

  const door: Door = {
    x: Math.round(resolutionChunk.exit.x),
    y: Math.round(resolutionChunk.exit.y - 10)
  };

  const world = {
    width,
    height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms: allPlatforms,
    spikes: allSpikes,
    particles: allParticles,
    bounceWalls: true,
    gates,
    pressurePlates,
    collapse: collapseConfig
  };

  const simulation = simulateFullLevel(world, player.position, door, fullPlatformPath);

  const levelData: LevelData = {
    id: String(level),
    symbol: elementInfo.symbol,
    atom: elementInfo.name,
    uncertainty: level === 4 ? 4 : level,
    width,
    height,
    hue: elementInfo.hue,
    antiHue: elementInfo.antiHue,
    explanations: narrative,
    player,
    spikes: allSpikes,
    particles: allParticles,
    platforms: allPlatforms,
    gates,
    pressurePlates,
    door,
    collapse: collapseConfig,
    authorGhost: simulation.authorGhost,
    authorTime: simulation.authorTime,
    meta: {
      seed,
      generatorVersion: '2.0.0',
      path: simulation.path
    }
  };

  return {
    levelData,
    chunks,
    pacingPhases: {
      awakening: awakeningChunk,
      acceleration: accelerationChunk,
      climax: climaxChunk,
      resolution: resolutionChunk
    },
    fullPlatformPath,
    simulation
  };
}
