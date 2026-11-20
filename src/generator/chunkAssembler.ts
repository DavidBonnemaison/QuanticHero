import { getCampaignExplanations, getNarrativeForLevel } from '../data/cosmicNarrative';
import { getElementSpectroscopy } from '../data/spectroscopy';
import { PHYSICS } from '../physics/constants';
import type {
  CollapseConfig,
  Door,
  EntanglementConfig,
  Gate,
  LevelData,
  MatterState,
  Particle,
  Platform,
  PressurePlate,
  Spike,
  TetherPylon,
  Wormhole
} from '../types';
import {
  type CampaignArchetypeId,
  applyCampaignDirectives,
  getPeriodMechanicPlan
} from './campaignDirector';
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
interface DynamicCourseOptions {
  id: string;
  steps: number;
  rng: SeededRandom;
  progress: number;
  allowSpikes?: boolean;
  allowMoving?: boolean;
  decayMs?: number;
}

function createDynamicCourseChunk(opts: DynamicCourseOptions): Chunk {
  const { id, steps, rng, progress, allowSpikes = false, allowMoving = false, decayMs } = opts;
  const platforms: Platform[] = [];
  const pathPlatforms: Platform[] = [];
  const spikes: Spike[] = [];
  let curX = 0;
  let curY = 0;

  for (let i = 0; i < steps; i++) {
    const pattern = (i + Math.floor(rng.next() * 3)) % 5;
    let dy = 0;
    if (i > 0) {
      if (pattern === 0) {
        // Ascent step
        dy = -Math.round(26 + rng.next() * 18);
      } else if (pattern === 1) {
        // Gentle rise
        dy = -Math.round(10 + rng.next() * 14);
      } else if (pattern === 2) {
        // Drop-down chasm
        dy = Math.round(35 + rng.next() * 45);
      } else if (pattern === 3) {
        // High vault
        dy = -Math.round(32 + rng.next() * 12);
      } else {
        // Flat sprint
        dy = Math.round((rng.next() - 0.5) * 14);
      }
      if (curY + dy < -240) dy = 45;
      if (curY + dy > 150) dy = -42;
    }

    const hazardRoll = rng.next();
    const isSpikePlat =
      allowSpikes && i > 0 && (i % 3 === 1 || (progress > 0.55 && hazardRoll < 0.32));
    const isMovingPlat = !isSpikePlat && allowMoving && i > 0 && (i % 3 === 2 || hazardRoll > 0.72);
    const isDoubleSpike = false;

    const baseW = Math.round(148 - progress * 44 + (rng.next() - 0.5) * 30);
    const platW = isDoubleSpike
      ? 360
      : isSpikePlat
        ? 260
        : isMovingPlat
          ? Math.max(105, Math.min(145, baseW))
          : Math.max(95, Math.min(185, baseW));

    const prevHasSpike =
      i > 0 &&
      spikes.some(
        (s) =>
          s.x >= pathPlatforms[pathPlatforms.length - 1].x &&
          s.x <=
            pathPlatforms[pathPlatforms.length - 1].x +
              pathPlatforms[pathPlatforms.length - 1].width
      );
    if (prevHasSpike && dy < -22) {
      dy = -22;
    }
    const maxGap = prevHasSpike ? 92 : dy < -30 ? 105 : dy < 0 ? 115 : dy > 20 ? 165 : 142;
    const minGap = prevHasSpike || dy < -30 ? 70 : 85;
    const gap = i === 0 ? 0 : Math.round(minGap + rng.next() * (maxGap - minGap));

    if (i > 0) {
      const prev = pathPlatforms[pathPlatforms.length - 1];
      curX = prev.x + prev.width + gap;
      curY += dy;
      if (prev.movesTo?.x !== undefined) {
        prev.movesTo.x = prev.x + Math.round(gap * 0.65);
      }
    }

    const plat: Platform = {
      x: curX,
      y: curY,
      width: platW,
      height: 20
    };
    if (decayMs && i % 2 === 1 && !isMovingPlat && !isSpikePlat) {
      plat.decayMs = decayMs;
    }
    if (isMovingPlat) {
      const prevHasVertMove =
        i > 0 && pathPlatforms[pathPlatforms.length - 1]?.movesTo?.y !== undefined;
      if (prevHasVertMove || dy < -18 || rng.next() > 0.35) {
        plat.movesTo = { x: curX + 75 };
      } else {
        const vTravel = Math.round(22 + rng.next() * 14);
        plat.movesTo = { y: curY - vTravel };
      }
    }
    platforms.push(plat);
    pathPlatforms.push(plat);

    // Optional upper perch on wide flat segments for visual & route variety
    if (
      !isMovingPlat &&
      !isSpikePlat &&
      i > 1 &&
      i < steps - 1 &&
      pattern === 4 &&
      rng.next() > 0.55
    ) {
      platforms.push({
        x: curX + Math.round(platW * 0.2),
        y: curY - 95,
        width: 100,
        height: 20
      });
    }

    if (isSpikePlat) {
      if (isDoubleSpike) {
        spikes.push(
          {
            x: curX + Math.round(platW * 0.48) - 14,
            y: curY - 20,
            width: 28,
            height: 20
          },
          {
            x: curX + Math.round(platW * 0.78) - 14,
            y: curY - 20,
            width: 28,
            height: 20
          }
        );
      } else {
        spikes.push({
          x: curX + Math.round(platW * 0.78) - 14,
          y: curY - 20,
          width: 28,
          height: 20
        });
      }
    }
  }

  return {
    id,
    name: 'Parcours Dynamique',
    archetype: 'speedrun_highway',
    entry: { x: pathPlatforms[0].x + 40, y: pathPlatforms[0].y },
    exit: {
      x:
        pathPlatforms[pathPlatforms.length - 1].x +
        pathPlatforms[pathPlatforms.length - 1].width -
        40,
      y: pathPlatforms[pathPlatforms.length - 1].y
    },
    platforms,
    pathPlatforms,
    spikes,
    particles: [],
    bounds: computeChunkBounds(platforms, spikes)
  };
}

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
  let entanglementConfig: EntanglementConfig | undefined;
  let tetherPylons: TetherPylon[] | undefined;
  let wormholes: Wormhole[] | undefined;
  let screenWrap: 'horizontal' | 'vertical' | 'both' | undefined;
  let allowCloneFusion: boolean | undefined;
  let archetype: CampaignArchetypeId | undefined;

  const makeIntro = (id: string, baseY: number) => {
    const intro1: Platform = { x: 420, y: baseY - 25, width: 170, height: 20 };
    const intro2: Platform = { x: 660, y: baseY - 50, width: 170, height: 20 };
    const chunk: Chunk = {
      id,
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
    return { intro1, intro2, chunk };
  };

  switch (level) {
    case 1:
    case 2:
    case 3: {
      // Période 1 (Niv 1-2) & Niv 3: Mouvement pur, murs néon & gaz ascendant (He), 0 particules
      const rng = new SeededRandom(seed + level * 19);
      height = 1200;
      const baseY = 760;
      awakeningChunk = createSpawnChunk({
        originX: 120,
        originY: baseY,
        width: 260 - (level - 1) * 15
      });

      const rawAccel = createDynamicCourseChunk({
        id: `chunk_pure_accel_${level}`,
        steps: 3 + level,
        rng,
        progress: level * 0.06,
        allowSpikes: level === 3,
        allowMoving: level >= 3
      });
      accelerationChunk = connectAndTranslateChunk(awakeningChunk, rawAccel, alpha, -15);

      const rawClimax = createDynamicCourseChunk({
        id: `chunk_pure_climax_${level}`,
        steps: 2 + Math.floor(level / 2),
        rng,
        progress: level * 0.08,
        allowSpikes: level >= 3,
        allowMoving: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);

      if (level === 2) {
        // He (Noble Gas): ascending gas columns & decorative neon bounce walls
        const midA = accelerationChunk.pathPlatforms[Math.floor(accelerationChunk.pathPlatforms.length / 2)];
        const midC = climaxChunk.pathPlatforms[0];
        accelerationChunk.platforms.push(
          { x: midA.x + midA.width + 10, y: midA.y - 160, width: 70, height: 180, matterState: 'gas' },
          { x: midA.x - 24, y: midA.y - 260, width: 20, height: 180, kind: 'wall' }
        );
        climaxChunk.platforms.push(
          { x: midC.x + midC.width + 10, y: midC.y - 160, width: 70, height: 180, matterState: 'gas' }
        );
      }

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2400, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 4: {
      // Niv 4 (Be - Milestone superposition_orbital): Zone safe avec duplicate + dalle requireLock + porte + switch orbital
      width = 2700;
      height = 1100;
      const baseY = 720;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 240 });
      const p1: Platform = { x: 430, y: baseY - 25, width: 220, height: 20 };
      const dupPart: Particle = { x: p1.x + 110, y: p1.y - 30, type: 'duplicate' };
      const p2: Platform = { x: 720, y: baseY - 45, width: 220, height: 20 };
      const p3: Platform = { x: 1010, y: baseY - 65, width: 240, height: 20 };
      const p4: Platform = { x: 1320, y: baseY - 85, width: 210, height: 20 };
      const accelPlats = [p1, p2, p3, p4];

      accelerationChunk = {
        id: 'chunk_be_superposition_orbital',
        name: 'Superposition & Switch Orbital',
        archetype: 'speedrun_highway',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [dupPart],
        bounds: computeChunkBounds(accelPlats, [], [dupPart])
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_be_climax',
        steps: 3,
        horizontalSpacing: 185,
        verticalDrop: 22,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2600, Math.round(resolutionChunk.exit.x + 300));

      gates = [
        {
          id: 'gate_be_4',
          x: Math.round(p3.x + 60),
          y: 0,
          width: 24,
          height: Math.round(p3.y)
        }
      ];
      pressurePlates = [
        {
          id: 'plate_be_4',
          x: p2.x + 65,
          y: p2.y - 12,
          width: 90,
          height: 12,
          targetGateId: 'gate_be_4',
          requireLock: true,
          autoSwitchOnTrigger: true
        }
      ];
      break;
    }

    case 5: {
      // Niv 5 (B): Introduction du Speed Boost (approche puis gouffre de 580 px)
      width = 2900;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 640, width: 240 });
      const { intro1, intro2 } = makeIntro('chunk_b_intro', 640);
      const p1: Platform = { x: 900, y: 590, width: 220, height: 20 };
      const speedPart: Particle = { x: p1.x + 110, y: p1.y - 30, type: 'speed' };
      const p2: Platform = { x: p1.x + p1.width + 580, y: 590, width: 240, height: 20 };
      const accelPlats = [intro1, intro2, p1, p2];

      accelerationChunk = {
        id: 'chunk_speedrun_chasm',
        name: 'Autoroute Quantique',
        archetype: 'speedrun_highway',
        entry: { x: intro1.x + 40, y: intro1.y },
        exit: { x: p2.x + p2.width - 40, y: p2.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [speedPart],
        bounds: computeChunkBounds(accelPlats, [], [speedPart])
      };

      const rawClimax = createSuperpositionChamberChunk({
        id: 'chunk_speedrun_climax',
        steps: 4,
        stepSpacing: 180,
        platformWidth: 170,
        verticalStep: -20,
        initialPhase: 'magenta'
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(width, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 8: {
      // Niv 8 (O - Milestone phase_shift_hud): Alternance obligatoire cyan/magenta dès la zone de découverte
      width = 2700;
      height = 1100;
      const baseY = 720;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 240 });

      // Initial phase is 'cyan'; jumping from spawn toggles phase to 'magenta', then 'cyan', 'magenta', 'cyan'
      const p1: Platform = { x: 430, y: baseY - 20, width: 170, height: 20, phase: 'magenta' };
      const p2: Platform = { x: 660, y: baseY - 40, width: 170, height: 20, phase: 'cyan' };
      const p3: Platform = { x: 890, y: baseY - 60, width: 170, height: 20, phase: 'magenta' };
      const p4: Platform = { x: 1120, y: baseY - 80, width: 170, height: 20, phase: 'cyan' };
      const accelPlats = [p1, p2, p3, p4];

      accelerationChunk = {
        id: 'chunk_o_phase_discovery',
        name: 'Phases Cyan/Magenta',
        archetype: 'superposition_chamber',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [],
        bounds: computeChunkBounds(accelPlats)
      };

      const rawSuperpos = createSuperpositionChamberChunk({
        id: 'chunk_o_phase_climax',
        steps: 4,
        stepSpacing: 175,
        platformWidth: 155,
        verticalStep: -20,
        initialPhase: 'magenta'
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawSuperpos, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2600, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 9: {
      // Niv 9 (F): Introduction de lowGravity (approche puis gouffre de 480 px)
      width = 2800;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 680, width: 240 });
      const { chunk: introChunk } = makeIntro('chunk_f_intro', 680);
      const rawChasm = createElectronChasmChunk({
        chasmWidth: 480,
        powerType: 'lowGravity',
        startWidth: 180,
        landingWidth: 200,
        verticalDrop: 20
      });
      const chasmT = connectAndTranslateChunk(introChunk, rawChasm, alpha, -15);
      accelerationChunk = {
        id: 'chunk_f_accel',
        name: 'Gouffre à Électrons',
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
      const rawClimax = createSuperpositionChamberChunk({
        id: 'chunk_chasm_climax',
        steps: 3,
        stepSpacing: 180,
        platformWidth: 170,
        verticalStep: -20,
        initialPhase: 'magenta'
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(width, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 11: {
      // Niv 11 (Na - Milestone quantum_tunneling): tunnel face à un mur mince (<= 80px) infranchissable par le haut + séquence de 3 murs
      width = 2900;
      height = 1100;
      const baseY = 720;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 240 });

      const p1: Platform = { x: 420, y: baseY - 20, width: 220, height: 20 };
      const tun1: Particle = { x: p1.x + 110, y: p1.y - 30, type: 'tunnel' };
      const wall1: Platform = { x: p1.x + p1.width + 25, y: 0, width: 32, height };

      const p2: Platform = { x: wall1.x + wall1.width + 25, y: baseY - 20, width: 230, height: 20 };
      const tun2: Particle = { x: p2.x + 115, y: p2.y - 30, type: 'tunnel' };
      const wall2: Platform = { x: p2.x + p2.width + 25, y: 0, width: 36, height };

      const p3: Platform = { x: wall2.x + wall2.width + 25, y: baseY - 35, width: 230, height: 20 };
      const tun3: Particle = { x: p3.x + 115, y: p3.y - 30, type: 'tunnel' };
      const wall3: Platform = { x: p3.x + p3.width + 25, y: 0, width: 40, height };

      const p4: Platform = { x: wall3.x + wall3.width + 25, y: baseY - 50, width: 220, height: 20 };
      const tunnelPlats = [p1, wall1, p2, wall2, p3, wall3, p4];
      const tunnelParts = [tun1, tun2, tun3];

      accelerationChunk = {
        id: 'chunk_na_quantum_tunneling',
        name: 'Effet Tunnel',
        archetype: 'speedrun_highway',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: tunnelPlats,
        pathPlatforms: [p1, p2, p3, p4],
        spikes: [],
        particles: tunnelParts,
        bounds: computeChunkBounds(tunnelPlats, [], tunnelParts)
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_na_climax',
        steps: 3,
        horizontalSpacing: 185,
        verticalDrop: 22,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2800, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 12: {
      // Niv 12 (Mg - Boss Univers 1): Combinaison Speed + LowGravity
      height = 1150;
      const baseY = 740;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 240 });
      const { intro1, intro2, chunk: introChunk } = makeIntro('chunk_mg_intro', baseY);
      const p1: Platform = { x: 900, y: baseY - 60, width: 210, height: 20 };
      const speedPart: Particle = { x: p1.x + 105, y: p1.y - 30, type: 'speed' };
      const p2: Platform = { x: p1.x + p1.width + 560, y: baseY - 60, width: 220, height: 20 };
      accelerationChunk = {
        id: 'chunk_mg_accel',
        name: 'Double Impulsion',
        archetype: 'speedrun_highway',
        entry: introChunk.entry,
        exit: { x: p2.x + p2.width - 40, y: p2.y },
        platforms: [intro1, intro2, p1, p2],
        pathPlatforms: [intro1, intro2, p1, p2],
        spikes: [],
        particles: [speedPart],
        bounds: computeChunkBounds([intro1, intro2, p1, p2], [], [speedPart])
      };
      const rawChasm = createElectronChasmChunk({
        chasmWidth: 460,
        powerType: 'lowGravity',
        startWidth: 180,
        landingWidth: 200,
        verticalDrop: 20
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawChasm, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2900, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 14: {
      // Niv 14 (Si - Milestone de_broglie_wave): zone safe continue jusqu'à la particule condense (0 soft-lock),
      // puis deux gouffres calibrés 420-440 px au-dessus de piques (respawn propre, franchissables en 1 saut + 1 condense)
      width = 2900;
      height = 1100;
      const baseY = 700;
      awakeningChunk = createSpawnChunk({ originX: 100, originY: baseY, width: 520 });

      const p1: Platform = { x: 680, y: baseY - 20, width: 280, height: 20 };
      const condensePart: Particle = { x: p1.x + 150, y: p1.y - 30, type: 'condense' };
      // 445px elevated chasm strictly requiring de Broglie wave crystallization (1 jump + 1 air SPACE/[C])
      const p2: Platform = { x: p1.x + p1.width + 445, y: p1.y - 35, width: 240, height: 20 };
      // Second 455px elevated chasm to consolidate mastery
      const p3: Platform = { x: p2.x + p2.width + 455, y: p2.y - 35, width: 240, height: 20 };
      const accelPlats = [p1, p2, p3];

      accelerationChunk = {
        id: 'chunk_si_de_broglie',
        name: 'Onde de Broglie Solidifiée',
        archetype: 'electron_chasm',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p3.x + p3.width - 40, y: p3.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [condensePart],
        bounds: computeChunkBounds(accelPlats, [], [condensePart])
      };

      const rawClimax = createSpeedrunHighwayChunk({
        id: 'chunk_si_climax',
        steps: 3,
        horizontalSpacing: 185,
        verticalDrop: 22,
        platformWidth: 180,
        speedBoostParticle: false
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawClimax, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(2800, Math.round(resolutionChunk.exit.x + 300));
      break;
    }

    case 18: {
      // Niv 18 (Ar): Introduction des murs néon rebondissants (kind: 'wall')
      width = 2300;
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
      const rawWell = createGravityWellChunk({ wellWidth: 320, height: 600, steps: 2 });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawWell, alpha, 20);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      break;
    }

    case 22: {
      // Niv 22 (Ti): Introduction de l'inversion de gravité (antiGravity)
      width = 2900;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });
      const { intro1, intro2 } = makeIntro('chunk_ti_intro', 720);
      const p1: Platform = { x: 900, y: 660, width: 200, height: 20 };
      const antiGravPart: Particle = { x: 1080, y: 540, type: 'antiGravity' };
      const p2: Platform = { x: 1200, y: 240, width: 240, height: 20 };
      const p3: Platform = { x: 1520, y: 240, width: 240, height: 20 };
      const p3b: Platform = { x: 1840, y: 240, width: 220, height: 20 };
      const restorePart: Particle = { x: 2100, y: 350, type: 'antiGravity' };
      const p4: Platform = { x: 2140, y: 640, width: 240, height: 20 };
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

    case 26: {
      // Niv 26 (Fe - Milestone entanglement_tether & Supernova Boss):
      // Config entanglement avec tetherPhysical: true, tetherPylons pendulaires et climax Supernova (speed + decay) vers Niv. 27
      height = 1150;
      const baseY = 740;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: baseY, width: 240 });

      const p1: Platform = { x: 430, y: baseY - 20, width: 200, height: 20 };
      const p2: Platform = { x: 700, y: baseY - 45, width: 210, height: 20 };
      const p3: Platform = { x: 980, y: baseY - 65, width: 220, height: 20 };
      const speedPart: Particle = { x: p3.x + 110, y: p3.y - 30, type: 'speed' };
      // 520px Supernova chasm launched via speed + tether pendulum swing
      const p4: Platform = { x: p3.x + p3.width + 520, y: baseY - 65, width: 230, height: 20 };
      const accelPlats = [p1, p2, p3, p4];

      accelerationChunk = {
        id: 'chunk_fe_entanglement_tether',
        name: 'Corde d’Intrication & Supernova',
        archetype: 'speedrun_highway',
        entry: { x: p1.x + 40, y: p1.y },
        exit: { x: p4.x + p4.width - 40, y: p4.y },
        platforms: accelPlats,
        pathPlatforms: accelPlats,
        spikes: [],
        particles: [speedPart],
        bounds: computeChunkBounds(accelPlats, [], [speedPart])
      };

      const rawDecay = createDecayZoneChunk({
        id: 'chunk_fe_supernova_climax',
        steps: 4,
        decayMs: 760,
        stepSpacing: 175,
        platformWidth: 155,
        verticalDelta: -20,
        includeStableExit: true
      });
      climaxChunk = connectAndTranslateChunk(accelerationChunk, rawDecay, alpha, -15);
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      width = Math.max(3000, Math.round(resolutionChunk.exit.x + 300));

      entanglementConfig = {
        mode: 'mirror_x',
        betaSpawn: {
          x: width - 180,
          y: baseY - Math.round(PHYSICS.HERO_HEIGHT / 2)
        },
        portalMode: 'dual',
        betaDoor: {
          x: Math.max(180, width - Math.round(resolutionChunk.exit.x)),
          y: Math.round(resolutionChunk.exit.y - 10)
        },
        tetherPhysical: true,
        tetherMaxLength: 540
      };

      tetherPylons = [
        { x: 640, y: baseY - 180, radius: 18, maxLength: 540 },
        { x: 1460, y: baseY - 200, radius: 18, maxLength: 540 },
        { x: 2240, y: baseY - 220, radius: 18, maxLength: 540 }
      ];
      break;
    }

    case 29: {
      // Niv 29 (Cu): Introduction de l'Effet Tunnel (tunnel + barrière étanche sol-plafond)
      width = 2800;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });
      const { intro1, intro2 } = makeIntro('chunk_cu_intro', 720);
      const p1: Platform = { x: 900, y: 680, width: 200, height: 20 };
      const tunnelPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'tunnel' };
      const barrier: Platform = { x: 1155, y: 0, width: 30, height: 1100 };
      const p2: Platform = { x: 1200, y: 680, width: 220, height: 20 };
      const p3: Platform = { x: 1480, y: 660, width: 220, height: 20 };
      const p4: Platform = { x: 1760, y: 640, width: 220, height: 20 };
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

    case 36: {
      // Niv 36 (Kr): Introduction de la Superposition de Phase (cyan/magenta)
      width = 2500;
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
      width = Math.max(2500, Math.round(resolutionChunk.exit.x + 300));
      if (accelerationChunk.platforms[0]) {
        accelerationChunk.platforms[0].matterState = 'liquid';
      }
      entanglementConfig = {
        mode: 'mirror_x',
        betaSpawn: {
          x: width - 180,
          y: 700 - Math.round(PHYSICS.HERO_HEIGHT / 2)
        },
        portalMode: 'dual',
        betaDoor: {
          x: Math.max(180, width - Math.round(resolutionChunk.exit.x)),
          y: Math.round(resolutionChunk.exit.y - 10)
        },
        tetherPhysical: true,
        tetherMaxLength: 520
      };
      tetherPylons = [
        { x: 700, y: 520, radius: 18, maxLength: 520 },
        { x: 1500, y: 480, radius: 18, maxLength: 520 }
      ];
      break;
    }

    case 52: {
      // Niv 52 (Te): Introduction de la Répulsion de Pauli (duplicate + pauli) sur gouffre de 680 px
      width = 3300;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 720, width: 240 });
      const { intro1, intro2 } = makeIntro('chunk_te_intro', 720);
      const p1: Platform = { x: 900, y: 680, width: 280, height: 20 };
      const dupPart: Particle = { x: p1.x + 140, y: p1.y - 30, type: 'duplicate' };
      const pauliPart: Particle = { x: p1.x + 220, y: p1.y - 30, type: 'pauli' };
      const p2: Platform = { x: 1760, y: 680, width: 260, height: 20 };
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
        spikes: [{ x: 1180, y: height - 20, width: 580, height: 20 }],
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

    case 74: {
      // Niv 74 (W): Introduction de l'Effondrement Gravitationnel (collapse) + timeDilation + plateformes mobiles
      width = 2500;
      height = 1100;
      awakeningChunk = createSpawnChunk({ originX: 120, originY: 700, width: 240 });
      const mp1: Platform = { x: 450, y: 680, width: 180, height: 20, movesTo: { x: 530 } };
      const mp2: Platform = { x: 740, y: 660, width: 180, height: 20, movesTo: { y: 630 } };
      accelerationChunk = {
        id: 'chunk_moving_platforms',
        name: 'Plateformes Temporelles',
        archetype: 'speedrun_highway',
        entry: { x: mp1.x + 40, y: mp1.y },
        exit: { x: mp2.x + mp2.width - 40, y: mp2.y },
        platforms: [mp1, mp2],
        pathPlatforms: [mp1, mp2],
        spikes: [],
        particles: [],
        bounds: computeChunkBounds([mp1, mp2])
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
      const midPlat = climaxChunk.platforms[0];
      climaxChunk.particles.push({
        x: midPlat.x + Math.round(midPlat.width / 2),
        y: midPlat.y - 30,
        type: 'timeDilation'
      });
      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(climaxChunk, rawRes, alpha, -15);
      collapseConfig = { speedY: 42, delayMs: 1200 };
      break;
    }

    default: {
      // Spec 02: Dense 7-period plan-driven campaign generator (2 000 - 4 800 px, 0 > 5 500 px)
      const plan = getPeriodMechanicPlan(level);
      const rng = new SeededRandom(seed + level * 31);
      const progress = Math.min(1, Math.max(0, (level - 1) / 117));
      const levelAlpha = 0.75 + progress * 0.1;
      const decayMs = Math.round(820 - progress * 220);
      const speedChasm = Math.round(500 + progress * 50 + (rng.next() - 0.5) * 24);

      const isEntangledDualLane =
        Boolean(plan.entanglement) && plan.entanglement?.portalMode !== 'single';

      // Varied topography profiles driven by level & seed
      type TopographyProfile = 'ascent' | 'canyon' | 'valley' | 'undulation';
      const profiles: readonly TopographyProfile[] = ['ascent', 'canyon', 'valley', 'undulation'];
      const profile: TopographyProfile = profiles[(level * 3 + seed) % profiles.length];

      height = isEntangledDualLane ? 1320 : 1200;
      const minYBound = isEntangledDualLane ? 740 : 280;
      const maxYBound = isEntangledDualLane ? 1060 : 940;
      const clampY = (y: number): number => Math.max(minYBound, Math.min(maxYBound, Math.round(y)));

      const jitter = (range: number): number => Math.round((rng.next() - 0.5) * 2 * range);

      let baseY: number;
      if (isEntangledDualLane) {
        baseY =
          profile === 'ascent'
            ? clampY(980 + jitter(24))
            : profile === 'canyon'
              ? clampY(790 + jitter(24))
              : profile === 'valley'
                ? clampY(850 + jitter(24))
                : clampY(890 + jitter(28));
      } else {
        baseY =
          profile === 'ascent'
            ? clampY(860 + jitter(28))
            : profile === 'canyon'
              ? clampY(420 + jitter(28))
              : profile === 'valley'
                ? clampY(560 + jitter(28))
                : clampY(680 + jitter(36));
      }

      // Compute topography-guided vertical delta for step i of total steps
      const stepDy = (i: number, total: number, scale = 1): number => {
        const j = jitter(7);
        if (profile === 'ascent') {
          return Math.round((-26 - rng.next() * 14) * scale) + j;
        }
        if (profile === 'canyon') {
          return Math.round((26 + rng.next() * 20) * scale) + j;
        }
        if (profile === 'valley') {
          const half = Math.max(1, Math.floor(total / 2));
          return i < half
            ? Math.round((28 + rng.next() * 16) * scale) + j
            : Math.round((-28 - rng.next() * 12) * scale) + j;
        }
        // undulation
        return i % 2 === 0
          ? Math.round((-28 - rng.next() * 10) * scale) + j
          : Math.round((28 + rng.next() * 16) * scale) + j;
      };

      const spawnW = Math.round(210 + rng.next() * 44);
      awakeningChunk = createSpawnChunk({ originX: 110 + Math.round(rng.next() * 24), originY: baseY, width: spawnW });
      const startAfterSpawnX = awakeningChunk.platforms[0].x + awakeningChunk.platforms[0].width + Math.round(62 + rng.next() * 26);

      if (plan.screenWrap) screenWrap = plan.screenWrap;
      if (plan.allowCloneFusion) allowCloneFusion = true;
      if (plan.archetypeId) archetype = plan.archetypeId;

      const isSpeedTunnelBoss = level === 46 || level === 84 || level === 109;
      const isPauliBoss = level === 68 || level === 100;
      const isAntiGravBoss = level === 88;

      const computePhaseParity = (priorPathCount: number): 'cyan' | 'magenta' =>
        priorPathCount % 2 === 1 ? 'magenta' : 'cyan';

      const buildDenseClimax = (anchor: Chunk, priorPathCount: number): Chunk => {
        const usePhase = Boolean(plan.addPhaseClimax) && plan.primary !== 'phase';
        const useDecay = Boolean(plan.addDecayClimax) && !usePhase;
        const climaxSteps = 3 + (Math.floor(rng.next() * 3) % 3); // 3, 4, or 5 steps
        const climaxVStep =
          profile === 'ascent'
            ? -Math.round(22 + rng.next() * 14)
            : profile === 'canyon'
              ? Math.round(20 + rng.next() * 22)
              : profile === 'valley'
                ? -Math.round(20 + rng.next() * 14)
                : (rng.next() > 0.5 ? -1 : 1) * Math.round(14 + rng.next() * 14);
        const anchorLastY = anchor.pathPlatforms[anchor.pathPlatforms.length - 1]?.y ?? baseY;
        const safeVStep =
          anchorLastY + climaxVStep * climaxSteps < minYBound
            ? Math.abs(climaxVStep)
            : anchorLastY + climaxVStep * climaxSteps > maxYBound
              ? -Math.abs(climaxVStep)
              : climaxVStep;
        const connDy = safeVStep < 0 ? -15 : 15;

        if (usePhase) {
          const rawPhase = createSuperpositionChamberChunk({
            id: `chunk_climax_phase_${level}`,
            steps: climaxSteps,
            stepSpacing: Math.round(158 + rng.next() * 30),
            platformWidth: Math.round(145 + rng.next() * 28),
            verticalStep: safeVStep,
            initialPhase: computePhaseParity(priorPathCount)
          });
          return connectAndTranslateChunk(anchor, rawPhase, levelAlpha, connDy);
        }
        if (useDecay) {
          const rawDecay = createDecayZoneChunk({
            id: `chunk_climax_decay_${level}`,
            steps: climaxSteps,
            decayMs,
            stepSpacing: Math.round(155 + rng.next() * 28),
            platformWidth: Math.round(142 + rng.next() * 26),
            verticalDelta: safeVStep,
            includeStableExit: true
          });
          return connectAndTranslateChunk(anchor, rawDecay, levelAlpha, connDy);
        }
        const rawDyn = createDynamicCourseChunk({
          id: `chunk_climax_dyn_${level}`,
          steps: climaxSteps,
          rng,
          progress,
          allowSpikes: true,
          allowMoving: level >= 15
        });
        return connectAndTranslateChunk(anchor, rawDyn, levelAlpha, connDy);
      };

      if (isSpeedTunnelBoss) {
        const { intro1, intro2, chunk: introChunk } = makeIntro(`chunk_boss_intro_${level}`, baseY);
        const p1: Platform = { x: 890, y: clampY(baseY - 60), width: 210, height: 20 };
        const speedPart: Particle = { x: p1.x + 100, y: p1.y - 30, type: 'speed' };
        const p2: Platform = {
          x: p1.x + p1.width + speedChasm,
          y: p1.y,
          width: 220,
          height: 20
        };
        const tunnelPart: Particle = { x: p2.x + 100, y: p2.y - 30, type: 'tunnel' };
        const barrier: Platform = { x: p2.x + p2.width + 25, y: 0, width: 32, height };
        const p3: Platform = { x: barrier.x + 56, y: p1.y, width: 210, height: 20 };
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
        if (level === 109) {
          const rawSpeed = createSpeedrunHighwayChunk({
            steps: 3,
            horizontalSpacing: 185,
            verticalDrop: 22,
            platformWidth: 165,
            speedBoostParticle: false
          });
          climaxChunk = connectAndTranslateChunk(accelerationChunk, rawSpeed, levelAlpha, -15);
          const midP = climaxChunk.platforms[0];
          climaxChunk.particles.push({
            x: midP.x + Math.round(midP.width / 2),
            y: midP.y - 30,
            type: 'timeDilation'
          });
          collapseConfig = { speedY: 14, delayMs: 2000 };
        } else {
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        }
      } else if (isPauliBoss) {
        const { intro1, intro2, chunk: introChunk } = makeIntro(`chunk_pauli_intro_${level}`, baseY);
        const p1: Platform = { x: 890, y: clampY(baseY - 60), width: 260, height: 20 };
        const dupPart: Particle = { x: p1.x + 120, y: p1.y - 30, type: 'duplicate' };
        const pauliPart: Particle = { x: p1.x + 200, y: p1.y - 30, type: 'pauli' };
        const p2: Platform = { x: p1.x + p1.width + 560, y: p1.y, width: 240, height: 20 };
        const bossPlats = [intro1, intro2, p1, p2];
        const bossParts = [dupPart, pauliPart];
        const pathPlats = [intro1, intro2, p1, p2];

        if (level === 100) {
          const tunPart: Particle = { x: p2.x + 115, y: p2.y - 30, type: 'tunnel' };
          const barrier: Platform = { x: p2.x + p2.width + 25, y: 0, width: 32, height };
          const p3: Platform = { x: barrier.x + 56, y: p1.y, width: 210, height: 20 };
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
          spikes: [{ x: p1.x + p1.width, y: height - 20, width: 560, height: 20 }],
          particles: bossParts,
          bounds: computeChunkBounds(bossPlats, [], bossParts)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (isAntiGravBoss) {
        const agBaseY = 780;
        awakeningChunk = createSpawnChunk({ originX: 120, originY: agBaseY, width: 220 });
        const { intro1, intro2, chunk: introChunk } = makeIntro(`chunk_ag_intro_${level}`, agBaseY);
        const p1: Platform = { x: 890, y: agBaseY - 60, width: 200, height: 20 };
        const ag1: Particle = { x: p1.x + 170, y: p1.y - 120, type: 'antiGravity' };
        const ceilingY = 260;
        const p2: Platform = { x: 1180, y: ceilingY, width: 230, height: 20 };
        const p3: Platform = { x: 1490, y: ceilingY, width: 230, height: 20 };
        const ag2: Particle = { x: 1770, y: ceilingY + 110, type: 'antiGravity' };
        const p4: Platform = { x: 1810, y: agBaseY - 80, width: 230, height: 20 };
        const tunPart: Particle = { x: p4.x + 115, y: p4.y - 30, type: 'tunnel' };
        const barrier: Platform = { x: p4.x + p4.width + 25, y: 0, width: 32, height };
        const p5: Platform = { x: barrier.x + 56, y: agBaseY - 80, width: 210, height: 20 };
        const bossPlats = [intro1, intro2, p1, p2, p3, p4, barrier, p5];
        const bossParts = [ag1, ag2, tunPart];
        accelerationChunk = {
          id: `chunk_boss_ag_${level}`,
          name: 'Inversion Critique',
          archetype: 'speedrun_highway',
          entry: introChunk.entry,
          exit: { x: p5.x + p5.width - 40, y: p5.y },
          platforms: bossPlats,
          pathPlatforms: [intro1, intro2, p1, p2, p3, p4, p5],
          spikes: [],
          particles: bossParts,
          bounds: computeChunkBounds(bossPlats, [], bossParts)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'archetype' && plan.archetypeId) {
        // Smart Archetype Multi-Room Variant (Period 5, 6, 7) with seeded topography variation
        const archId = plan.archetypeId;
        if (archId === 'living_floor') {
          height = 1200;
          const lfY = 860 + jitter(20);
          const landY = 700 + jitter(16);
          awakeningChunk = createSpawnChunk({ originX: 110 + Math.round(rng.next() * 20), originY: lfY, width: 240 });
          const landX = 900 + Math.round(rng.next() * 70);
          const landAlpha: Platform = { x: landX, y: landY, width: 230 + jitter(15), height: 24 };
          const pNext1: Platform = {
            x: landAlpha.x + landAlpha.width + Math.round(75 + rng.next() * 24),
            y: Math.max(700, landAlpha.y - Math.round(10 + rng.next() * 14)),
            width: 195 + jitter(16),
            height: 20
          };
          const pNext2: Platform = {
            x: pNext1.x + pNext1.width + Math.round(75 + rng.next() * 24),
            y: Math.max(700, pNext1.y + (rng.next() > 0.5 ? -16 : 18)),
            width: 195 + jitter(16),
            height: 20
          };
          accelerationChunk = {
            id: `chunk_arch_living_${level}`,
            name: 'Plancher Vivant',
            archetype: 'electron_chasm',
            entry: { x: landAlpha.x + 40, y: landAlpha.y },
            exit: { x: pNext2.x + pNext2.width - 40, y: pNext2.y },
            platforms: [landAlpha, pNext1, pNext2],
            pathPlatforms: [landAlpha, pNext1, pNext2],
            spikes: [],
            particles: [],
            bounds: computeChunkBounds([landAlpha, pNext1, pNext2])
          };
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        } else if (archId === 'phase_remote') {
          const y1 = clampY(baseY + stepDy(0, 4, 0.7));
          const p1: Platform = { x: startAfterSpawnX, y: y1, width: 205 + jitter(18), height: 20 };
          const dupPart: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'duplicate' };
          const wLeft: Platform = { x: p1.x - 24, y: p1.y - 180, width: 20, height: 180, kind: 'wall' };
          const y2 = clampY(y1 + stepDy(1, 4, 0.7));
          const p2: Platform = { x: p1.x + p1.width + Math.round(68 + rng.next() * 24), y: y2, width: 190 + jitter(16), height: 20, phase: 'cyan' };
          const y3 = clampY(y2 + stepDy(2, 4, 0.7));
          const p3: Platform = { x: p2.x + p2.width + Math.round(68 + rng.next() * 24), y: y3, width: 200 + jitter(16), height: 20, phase: 'magenta' };
          const y4 = clampY(y3 + stepDy(3, 4, 0.7));
          const p4: Platform = { x: p3.x + p3.width + Math.round(68 + rng.next() * 24), y: y4, width: 185 + jitter(16), height: 20, phase: 'cyan' };
          const tunnelCeil: Platform = {
            x: p2.x - 10,
            y: Math.min(y2, y3, y4) - 210,
            width: p4.x + p4.width - p2.x + 20,
            height: 24
          };
          const plats = [wLeft, p1, tunnelCeil, p2, p3, p4];
          accelerationChunk = {
            id: `chunk_arch_phase_remote_${level}`,
            name: 'Télécommandeur de Phase',
            archetype: 'superposition_chamber',
            entry: { x: p1.x + 40, y: p1.y },
            exit: { x: p4.x + p4.width - 40, y: p4.y },
            platforms: plats,
            pathPlatforms: [p1, p2, p3, p4],
            spikes: [],
            particles: [dupPart],
            bounds: computeChunkBounds(plats, [], [dupPart])
          };
          // Gate + requireLock plate makes duplicate strictly required
          gates = [
            {
              id: `gate_pr_${level}`,
              x: p3.x + Math.round(p3.width * 0.55),
              y: 0,
              width: 24,
              height
            }
          ];
          pressurePlates = [
            {
              id: `plate_pr_${level}`,
              x: p2.x + Math.round(p2.width * 0.3),
              y: p2.y - 12,
              width: 88,
              height: 12,
              targetGateId: `gate_pr_${level}`,
              requireLock: true,
              autoSwitchOnTrigger: true
            }
          ];
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        } else if (archId === 'perpetual_metronome') {
          const y1 = clampY(baseY + stepDy(0, 4, 0.7));
          const p1: Platform = { x: startAfterSpawnX, y: y1, width: 215 + jitter(16), height: 20 };
          const dupPart: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'duplicate' };
          const y2 = clampY(y1 + stepDy(1, 4, 0.7));
          const p2: Platform = { x: p1.x + p1.width + Math.round(70 + rng.next() * 24), y: y2, width: 220 + jitter(16), height: 20, decayMs: 650 };
          const wallL: Platform = { x: p2.x - 28, y: y2 + 25, width: 22, height: 110, kind: 'wall' };
          const wallR: Platform = { x: p2.x + p2.width + 6, y: y2 + 25, width: 22, height: 110, kind: 'wall' };
          const y3 = clampY(y2 + stepDy(2, 4, 0.7));
          const p3: Platform = { x: p2.x + p2.width + Math.round(76 + rng.next() * 24), y: y3, width: 255 + jitter(18), height: 20 };
          const y4 = clampY(y3 + stepDy(3, 4, 0.7));
          const p4: Platform = { x: p3.x + p3.width + Math.round(74 + rng.next() * 24), y: y4, width: 205 + jitter(16), height: 20 };
          const plats = [p1, wallL, p2, wallR, p3, p4];
          accelerationChunk = {
            id: `chunk_arch_metronome_${level}`,
            name: 'Métronome Perpétuel',
            archetype: 'decay_zone',
            entry: { x: p1.x + 40, y: p1.y },
            exit: { x: p4.x + p4.width - 40, y: p4.y },
            platforms: plats,
            pathPlatforms: [p1, p2, p3, p4],
            spikes: [],
            particles: [dupPart],
            bounds: computeChunkBounds(plats, [], [dupPart])
          };
          gates = [
            {
              id: `gate_met_${level}`,
              x: p3.x + Math.round(p3.width * 0.55),
              y: 0,
              width: 24,
              height
            }
          ];
          pressurePlates = [
            {
              id: `plate_met_${level}`,
              x: p2.x + Math.round(p2.width * 0.3),
              y: p2.y - 12,
              width: 90,
              height: 12,
              targetGateId: `gate_met_${level}`,
              requireLock: true
            }
          ];
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        } else if (archId === 'midair_assist') {
          const y1 = clampY(baseY + stepDy(0, 4, 0.7));
          const p1: Platform = { x: startAfterSpawnX, y: y1, width: 215 + jitter(18), height: 20 };
          const dupPart: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'duplicate' };
          const y2 = clampY(y1 + stepDy(1, 4, 0.7));
          const p2: Platform = { x: p1.x + p1.width + Math.round(72 + rng.next() * 24), y: y2, width: 220 + jitter(16), height: 20 };
          const y3 = clampY(y2 + stepDy(2, 4, 0.7));
          const p3: Platform = { x: p2.x + p2.width + Math.round(72 + rng.next() * 24), y: y3, width: 250 + jitter(18), height: 20 };
          const y4 = clampY(y3 + stepDy(3, 4, 0.7));
          const p4: Platform = { x: p3.x + p3.width + Math.round(72 + rng.next() * 24), y: y4, width: 200 + jitter(16), height: 20 };
          const plats = [p1, p2, p3, p4];
          accelerationChunk = {
            id: `chunk_arch_midair_${level}`,
            name: 'Passe Décisive',
            archetype: 'speedrun_highway',
            entry: { x: p1.x + 40, y: p1.y },
            exit: { x: p4.x + p4.width - 40, y: p4.y },
            platforms: plats,
            pathPlatforms: [...plats],
            spikes: [],
            particles: [dupPart],
            bounds: computeChunkBounds(plats, [], [dupPart])
          };
          gates = [
            {
              id: `gate_mid_${level}`,
              x: p3.x + Math.round(p3.width * 0.5),
              y: 0,
              width: 24,
              height
            }
          ];
          pressurePlates = [
            {
              id: `plate_mid_${level}`,
              x: p2.x + Math.round(p2.width * 0.3),
              y: p2.y - 12,
              width: 96,
              height: 12,
              targetGateId: `gate_mid_${level}`,
              requireLock: true,
              autoSwitchOnTrigger: true
            }
          ];
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        } else if (archId === 'pauli_trampoline') {
          const y1 = clampY(baseY + stepDy(0, 3, 0.7));
          const p1: Platform = { x: startAfterSpawnX, y: y1, width: 265 + jitter(16), height: 20 };
          const dupPart: Particle = { x: p1.x + 110, y: p1.y - 30, type: 'duplicate' };
          const pauliPart: Particle = { x: p1.x + 205, y: p1.y - 30, type: 'pauli' };
          const y2 = clampY(y1 - Math.round(20 + rng.next() * 22));
          const p2: Platform = { x: p1.x + p1.width + Math.round(525 + rng.next() * 30), y: y2, width: 255 + jitter(16), height: 20 };
          const y3 = clampY(y2 + stepDy(2, 3, 0.7));
          const p3: Platform = { x: p2.x + p2.width + Math.round(80 + rng.next() * 24), y: y3, width: 220 + jitter(16), height: 20 };
          const plats = [p1, p2, p3];
          const parts = [dupPart, pauliPart];
          accelerationChunk = {
            id: `chunk_arch_pauli_${level}`,
            name: 'Trampoline de Pauli',
            archetype: 'electron_chasm',
            entry: { x: p1.x + 40, y: p1.y },
            exit: { x: p3.x + p3.width - 40, y: p3.y },
            platforms: plats,
            pathPlatforms: [...plats],
            spikes: [],
            particles: parts,
            bounds: computeChunkBounds(plats, [], parts)
          };
          gates = [
            {
              id: `gate_pauli_${level}`,
              x: p3.x + Math.round(p3.width * 0.45),
              y: 0,
              width: 24,
              height
            }
          ];
          pressurePlates = [
            {
              id: `plate_pauli_${level}`,
              x: p2.x + Math.round(p2.width * 0.3),
              y: p2.y - 12,
              width: 90,
              height: 12,
              targetGateId: `gate_pauli_${level}`,
              requireLock: true
            }
          ];
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        } else {
          // conservation_cage: speed particle strictly required to clear the post-cage chasm (390-430px)
          const y1 = clampY(baseY + stepDy(0, 4, 0.7));
          const p1: Platform = { x: startAfterSpawnX, y: y1, width: 205 + jitter(18), height: 20 };
          const y2 = clampY(y1 + stepDy(1, 4, 0.7));
          const p2: Platform = { x: p1.x + p1.width + Math.round(70 + rng.next() * 24), y: y2, width: 205 + jitter(18), height: 20 };
          const y3 = clampY(y2 + stepDy(2, 4, 0.7));
          const p3: Platform = { x: p2.x + p2.width + Math.round(70 + rng.next() * 24), y: y3, width: 270 + jitter(18), height: 20 };
          const speedOrb: Particle = {
            x: p3.x + 85,
            y: p3.y - 30,
            type: 'speed',
            restoresEphemeral: true
          };
          const cageL: Platform = {
            x: p3.x + 140,
            y: p3.y - 130,
            width: 20,
            height: 130,
            color: '#f1c40f',
            ephemeral: true
          };
          const cageTop: Platform = {
            x: p3.x + 140,
            y: p3.y - 150,
            width: 120,
            height: 20,
            color: '#f1c40f',
            ephemeral: true
          };
          const cageR: Platform = {
            x: p3.x + 240,
            y: p3.y - 130,
            width: 20,
            height: 130,
            color: '#f1c40f',
            ephemeral: true
          };
          // 480-520px chasm strictly requiring the speed boost collected on p3
          const speedGap = Math.round(480 + rng.next() * 40);
          const p4: Platform = { x: p3.x + p3.width + speedGap, y: y3, width: 220 + jitter(16), height: 20 };
          const plats = [p1, p2, p3, cageL, cageTop, cageR, p4];
          accelerationChunk = {
            id: `chunk_arch_cage_${level}`,
            name: 'Cage de Conservation',
            archetype: 'speedrun_highway',
            entry: { x: p1.x + 40, y: p1.y },
            exit: { x: p4.x + p4.width - 40, y: p4.y },
            platforms: plats,
            pathPlatforms: [p1, p2, p3, p4],
            spikes: [],
            particles: [speedOrb],
            bounds: computeChunkBounds(plats, [], [speedOrb])
          };
          climaxChunk = buildDenseClimax(
            accelerationChunk,
            1 + accelerationChunk.pathPlatforms.length
          );
        }
      } else if (plan.primary === 'clone_fusion') {
        const y1 = clampY(baseY + stepDy(0, 4, 0.7));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 225 + jitter(18), height: 20 };
        const dup1: Particle = { x: p1.x + 85, y: p1.y - 30, type: 'duplicate' };
        const dup2: Particle = { x: p1.x + 160, y: p1.y - 30, type: 'duplicate' };
        const y2 = clampY(y1 + stepDy(1, 4, 0.7));
        const p2: Platform = { x: p1.x + p1.width + Math.round(70 + rng.next() * 24), y: y2, width: 205 + jitter(16), height: 20, cracked: true };
        const y3 = clampY(y2 + stepDy(2, 4, 0.7));
        const p3: Platform = { x: p2.x + p2.width + Math.round(70 + rng.next() * 24), y: y3, width: 215 + jitter(16), height: 20, cracked: true };
        const y4 = clampY(y3 + stepDy(3, 4, 0.7));
        const p4: Platform = { x: p3.x + p3.width + Math.round(70 + rng.next() * 24), y: y4, width: 205 + jitter(16), height: 20 };
        const plats = [p1, p2, p3, p4];
        const parts = [dup1, dup2];
        accelerationChunk = {
          id: `chunk_fusion_${level}`,
          name: 'Fusion Super-Quanta',
          archetype: 'speedrun_highway',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p4.x + p4.width - 40, y: p4.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: parts,
          bounds: computeChunkBounds(plats, [], parts)
        };
        // Full-height gate + requireLock plate makes duplicate strictly required even on Noble Gas playgrounds
        gates = [
          {
            id: `gate_fus_${level}`,
            x: p3.x + Math.round(p3.width * 0.5),
            y: 0,
            width: 24,
            height
          }
        ];
        pressurePlates = [
          {
            id: `plate_fus_${level}`,
            x: p2.x + Math.round(p2.width * 0.3),
            y: p2.y - 12,
            width: 88,
            height: 12,
            targetGateId: `gate_fus_${level}`,
            requireLock: true,
            autoSwitchOnTrigger: true
          }
        ];
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'duplicate_gate') {
        const y1 = clampY(baseY + stepDy(0, 4, 0.7));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 215 + jitter(18), height: 20 };
        const dupPart: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'duplicate' };
        const y2 = clampY(y1 + stepDy(1, 4, 0.7));
        const p2: Platform = { x: p1.x + p1.width + Math.round(70 + rng.next() * 24), y: y2, width: 215 + jitter(16), height: 20 };
        const y3 = clampY(y2 + stepDy(2, 4, 0.7));
        const p3: Platform = { x: p2.x + p2.width + Math.round(70 + rng.next() * 24), y: y3, width: 235 + jitter(18), height: 20 };
        const y4 = clampY(y3 + stepDy(3, 4, 0.7));
        const p4: Platform = { x: p3.x + p3.width + Math.round(70 + rng.next() * 24), y: y4, width: 200 + jitter(16), height: 20 };
        const plats = [p1, p2, p3, p4];
        accelerationChunk = {
          id: `chunk_dupgate_${level}`,
          name: 'Verrou de Superposition',
          archetype: 'speedrun_highway',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p4.x + p4.width - 40, y: p4.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: [dupPart],
          bounds: computeChunkBounds(plats, [], [dupPart])
        };
        gates = [
          {
            id: `gate_dup_${level}`,
            x: p3.x + Math.round(p3.width * 0.4),
            y: 0,
            width: 24,
            height
          }
        ];
        pressurePlates = [
          {
            id: `plate_dup_${level}`,
            x: p2.x + Math.round(p2.width * 0.3),
            y: p2.y - 12,
            width: 90,
            height: 12,
            targetGateId: `gate_dup_${level}`,
            requireLock: true,
            autoSwitchOnTrigger: true
          }
        ];
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'condense') {
        const y1 = clampY(baseY + stepDy(0, 3, 0.6));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 225 + jitter(18), height: 20 };
        const condensePart: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'condense' };
        // Calibrated 442-460px elevated chasms (strictly impossible without condense, smooth in 1 jump + 1 air condense)
        const gap1 = Math.round(442 + rng.next() * 18);
        const y2 = clampY(y1 - 35);
        const p2: Platform = { x: p1.x + p1.width + gap1, y: y2, width: 215 + jitter(18), height: 20 };
        const gap2 = Math.round(442 + rng.next() * 18);
        const y3 = clampY(y2 - 35);
        const p3: Platform = { x: p2.x + p2.width + gap2, y: y3, width: 215 + jitter(18), height: 20 };
        const plats = [p1, p2, p3];
        accelerationChunk = {
          id: `chunk_condense_${level}`,
          name: 'Onde de Broglie',
          archetype: 'electron_chasm',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p3.x + p3.width - 40, y: p3.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: [condensePart],
          bounds: computeChunkBounds(plats, [], [condensePart])
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'tunnel') {
        const y1 = clampY(baseY + stepDy(0, 3, 0.7));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 215 + jitter(18), height: 20 };
        const tun1: Particle = { x: p1.x + Math.round(p1.width * 0.5), y: p1.y - 30, type: 'tunnel' };
        const wall1: Platform = { x: p1.x + p1.width + 25, y: 0, width: 32, height };
        const y2 = clampY(y1 + stepDy(1, 3, 0.6));
        const p2: Platform = { x: wall1.x + wall1.width + 25, y: y2, width: 215 + jitter(18), height: 20 };
        const tun2: Particle = { x: p2.x + Math.round(p2.width * 0.5), y: p2.y - 30, type: 'tunnel' };
        const wall2: Platform = { x: p2.x + p2.width + 25, y: 0, width: 34, height };
        const y3 = clampY(y2 + stepDy(2, 3, 0.6));
        const p3: Platform = { x: wall2.x + wall2.width + 25, y: y3, width: 215 + jitter(18), height: 20 };
        const plats = [p1, wall1, p2, wall2, p3];
        const parts = [tun1, tun2];
        accelerationChunk = {
          id: `chunk_tunnel_${level}`,
          name: 'Barrière Tunnel',
          archetype: 'speedrun_highway',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p3.x + p3.width - 40, y: p3.y },
          platforms: plats,
          pathPlatforms: [p1, p2, p3],
          spikes: [],
          particles: parts,
          bounds: computeChunkBounds(plats, [], parts)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'phase') {
        // Phase platforms starting immediately in the discovery zone (crucial for Milestone L47 quantum_pinning!)
        const y1 = clampY(baseY + stepDy(0, 4, 0.7));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 175 + jitter(16), height: 20, phase: 'magenta' };
        const y2 = clampY(y1 + stepDy(1, 4, 0.7));
        const p2: Platform = { x: p1.x + p1.width + Math.round(62 + rng.next() * 24), y: y2, width: 175 + jitter(16), height: 20, phase: 'cyan' };
        const y3 = clampY(y2 + stepDy(2, 4, 0.7));
        const p3: Platform = { x: p2.x + p2.width + Math.round(62 + rng.next() * 24), y: y3, width: 175 + jitter(16), height: 20, phase: 'magenta' };
        const y4 = clampY(y3 + stepDy(3, 4, 0.7));
        const p4: Platform = { x: p3.x + p3.width + Math.round(62 + rng.next() * 24), y: y4, width: 175 + jitter(16), height: 20, phase: 'cyan' };
        const plats = [p1, p2, p3, p4];
        accelerationChunk = {
          id: `chunk_phase_${level}`,
          name: 'Chambre de Phase',
          archetype: 'superposition_chamber',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p4.x + p4.width - 40, y: p4.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: [],
          bounds: computeChunkBounds(plats)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'liquid_basin') {
        const y1 = clampY(baseY + stepDy(0, 4, 0.7));
        const p1: Platform = {
          x: startAfterSpawnX,
          y: y1,
          width: 230 + jitter(20),
          height: 55,
          matterState: 'liquid'
        };
        const y2 = clampY(y1 + stepDy(1, 4, 0.7));
        const p2: Platform = {
          x: p1.x + p1.width + Math.round(68 + rng.next() * 24),
          y: y2,
          width: 215 + jitter(18),
          height: 55,
          matterState: 'liquid'
        };
        const y3 = clampY(y2 + stepDy(2, 4, 0.7));
        const p3: Platform = { x: p2.x + p2.width + Math.round(68 + rng.next() * 24), y: y3, width: 205 + jitter(18), height: 20 };
        const y4 = clampY(y3 + stepDy(3, 4, 0.7));
        const p4: Platform = {
          x: p3.x + p3.width + Math.round(68 + rng.next() * 24),
          y: y4,
          width: 215 + jitter(18),
          height: 55,
          matterState: 'liquid'
        };
        const plats = [p1, p2, p3, p4];
        accelerationChunk = {
          id: `chunk_liquid_${level}`,
          name: 'Bassin Fluide',
          archetype: 'speedrun_highway',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p4.x + p4.width - 40, y: p4.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: [],
          bounds: computeChunkBounds(plats)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'wormhole') {
        const y1 = clampY(baseY + stepDy(0, 4, 0.6));
        const p1: Platform = { x: startAfterSpawnX, y: y1, width: 215 + jitter(18), height: 20 };
        const y2 = clampY(y1 + stepDy(1, 4, 0.6));
        const p2: Platform = { x: p1.x + p1.width + Math.round(70 + rng.next() * 24), y: y2, width: 235 + jitter(18), height: 20 };
        // Elevated platform reached via momentum-conserving wormhole
        const whRise = isEntangledDualLane ? 130 + Math.round(rng.next() * 35) : 170 + Math.round(rng.next() * 55);
        const y3 = clampY(y2 - whRise);
        const p3: Platform = { x: p2.x + p2.width + Math.round(145 + rng.next() * 40), y: y3, width: 235 + jitter(18), height: 20 };
        const y4 = clampY(y3 + stepDy(3, 4, 0.6));
        const p4: Platform = { x: p3.x + p3.width + Math.round(72 + rng.next() * 24), y: y4, width: 205 + jitter(16), height: 20 };
        const plats = [p1, p2, p3, p4];
        wormholes = [
          {
            id: `wh_main_${level}`,
            inX: p2.x + p2.width - 12,
            inY: p2.y - 44,
            inNormalAngleDeg: 0,
            outX: p3.x + 70,
            outY: p3.y - 60,
            outNormalAngleDeg: 0,
            color: elementInfo.antiHue
          }
        ];
        accelerationChunk = {
          id: `chunk_wh_${level}`,
          name: 'Trou de Ver d’Impulsion',
          archetype: 'speedrun_highway',
          entry: { x: p1.x + 40, y: p1.y },
          exit: { x: p4.x + p4.width - 40, y: p4.y },
          platforms: plats,
          pathPlatforms: [...plats],
          spikes: [],
          particles: [],
          bounds: computeChunkBounds(plats)
        };
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      } else if (plan.primary === 'wall') {
        height = isEntangledDualLane ? 1320 : 1300;
        const rawLead = createDynamicCourseChunk({
          id: `chunk_wall_lead_${level}`,
          steps: 3,
          rng,
          progress,
          allowSpikes: false,
          allowMoving: false
        });
        accelerationChunk = connectAndTranslateChunk(awakeningChunk, rawLead, levelAlpha, -15);
        const rawWell = createGravityWellChunk({
          wellWidth: 320,
          height: 440,
          steps: 2
        });
        climaxChunk = connectAndTranslateChunk(accelerationChunk, rawWell, levelAlpha, 15);
      } else {
        // Dense dynamic course fallback
        const rawD1 = createDynamicCourseChunk({
          id: `chunk_dyn_a_${level}`,
          steps: 4,
          rng,
          progress,
          allowSpikes: level > 4,
          allowMoving: level >= 15
        });
        accelerationChunk = connectAndTranslateChunk(awakeningChunk, rawD1, levelAlpha, -15);
        climaxChunk = buildDenseClimax(
          accelerationChunk,
          1 + accelerationChunk.pathPlatforms.length
        );
      }

      // --- Apply secondary mechanic enrichments from plan ---

      // Optional extra tunnel barrier at end of accelerationChunk (when primary wasn't tunnel/boss)
      if (
        plan.addTunnelBarrier &&
        plan.primary !== 'tunnel' &&
        !isSpeedTunnelBoss &&
        !isPauliBoss &&
        !isAntiGravBoss
      ) {
        const anchorPlat = accelerationChunk.pathPlatforms[0];
        if (anchorPlat) {
          accelerationChunk.particles.push({
            x: anchorPlat.x + Math.round(anchorPlat.width * 0.45),
            y: anchorPlat.y - 30,
            type: 'tunnel'
          });
          // Full-height vertical barrier on the right side of anchorPlat (strictly requires tunnel)
          accelerationChunk.platforms.push({
            x: anchorPlat.x + anchorPlat.width - 28,
            y: 0,
            width: 28,
            height
          });
        }
      }

      // Optional timeDilation particle inside discovery zone (e.g. Milestone L55 & Period 6/7)
      if (plan.addTimeDilation && !isSpeedTunnelBoss) {
        const firstPlat = accelerationChunk.pathPlatforms[0] ?? awakeningChunk.pathPlatforms[0];
        if (firstPlat) {
          accelerationChunk.particles.push({
            x: Math.min(firstPlat.x + Math.round(firstPlat.width * 0.35), 560),
            y: firstPlat.y - 30,
            type: 'timeDilation'
          });
        }
      }

      // Optional duplicate particle + mandatory requireLock gate/plate (never sprinkle useless duplicate!)
      if (
        plan.addDuplicate &&
        !accelerationChunk.particles.some((p) => p.type === 'duplicate')
      ) {
        const firstPlat = accelerationChunk.pathPlatforms[0];
        if (firstPlat) {
          accelerationChunk.particles.push({
            x: firstPlat.x + Math.round(firstPlat.width * 0.65),
            y: firstPlat.y - 30,
            type: 'duplicate'
          });
        }
      }

      // Gate + pressure plate whenever plan.addGatePlate OR plan.addDuplicate without an existing gate
      const needsDuplicateGate =
        (plan.addGatePlate ||
          (plan.addDuplicate && accelerationChunk.particles.some((p) => p.type === 'duplicate'))) &&
        !gates &&
        accelerationChunk.pathPlatforms.length >= 3;
      if (needsDuplicateGate) {
        const platePlat = accelerationChunk.pathPlatforms[1];
        const gatePlat = accelerationChunk.pathPlatforms[2];
        const hasDupBeforeOrOnPlate = accelerationChunk.particles.some(
          (p) => p.type === 'duplicate' && p.x <= platePlat.x + platePlat.width
        );
        gates = [
          {
            id: `gate_sec_${level}`,
            x: gatePlat.x + Math.round(gatePlat.width * 0.5),
            y: 0,
            width: 24,
            height
          }
        ];
        pressurePlates = [
          {
            id: `plate_sec_${level}`,
            x: platePlat.x + Math.round(platePlat.width * 0.3),
            y: platePlat.y - 12,
            width: 86,
            height: 12,
            targetGateId: `gate_sec_${level}`,
            requireLock: hasDupBeforeOrOnPlate,
            autoSwitchOnTrigger: true
          }
        ];
      }

      // Optional wormhole (when not already created by primary === 'wormhole')
      if (plan.addWormhole && !wormholes) {
        const srcPlat = climaxChunk.pathPlatforms[0] ?? accelerationChunk.pathPlatforms[0];
        const dstPlat =
          climaxChunk.pathPlatforms[1] ??
          accelerationChunk.pathPlatforms[accelerationChunk.pathPlatforms.length - 1];
        if (srcPlat && dstPlat && srcPlat !== dstPlat) {
          wormholes = [
            {
              id: `wh_sec_${level}`,
              inX: srcPlat.x + Math.round(srcPlat.width * 0.75),
              inY: srcPlat.y - 80,
              inNormalAngleDeg: 0,
              outX: dstPlat.x + Math.round(dstPlat.width * 0.5),
              outY: dstPlat.y - 70,
              outNormalAngleDeg: 0,
              color: elementInfo.antiHue
            }
          ];
        }
      }

      // Optional matterState enrichment (liquid, cryo, plasma, gas) — strictly on main path!
      let plasmaLaunchBeforeRes = false;
      if (plan.matterState) {
        const ms = plan.matterState;
        if (ms === 'gas') {
          const refPlat = accelerationChunk.pathPlatforms[1] ?? accelerationChunk.pathPlatforms[0];
          if (refPlat) {
            accelerationChunk.platforms.push({
              x: refPlat.x + refPlat.width + 6,
              y: refPlat.y - 110,
              width: 72,
              height: 160,
              matterState: 'gas'
            });
          }
        } else {
          const allParticlesSoFar = [...accelerationChunk.particles, ...climaxChunk.particles];
          const allPathPlats = [...accelerationChunk.pathPlatforms, ...climaxChunk.pathPlatforms];
          const candidates = allPathPlats.filter((p, idx) => {
            if (p.phase || p.kind === 'wall' || p.ephemeral || p.matterState) return false;
            if (ms === 'plasma') {
              if (idx === allPathPlats.length - 1) return false;
              const nextPlat = allPathPlats[idx + 1];
              if (!nextPlat || nextPlat.phase || (nextPlat.decayMs ?? 0) > 0) return false;
              const gapToNext = nextPlat.x - (p.x + p.width);
              if (gapToNext > 190) return false;
              const hasPickup = allParticlesSoFar.some(
                (pt) => pt.x >= p.x - 10 && pt.x <= p.x + p.width + 10
              );
              const hasPlate = (pressurePlates ?? []).some(
                (pl) => pl.x >= p.x - 10 && pl.x <= p.x + p.width + 10
              );
              if (hasPickup || hasPlate) return false;
            }
            return true;
          });
          if (candidates.length === 0 && ms === 'plasma') {
            // Insert a real on-path plasma trampoline right before resolutionChunk
            const lastClimax = climaxChunk.pathPlatforms[climaxChunk.pathPlatforms.length - 1];
            if (lastClimax) {
              const springboard: Platform = {
                x: lastClimax.x + lastClimax.width + 85,
                y: clampY(lastClimax.y - 10),
                width: 145,
                height: 20,
                matterState: 'plasma'
              };
              climaxChunk.platforms.push(springboard);
              climaxChunk.pathPlatforms.push(springboard);
              climaxChunk.exit = { x: springboard.x + springboard.width - 40, y: springboard.y };
              plasmaLaunchBeforeRes = true;
            }
          } else {
            const tagCount = Math.min(2, candidates.length);
            for (let i = 0; i < tagCount; i++) {
              const target = candidates[i];
              target.matterState = ms;
              if (ms === 'liquid' && target.height < 48) {
                target.height = 50;
              }
            }
          }
        }
      }

      const rawRes = createResolutionChunk({ width: 260 });
      resolutionChunk = connectAndTranslateChunk(
        climaxChunk,
        rawRes,
        levelAlpha,
        plasmaLaunchBeforeRes ? -75 : -15
      );
      width = Math.max(2200, Math.round(resolutionChunk.exit.x + 280));

      // Wire Entanglement configuration (mirror geometry & exact Beta spawns/doors built below)
      if (plan.entanglement) {
        const ent = plan.entanglement;
        const safeMaxX = Math.floor(width * 0.32);
        const portalMode = ent.portalMode ?? 'dual';
        entanglementConfig = {
          mode: ent.mode,
          portalMode,
          ...(ent.allowHeroCollision ? { allowHeroCollision: true } : {}),
          ...(ent.revealInSafeZone ? { revealAtX: safeMaxX } : {}),
          ...(ent.tetherPhysical ? { tetherPhysical: true, tetherMaxLength: 540 } : {})
        };
      }
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

  // --- Entanglement Mirror Geometry Builder (guarantees real Alpha + Beta dual playability) ---
  if (entanglementConfig) {
    const mode = entanglementConfig.mode;
    const isSinglePortal = entanglementConfig.portalMode === 'single';
    const origHeight = height;
    const isTunnelWall = (p: Platform) =>
      p.width <= 80 && p.height >= 400 && p.kind !== 'wall';
    const isBottomPitSpike = (s: Spike) => s.y >= origHeight - 25 && (s.width ?? 0) >= width * 0.5;
    const isWidePitSpike = (s: Spike) => isBottomPitSpike(s) || (s.width ?? 32) >= 160;

    const applyVerticalShift = (shiftDown: number) => {
      if (shiftDown <= 0) return;
      const shifted = new Set<Platform>();
      for (const p of [...allPlatforms, ...fullPlatformPath]) {
        if (shifted.has(p) || isTunnelWall(p)) continue;
        shifted.add(p);
        p.y += shiftDown;
        if (p.movesTo?.y !== undefined) p.movesTo.y += shiftDown;
      }
      for (const pt of allParticles) pt.y += shiftDown;
      for (const s of allSpikes) {
        if (!isBottomPitSpike(s)) s.y += shiftDown;
      }
      if (pressurePlates) {
        for (const pl of pressurePlates) pl.y += shiftDown;
      }
      if (wormholes) {
        for (const wh of wormholes) {
          wh.inY += shiftDown;
          wh.outY += shiftDown;
        }
      }
      player.position.y += shiftDown;
      door.y += shiftDown;
    };

    if (mode === 'mirror_x' && isSinglePortal) {
      // Single center portal: Alpha runs left -> center, Beta runs right -> center
      const centerX = door.x;
      width = Math.max(2200, Math.round(centerX * 2));
      for (const s of allSpikes) {
        if (isBottomPitSpike(s)) {
          s.width = width;
        }
      }
      const doorPlat = fullPlatformPath[fullPlatformPath.length - 1];
      const doorPlatInAll = allPlatforms.find(
        (p) => doorPlat && p.x === doorPlat.x && p.y === doorPlat.y && p.width === doorPlat.width
      );
      if (doorPlat) {
        const halfSpan = Math.max(130, centerX - doorPlat.x);
        const newX = Math.round(centerX - halfSpan);
        const newW = Math.round(halfSpan * 2);
        doorPlat.x = newX;
        doorPlat.width = newW;
        if (doorPlatInAll && doorPlatInAll !== doorPlat) {
          doorPlatInAll.x = newX;
          doorPlatInAll.width = newW;
        }
      }
      const alphaPlats = [...allPlatforms];
      for (const p of alphaPlats) {
        if (p === doorPlat || p === doorPlatInAll) continue;
        const mirroredX = Math.round(width - p.x - p.width);
        const mirrored: Platform = { ...p, x: mirroredX };
        if (p.movesTo) {
          mirrored.movesTo = {
            ...(p.movesTo.x !== undefined ? { x: Math.round(mirroredX - (p.movesTo.x - p.x)) } : {}),
            ...(p.movesTo.y !== undefined ? { y: p.movesTo.y } : {}),
            ...(p.movesTo.time !== undefined ? { time: p.movesTo.time } : {})
          };
        }
        allPlatforms.push(mirrored);
      }
      const alphaParts = [...allParticles];
      for (const pt of alphaParts) {
        allParticles.push({ ...pt, x: Math.round(width - pt.x) });
      }
      if (wormholes) {
        const alphaWhs = [...wormholes];
        for (const wh of alphaWhs) {
          wormholes.push({
            ...wh,
            id: `${wh.id}_beta`,
            inX: Math.round(width - wh.inX),
            outX: Math.round(width - wh.outX),
            inNormalAngleDeg: (180 - wh.inNormalAngleDeg + 360) % 360,
            outNormalAngleDeg: (180 - wh.outNormalAngleDeg + 360) % 360
          });
        }
      }
      const alphaSpikes = allSpikes.filter((s) => !isWidePitSpike(s));
      for (const s of alphaSpikes) {
        allSpikes.push({ ...s, x: Math.round(width - s.x - (s.width ?? 32)) });
      }
      entanglementConfig = {
        ...entanglementConfig,
        betaSpawn: {
          x: Math.round(width - player.position.x),
          y: player.position.y
        },
        portalMode: 'single'
      };
      delete entanglementConfig.betaDoor;
    } else if (mode === 'mirror_x') {
      // Dual-lane horizontal mirror: Alpha in lower half (y >= 700), Beta in upper half (y' = y - laneShift)
      const walkableAlpha = allPlatforms.filter((p) => !isTunnelWall(p));
      const minAlphaY = Math.min(...walkableAlpha.map((p) => p.y));
      applyVerticalShift(minAlphaY < 700 ? Math.round(700 - minAlphaY) : 0);

      const maxAlphaY = Math.max(...walkableAlpha.map((p) => p.y + p.height));
      const minAlphaAfter = Math.min(...walkableAlpha.map((p) => p.y));
      const laneShift = Math.max(460, Math.min(540, minAlphaAfter - 200));
      const maxBetaY = maxAlphaY - laneShift;
      height = Math.max(1320, maxAlphaY + 180);
      const splitY = Math.round((maxBetaY + minAlphaAfter) / 2);

      for (const s of allSpikes) {
        if (isBottomPitSpike(s)) {
          s.y = height - 15;
          s.width = width;
        }
      }
      if (gates) {
        for (const g of gates) {
          g.y = splitY;
          g.height = height - splitY;
        }
      }

      const alphaPlats = [...allPlatforms];
      for (const p of alphaPlats) {
        if (isTunnelWall(p)) {
          p.y = splitY;
          p.height = height - splitY;
          allPlatforms.push({
            ...p,
            x: Math.round(width - p.x - p.width),
            y: 0,
            height: splitY
          });
          continue;
        }
        const mirroredX = Math.round(width - p.x - p.width);
        const mirroredY = Math.round(p.y - laneShift);
        const mirrored: Platform = { ...p, x: mirroredX, y: mirroredY };
        if (p.movesTo) {
          mirrored.movesTo = {
            ...(p.movesTo.x !== undefined ? { x: Math.round(mirroredX - (p.movesTo.x - p.x)) } : {}),
            ...(p.movesTo.y !== undefined ? { y: Math.round(p.movesTo.y - laneShift) } : {}),
            ...(p.movesTo.time !== undefined ? { time: p.movesTo.time } : {})
          };
        }
        allPlatforms.push(mirrored);
      }

      const alphaParts = [...allParticles];
      for (const pt of alphaParts) {
        allParticles.push({
          ...pt,
          x: Math.round(width - pt.x),
          y: Math.round(pt.y - laneShift)
        });
      }
      if (wormholes) {
        const alphaWhs = [...wormholes];
        for (const wh of alphaWhs) {
          wormholes.push({
            ...wh,
            id: `${wh.id}_beta`,
            inX: Math.round(width - wh.inX),
            inY: Math.round(wh.inY - laneShift),
            outX: Math.round(width - wh.outX),
            outY: Math.round(wh.outY - laneShift),
            inNormalAngleDeg: (180 - wh.inNormalAngleDeg + 360) % 360,
            outNormalAngleDeg: (180 - wh.outNormalAngleDeg + 360) % 360
          });
        }
      }
      const alphaSpikes = allSpikes.filter((s) => !isWidePitSpike(s));
      for (const s of alphaSpikes) {
        allSpikes.push({
          ...s,
          x: Math.round(width - s.x - (s.width ?? 32)),
          y: Math.round(s.y - laneShift)
        });
      }

      entanglementConfig = {
        ...entanglementConfig,
        betaSpawn: {
          x: Math.round(width - player.position.x),
          y: Math.round(player.position.y - laneShift)
        },
        portalMode: 'dual',
        betaDoor: {
          x: Math.round(width - door.x),
          y: Math.round(door.y - laneShift)
        }
      };

      if (entanglementConfig.tetherPhysical) {
        const safeMaxX = Math.floor(width * 0.32);
        tetherPylons = [
          { x: Math.min(640, safeMaxX), y: splitY - 10, radius: 18, maxLength: 540 },
          { x: Math.round(width * 0.52), y: splitY - 10, radius: 18, maxLength: 540 },
          { x: Math.round(width * 0.78), y: splitY - 10, radius: 18, maxLength: 540 }
        ];
      }
    } else if (mode === 'inverted_gravity') {
      // Exact vertical ceiling mirror: y' = height - y - h
      const walkableAlpha = allPlatforms.filter((p) => !isTunnelWall(p));
      const hasPlasma = walkableAlpha.some((p) => p.matterState === 'plasma');
      const minTarget = hasPlasma ? 880 : 720;
      const minAlphaY = Math.min(...walkableAlpha.map((p) => p.y));
      applyVerticalShift(minAlphaY < minTarget ? Math.round(minTarget - minAlphaY) : 0);
      const maxAlphaY = Math.max(...walkableAlpha.map((p) => p.y + p.height));
      height = Math.max(hasPlasma ? 1440 : 1320, maxAlphaY + 140);
      const splitY = Math.round(height / 2);
      for (const s of allSpikes) {
        if (isBottomPitSpike(s)) {
          s.y = height - 15;
          s.width = width;
        }
      }
      if (gates) {
        for (const g of gates) {
          g.y = splitY;
          g.height = height - splitY;
        }
      }

      const alphaPlats = [...allPlatforms];
      for (const p of alphaPlats) {
        if (isTunnelWall(p)) {
          p.y = splitY;
          p.height = height - splitY;
          allPlatforms.push({ ...p, y: 0, height: splitY });
          continue;
        }
        const mirroredY = Math.round(height - p.y - p.height);
        const mirrored: Platform = { ...p, y: mirroredY };
        if (p.movesTo) {
          mirrored.movesTo = {
            ...(p.movesTo.x !== undefined ? { x: p.movesTo.x } : {}),
            ...(p.movesTo.y !== undefined ? { y: Math.round(mirroredY - (p.movesTo.y - p.y)) } : {}),
            ...(p.movesTo.time !== undefined ? { time: p.movesTo.time } : {})
          };
        }
        allPlatforms.push(mirrored);
      }

      const alphaParts = [...allParticles];
      for (const pt of alphaParts) {
        allParticles.push({ ...pt, y: Math.round(height - pt.y) });
      }
      if (wormholes) {
        const alphaWhs = [...wormholes];
        for (const wh of alphaWhs) {
          wormholes.push({
            ...wh,
            id: `${wh.id}_beta`,
            inY: Math.round(height - wh.inY),
            outY: Math.round(height - wh.outY),
            inNormalAngleDeg: (-wh.inNormalAngleDeg + 360) % 360,
            outNormalAngleDeg: (-wh.outNormalAngleDeg + 360) % 360
          });
        }
      }
      const alphaSpikes = allSpikes.filter((s) => !isWidePitSpike(s));
      for (const s of alphaSpikes) {
        allSpikes.push({ ...s, y: Math.round(height - s.y - (s.height ?? 32)) });
      }

      entanglementConfig = {
        ...entanglementConfig,
        betaSpawn: {
          x: player.position.x,
          y: Math.round(height - player.position.y)
        },
        portalMode: 'dual',
        betaDoor: {
          x: door.x,
          y: Math.round(height - door.y)
        }
      };
    } else {
      // mirror_and_gravity: exact double symmetry (x' = width - x - w, y' = height - y - h)
      const walkableAlpha = allPlatforms.filter((p) => !isTunnelWall(p));
      const minAlphaY = Math.min(...walkableAlpha.map((p) => p.y));
      const shiftForClearance = minAlphaY < 780 ? Math.round(780 - minAlphaY) : 0;
      const shiftForBetaTop = player.position.y < 880 ? Math.round(880 - player.position.y) : 0;
      applyVerticalShift(Math.max(shiftForClearance, shiftForBetaTop));
      const maxAlphaY = Math.max(...walkableAlpha.map((p) => p.y + p.height));
      height = Math.max(1320, maxAlphaY + 140);
      const splitY = Math.round(height / 2);

      for (const s of allSpikes) {
        if (isBottomPitSpike(s)) {
          s.y = height - 15;
          s.width = width;
        }
      }
      if (gates) {
        for (const g of gates) {
          g.y = splitY;
          g.height = height - splitY;
        }
      }

      const alphaPlats = [...allPlatforms];
      for (const p of alphaPlats) {
        if (isTunnelWall(p)) {
          p.y = splitY;
          p.height = height - splitY;
          allPlatforms.push({
            ...p,
            x: Math.round(width - p.x - p.width),
            y: 0,
            height: splitY
          });
          continue;
        }
        const mirroredX = Math.round(width - p.x - p.width);
        const mirroredY = Math.round(height - p.y - p.height);
        const mirrored: Platform = { ...p, x: mirroredX, y: mirroredY };
        if (p.movesTo) {
          mirrored.movesTo = {
            ...(p.movesTo.x !== undefined ? { x: Math.round(mirroredX - (p.movesTo.x - p.x)) } : {}),
            ...(p.movesTo.y !== undefined ? { y: Math.round(mirroredY - (p.movesTo.y - p.y)) } : {}),
            ...(p.movesTo.time !== undefined ? { time: p.movesTo.time } : {})
          };
        }
        allPlatforms.push(mirrored);
      }

      const alphaParts = [...allParticles];
      for (const pt of alphaParts) {
        allParticles.push({
          ...pt,
          x: Math.round(width - pt.x),
          y: Math.round(height - pt.y)
        });
      }
      if (wormholes) {
        const alphaWhs = [...wormholes];
        for (const wh of alphaWhs) {
          wormholes.push({
            ...wh,
            id: `${wh.id}_beta`,
            inX: Math.round(width - wh.inX),
            inY: Math.round(height - wh.inY),
            outX: Math.round(width - wh.outX),
            outY: Math.round(height - wh.outY),
            inNormalAngleDeg: (180 + wh.inNormalAngleDeg) % 360,
            outNormalAngleDeg: (180 + wh.outNormalAngleDeg) % 360
          });
        }
      }
      const alphaSpikes = allSpikes.filter((s) => !isWidePitSpike(s));
      for (const s of alphaSpikes) {
        allSpikes.push({
          ...s,
          x: Math.round(width - s.x - (s.width ?? 32)),
          y: Math.round(height - s.y - (s.height ?? 32))
        });
      }

      entanglementConfig = {
        ...entanglementConfig,
        betaSpawn: {
          x: Math.round(width - player.position.x),
          y: Math.round(height - player.position.y)
        },
        portalMode: 'dual',
        betaDoor: {
          x: Math.round(width - door.x),
          y: Math.round(height - door.y)
        }
      };
    }
  }

  const baseLevelData: LevelData = {
    id: String(level),
    symbol: elementInfo.symbol,
    atom: elementInfo.name,
    ...(archetype ? { archetype } : {}),
    uncertainty: level === 14 ? 4 : level,
    width,
    height,
    hue: elementInfo.hue,
    antiHue: elementInfo.antiHue,
    explanations: narrative,
    ...(screenWrap ? { screenWrap } : {}),
    ...(allowCloneFusion ? { allowCloneFusion } : {}),
    player,
    spikes: allSpikes,
    particles: allParticles,
    platforms: allPlatforms,
    gates,
    pressurePlates,
    entanglement: entanglementConfig,
    tetherPylons,
    ...(wormholes ? { wormholes } : {}),
    door,
    collapse: collapseConfig,
    meta: {
      seed,
      generatorVersion: '2.0.0'
    }
  };

  const directedLevelData = applyCampaignDirectives(baseLevelData, level);

  const world = {
    width: directedLevelData.width,
    height: directedLevelData.height,
    gravityY: PHYSICS.GRAVITY_Y,
    platforms: directedLevelData.platforms,
    spikes: directedLevelData.spikes,
    particles: directedLevelData.particles,
    bounceWalls: true,
    gates: directedLevelData.gates,
    pressurePlates: directedLevelData.pressurePlates,
    entanglement: directedLevelData.entanglement,
    tetherPylons: directedLevelData.tetherPylons,
    wormholes: directedLevelData.wormholes,
    screenWrap: directedLevelData.screenWrap,
    collapse: directedLevelData.collapse
  };

  const simulation = simulateFullLevel(
    world,
    directedLevelData.player.position,
    directedLevelData.door,
    fullPlatformPath
  );

  const levelData: LevelData = {
    ...directedLevelData,
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
