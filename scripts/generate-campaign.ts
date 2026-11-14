#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assembleCampaignLevel } from '../src/generator/chunkAssembler';

interface CampaignOptions {
  from: number;
  to: number;
  baseSeed: number;
  dryRun: boolean;
}

function parseArgs(args: string[]): CampaignOptions {
  let from = 1;
  let to = 10;
  let baseSeed = 42;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--from' && i + 1 < args.length) {
      from = Number.parseInt(args[++i], 10);
    } else if (arg === '--to' && i + 1 < args.length) {
      to = Number.parseInt(args[++i], 10);
    } else if (arg === '--seed' && i + 1 < args.length) {
      baseSeed = Number.parseInt(args[++i], 10);
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { from, to, baseSeed, dryRun };
}

export function generateCampaign(options: CampaignOptions): void {
  const { from, to, baseSeed, dryRun } = options;

  console.log('===============================================================');
  console.log(` QuanticHero - Campaign Generation Pipeline (Levels ${from} to ${to})`);
  console.log('===============================================================');

  const generatedLevels: Array<{
    level: number;
    symbol: string;
    name: string;
    seed: number;
    authorTime: number;
    platforms: number;
    success: boolean;
  }> = [];

  for (let lvl = from; lvl <= to; lvl++) {
    let currentSeed = baseSeed + (lvl - 1) * 7;
    let attempts = 0;
    const maxAttempts = 50;
    let assembly = assembleCampaignLevel(lvl, currentSeed);

    while (!assembly.simulation.success && attempts < maxAttempts) {
      attempts++;
      currentSeed++;
      assembly = assembleCampaignLevel(lvl, currentSeed);
    }

    if (!assembly.simulation.success) {
      throw new Error(
        `[SOLVER ERROR] Level ${lvl} (${assembly.levelData.symbol}) failed physical reach verification after ${maxAttempts} seeds! Last reason: ${assembly.simulation.failureReason}`
      );
    }

    const { levelData, simulation } = assembly;
    const outFileName = `level${lvl}.json`;
    const outFilePath = path.resolve(process.cwd(), 'src/data', outFileName);

    if (!dryRun) {
      fs.writeFileSync(outFilePath, JSON.stringify(levelData, null, 2), 'utf-8');
    }

    generatedLevels.push({
      level: lvl,
      symbol: levelData.symbol,
      name: levelData.atom,
      seed: currentSeed,
      authorTime: simulation.authorTime,
      platforms: levelData.platforms.length,
      success: simulation.success
    });

    console.log(
      `✓ Level ${lvl.toString().padStart(2, ' ')} [${levelData.symbol.padEnd(2, ' ')} - ${levelData.atom.padEnd(12, ' ')}] ` +
        `Seed: ${currentSeed.toString().padEnd(4, ' ')} ` +
        `Plats: ${levelData.platforms.length.toString().padEnd(2, ' ')} ` +
        `AuthorTime: ${(simulation.authorTime / 1000).toFixed(2)}s ` +
        `Ghost: ${(levelData.authorGhost?.length ?? 0).toString().padStart(4, ' ')} chars ` +
        `-> ${outFileName}`
    );
  }

  console.log('---------------------------------------------------------------');
  console.log(
    `Successfully generated and verified ${generatedLevels.length} levels with 100% solver pass!`
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  generateCampaign(options);
}

if (process.argv[1] && process.argv[1].endsWith('generate-campaign.ts')) {
  main();
}
