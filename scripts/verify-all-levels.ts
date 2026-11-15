#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SECRET_MOLECULES } from '../src/data/molecules';
import {
  MILESTONE_LEVEL_NUMBERS,
  NOBLE_GAS_LEVELS,
  getPeriodForLevel,
  isMilestoneLevel,
  isNobleGasLevel
} from '../src/generator/campaignDirector';
import { validateAuthorGhost } from '../src/generator/simulator';
import type { LevelData } from '../src/types';

export interface VerificationReport {
  campaignCount: number;
  moleculeCount: number;
  nobleGasCount: number;
  milestoneCount: number;
  errors: string[];
}

export function verifyAllLevels(): VerificationReport {
  const errors: string[] = [];
  const dataDir = path.resolve(process.cwd(), 'src/data');
  let campaignCount = 0;
  let nobleGasCount = 0;
  let milestoneCount = 0;

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
  }

  // 2. Validate all 12 Secret Molecular levels
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
  }

  return {
    campaignCount,
    moleculeCount,
    nobleGasCount,
    milestoneCount,
    errors
  };
}

function main() {
  console.log('===============================================================');
  console.log(' QuanticHero - End-to-End 118 Campaign + 12 Molecules Verifier');
  console.log('===============================================================');

  const report = verifyAllLevels();
  console.log(`Campaign Levels Verified : ${report.campaignCount}/118`);
  console.log(
    `Noble Gas Playgrounds    : ${report.nobleGasCount}/${NOBLE_GAS_LEVELS.length}`
  );
  console.log(
    `Milestone Discovery Boxes: ${report.milestoneCount}/${MILESTONE_LEVEL_NUMBERS.length}`
  );
  console.log(`Secret Molecules Verified: ${report.moleculeCount}/12`);

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
