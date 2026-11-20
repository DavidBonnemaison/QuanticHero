#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SECRET_MOLECULES } from '../src/data/molecules';
import { listSmartArchetypes } from '../src/generator/archetypes';
import {
  MILESTONE_LEVEL_NUMBERS,
  NOBLE_GAS_LEVELS,
  getPeriodForLevel,
  isMilestoneLevel,
  isNobleGasLevel
} from '../src/generator/campaignDirector';
import {
  simulateLevelData,
  validateAuthorGhost,
  validateGhostNoWallPenetration
} from '../src/generator/simulator';
import type { LevelData } from '../src/types';

export interface CampaignQuotaCounts {
  duplicate: number;
  phase: number;
  matterState: number;
  tunnel: number;
  condense: number;
  wormholes: number;
  entanglement: number;
  tetherPhysical: number;
  gatesAndPlates: number;
  smartArchetypeLevels: number;
  period2DupOrPhase: number;
  maxWidth: number;
  over5500Count: number;
}

export const SPEC02_QUOTAS = {
  duplicate: 25,
  phase: 30,
  matterState: 30,
  tunnel: 20,
  condense: 12,
  wormholes: 15,
  entanglement: 18,
  tetherPhysical: 6,
  gatesAndPlates: 15,
  smartArchetypeLevels: 24,
  period2MinRatio: 0.6,
  maxAllowedWidth: 5500
} as const;

export interface VerificationReport {
  campaignCount: number;
  moleculeCount: number;
  nobleGasCount: number;
  milestoneCount: number;
  smartArchetypesFound: number;
  parJumpsCount: number;
  quotas: CampaignQuotaCounts;
  errors: string[];
}

export function verifyAllLevels(): VerificationReport {
  const errors: string[] = [];
  const dataDir = path.resolve(process.cwd(), 'src/data');
  let campaignCount = 0;
  let nobleGasCount = 0;
  let milestoneCount = 0;
  let parJumpsCount = 0;
  const seenArchetypes = new Set<string>();

  const quotas: CampaignQuotaCounts = {
    duplicate: 0,
    phase: 0,
    matterState: 0,
    tunnel: 0,
    condense: 0,
    wormholes: 0,
    entanglement: 0,
    tetherPhysical: 0,
    gatesAndPlates: 0,
    smartArchetypeLevels: 0,
    period2DupOrPhase: 0,
    maxWidth: 0,
    over5500Count: 0
  };

  const metadataPath = path.join(dataDir, 'levelMetadata.json');
  const metadata = fs.existsSync(metadataPath)
    ? (JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as Record<string, { parJumps?: number }>)
    : {};

  // 1. Validate all 118 campaign levels
  for (let z = 1; z <= 118; z++) {
    const filePath = path.join(dataDir, `level${z}.json`);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing campaign level file: level${z}.json`);
      continue;
    }

    const levelData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LevelData;
    campaignCount++;

    if (!levelData.platforms || levelData.platforms.length === 0) {
      errors.push(`Level ${z}: has no platforms`);
    }
    if (levelData.width <= 0 || levelData.height <= 0) {
      errors.push(`Level ${z}: invalid dimensions ${levelData.width}x${levelData.height}`);
    }
    if (levelData.width > quotas.maxWidth) {
      quotas.maxWidth = levelData.width;
    }
    if (levelData.width > SPEC02_QUOTAS.maxAllowedWidth) {
      quotas.over5500Count++;
      errors.push(
        `Level ${z}: width ${levelData.width}px exceeds Spec-02 max (${SPEC02_QUOTAS.maxAllowedWidth}px)`
      );
    }

    // Track Spec-02 mechanic quotas
    const hasDup = (levelData.particles ?? []).some((p) => p.type === 'duplicate');
    const hasPhase = levelData.platforms.some((p) => p.phase === 'cyan' || p.phase === 'magenta');
    const hasMatter = levelData.platforms.some((p) => p.matterState && p.matterState !== 'solid');
    const hasTunnel = (levelData.particles ?? []).some((p) => p.type === 'tunnel');
    const hasCondense = (levelData.particles ?? []).some((p) => p.type === 'condense');
    const hasWormholes = (levelData.wormholes?.length ?? 0) > 0;
    const hasEntanglement = Boolean(levelData.entanglement);
    const hasTether = Boolean(levelData.entanglement?.tetherPhysical);
    const hasGatesPlates =
      (levelData.gates?.length ?? 0) > 0 && (levelData.pressurePlates?.length ?? 0) > 0;

    if (hasDup) quotas.duplicate++;
    if (hasPhase) quotas.phase++;
    if (hasMatter) quotas.matterState++;
    if (hasTunnel) quotas.tunnel++;
    if (hasCondense) quotas.condense++;
    if (hasWormholes) quotas.wormholes++;
    if (hasEntanglement) quotas.entanglement++;
    if (hasTether) quotas.tetherPhysical++;
    if (hasGatesPlates) quotas.gatesAndPlates++;
    if (z >= 3 && z <= 10 && (hasDup || hasPhase)) quotas.period2DupOrPhase++;

    if (levelData.meta && 'path' in levelData.meta && levelData.meta.path !== undefined) {
      errors.push(`Level ${z}: meta.path must not be present`);
    }

    if (typeof levelData.parJumps !== 'number' || levelData.parJumps < 1) {
      errors.push(`Level ${z}: missing or invalid parJumps`);
    } else {
      parJumpsCount++;
      const metaEntry = metadata[`level${z}`];
      if (!metaEntry || metaEntry.parJumps !== levelData.parJumps) {
        errors.push(`Level ${z}: levelMetadata.json parJumps mismatch`);
      }
    }

    if (levelData.archetype) {
      seenArchetypes.add(levelData.archetype);
      quotas.smartArchetypeLevels++;
    }

    const expectedPeriod = getPeriodForLevel(z).period;
    if (levelData.period !== expectedPeriod) {
      errors.push(`Level ${z}: expected period ${expectedPeriod}, got ${levelData.period}`);
    }

    const ghostCheck = validateAuthorGhost(levelData);
    if (!ghostCheck.valid) {
      errors.push(`Level ${z}: invalid authorGhost (${ghostCheck.reason})`);
    }

    if (isNobleGasLevel(z)) {
      nobleGasCount++;
      if (!levelData.noblePlayground) {
        errors.push(`Noble Gas Level ${z}: missing noblePlayground: true`);
      }
      if ((levelData.spikes?.length ?? 0) !== 0) {
        errors.push(
          `Noble Gas Level ${z}: expected spikes.length === 0, got ${levelData.spikes.length}`
        );
      }
    }

    if (isMilestoneLevel(z)) {
      milestoneCount++;
      if (!levelData.discoveryBox?.enabled) {
        errors.push(`Milestone Level ${z}: missing discoveryBox.enabled === true`);
      } else if (levelData.discoveryBox.hintSteps.length !== 2) {
        errors.push(`Milestone Level ${z}: discoveryBox.hintSteps must have 2 steps`);
      }
      const safeMaxX = levelData.width * (levelData.discoveryBox?.safeZoneRatio ?? 0.35);
      const unsafeSpike = (levelData.spikes ?? []).find((s) => s.x < safeMaxX);
      if (unsafeSpike) {
        errors.push(
          `Milestone Level ${z}: spike at x=${unsafeSpike.x} intrudes on Safe Discovery Zone (< ${Math.round(safeMaxX)})`
        );
      }
    }

    // v3 Milestone & Set-piece checks
    if (z === 6) {
      const hasCracked = levelData.platforms.some((p) => p.cracked === true);
      if (!hasDup || !hasCracked) {
        errors.push('Level 6 (C): missing Super-Quanta duplicate particle or cracked platform');
      }
    }
    if (z === 18 && levelData.screenWrap !== 'both') {
      errors.push(`Level 18 (Ar): expected screenWrap === 'both', got ${levelData.screenWrap}`);
    }
    if ((z === 19 || z === 110) && levelData.entanglement?.revealAtX === undefined) {
      errors.push(`Level ${z}: missing entanglement.revealAtX (WOW #1)`);
    }
    if ((z === 35 || z === 80) && !levelData.platforms.some((p) => p.matterState === 'liquid')) {
      errors.push(`Level ${z}: missing matterState: 'liquid' basin`);
    }
    if (z === 36) {
      if (
        !levelData.entanglement?.tetherPhysical ||
        (levelData.tetherPylons?.length ?? 0) === 0 ||
        !levelData.platforms.some((p) => p.matterState === 'liquid')
      ) {
        errors.push('Level 36 (Kr): missing tetherPhysical, tetherPylons, or liquid platform');
      }
    }
    if (z === 40) {
      if (
        levelData.archetype !== 'living_floor' ||
        levelData.entanglement?.mode !== 'inverted_gravity' ||
        levelData.entanglement?.allowHeroCollision !== true
      ) {
        errors.push('Level 40 (Zr): missing living_floor archetype or inverted_gravity collision');
      }
    }
    if (z === 55 || z === 79 || z === 86) {
      if ((levelData.wormholes?.length ?? 0) === 0) {
        errors.push(`Level ${z}: missing wormholes`);
      }
      if (z === 86 && levelData.screenWrap !== 'horizontal') {
        errors.push(`Level 86 (Rn): expected screenWrap === 'horizontal'`);
      }
    }
  }

  const requiredArchetypes = listSmartArchetypes();
  const smartArchetypesFound = requiredArchetypes.filter((a) => seenArchetypes.has(a)).length;
  for (const arch of requiredArchetypes) {
    if (!seenArchetypes.has(arch)) {
      errors.push(`Missing Smart Archetype in campaign: ${arch}`);
    }
  }

  // Enforce Spec-02 global mechanic quotas
  if (quotas.duplicate < SPEC02_QUOTAS.duplicate) {
    errors.push(`Spec-02 quota failed: duplicate=${quotas.duplicate} < ${SPEC02_QUOTAS.duplicate}`);
  }
  if (quotas.phase < SPEC02_QUOTAS.phase) {
    errors.push(`Spec-02 quota failed: phase=${quotas.phase} < ${SPEC02_QUOTAS.phase}`);
  }
  if (quotas.matterState < SPEC02_QUOTAS.matterState) {
    errors.push(
      `Spec-02 quota failed: matterState=${quotas.matterState} < ${SPEC02_QUOTAS.matterState}`
    );
  }
  if (quotas.tunnel < SPEC02_QUOTAS.tunnel) {
    errors.push(`Spec-02 quota failed: tunnel=${quotas.tunnel} < ${SPEC02_QUOTAS.tunnel}`);
  }
  if (quotas.condense < SPEC02_QUOTAS.condense) {
    errors.push(`Spec-02 quota failed: condense=${quotas.condense} < ${SPEC02_QUOTAS.condense}`);
  }
  if (quotas.wormholes < SPEC02_QUOTAS.wormholes) {
    errors.push(`Spec-02 quota failed: wormholes=${quotas.wormholes} < ${SPEC02_QUOTAS.wormholes}`);
  }
  if (quotas.entanglement < SPEC02_QUOTAS.entanglement) {
    errors.push(
      `Spec-02 quota failed: entanglement=${quotas.entanglement} < ${SPEC02_QUOTAS.entanglement}`
    );
  }
  if (quotas.tetherPhysical < SPEC02_QUOTAS.tetherPhysical) {
    errors.push(
      `Spec-02 quota failed: tetherPhysical=${quotas.tetherPhysical} < ${SPEC02_QUOTAS.tetherPhysical}`
    );
  }
  if (quotas.gatesAndPlates < SPEC02_QUOTAS.gatesAndPlates) {
    errors.push(
      `Spec-02 quota failed: gatesAndPlates=${quotas.gatesAndPlates} < ${SPEC02_QUOTAS.gatesAndPlates}`
    );
  }
  if (quotas.smartArchetypeLevels < SPEC02_QUOTAS.smartArchetypeLevels) {
    errors.push(
      `Spec-02 quota failed: smartArchetypeLevels=${quotas.smartArchetypeLevels} < ${SPEC02_QUOTAS.smartArchetypeLevels}`
    );
  }
  if (quotas.period2DupOrPhase / 8 < SPEC02_QUOTAS.period2MinRatio) {
    errors.push(
      `Spec-02 Period 2 density failed: ${quotas.period2DupOrPhase}/8 < ${SPEC02_QUOTAS.period2MinRatio * 100}%`
    );
  }

  // 2. Validate all 12 Secret Molecular levels (real simulated ghosts, zero wall penetration)
  let moleculeCount = 0;
  for (const mol of SECRET_MOLECULES) {
    moleculeCount++;
    const data = mol.levelData;
    if (!data.platforms || data.platforms.length === 0) {
      errors.push(`Molecule ${mol.id}: has no platforms`);
    }
    const ghostCheck = validateAuthorGhost(data);
    if (!ghostCheck.valid) {
      errors.push(`Molecule ${mol.id}: invalid authorGhost (${ghostCheck.reason})`);
    }
    const wallCheck = validateGhostNoWallPenetration(data);
    if (!wallCheck.valid) {
      errors.push(`Molecule ${mol.id}: ghost wall penetration (${wallCheck.reason})`);
    }
    const sim = simulateLevelData(data);
    if (!sim.success) {
      errors.push(`Molecule ${mol.id}: failed real physics simulation (${sim.failureReason})`);
    }
  }

  return {
    campaignCount,
    moleculeCount,
    nobleGasCount,
    milestoneCount,
    smartArchetypesFound,
    parJumpsCount,
    quotas,
    errors
  };
}

function main() {
  console.log('===============================================================');
  console.log(' QuanticHero - End-to-End 118 Campaign + 12 Molecules Verifier');
  console.log('===============================================================');

  const report = verifyAllLevels();
  const q = report.quotas;
  console.log(`Campaign Levels Verified : ${report.campaignCount}/118`);
  console.log(`Noble Gas Playgrounds    : ${report.nobleGasCount}/${NOBLE_GAS_LEVELS.length}`);
  console.log(
    `Milestone Discovery Boxes: ${report.milestoneCount}/${MILESTONE_LEVEL_NUMBERS.length}`
  );
  console.log(`Smart Archetypes Wired   : ${report.smartArchetypesFound}/6 (${q.smartArchetypeLevels} levels >= ${SPEC02_QUOTAS.smartArchetypeLevels})`);
  console.log(`parJumps Configured      : ${report.parJumpsCount}/118`);
  console.log(`Secret Molecules Verified: ${report.moleculeCount}/12 (100% real simulated ghosts)`);
  console.log('---------------------------------------------------------------');
  console.log(' Spec-02 Mechanic Quotas & Density:');
  console.log(`  duplicate        : ${q.duplicate} (min ${SPEC02_QUOTAS.duplicate})`);
  console.log(`  phase            : ${q.phase} (min ${SPEC02_QUOTAS.phase})`);
  console.log(`  matterState      : ${q.matterState} (min ${SPEC02_QUOTAS.matterState})`);
  console.log(`  tunnel           : ${q.tunnel} (min ${SPEC02_QUOTAS.tunnel})`);
  console.log(`  condense         : ${q.condense} (min ${SPEC02_QUOTAS.condense})`);
  console.log(`  wormholes        : ${q.wormholes} (min ${SPEC02_QUOTAS.wormholes})`);
  console.log(`  entanglement     : ${q.entanglement} (min ${SPEC02_QUOTAS.entanglement}) [tetherPhysical: ${q.tetherPhysical} >= ${SPEC02_QUOTAS.tetherPhysical}]`);
  console.log(`  gates + plates   : ${q.gatesAndPlates} (min ${SPEC02_QUOTAS.gatesAndPlates})`);
  console.log(`  Period 2 dup/phs : ${q.period2DupOrPhase}/8 (${Math.round((q.period2DupOrPhase / 8) * 100)}% >= 60%)`);
  console.log(`  Max level width  : ${q.maxWidth}px (limit <= ${SPEC02_QUOTAS.maxAllowedWidth}px, violations: ${q.over5500Count})`);

  if (report.errors.length > 0) {
    console.error('\nVerification FAILED with errors:');
    for (const err of report.errors) {
      console.error(`  ✗ ${err}`);
    }
    process.exit(1);
  }

  console.log('\n✓ ALL 130 LEVELS (118 Campaign + 12 Secret Molecules) PASSED 100%!');
}

if (process.argv[1] && process.argv[1].endsWith('verify-all-levels.ts')) {
  main();
}
