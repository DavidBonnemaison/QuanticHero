#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assembleCampaignLevel } from '../src/generator/chunkAssembler';
import { countJumpsInTrajectory } from '../src/services/MedalService';

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

  const metadataPath = path.resolve(process.cwd(), 'src/data', 'levelMetadata.json');
  const metadata: Record<string, Record<string, unknown>> = fs.existsSync(metadataPath)
    ? (JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as Record<string, Record<string, unknown>>)
    : {};

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

    const { levelData: rawLevelData, simulation } = assembly;
    const parJumps = Math.max(1, countJumpsInTrajectory(simulation.frames));
    const cleanMeta = rawLevelData.meta
      ? {
          seed: rawLevelData.meta.seed,
          generatorVersion: rawLevelData.meta.generatorVersion
        }
      : undefined;
    const levelData = {
      ...rawLevelData,
      parJumps,
      ...(cleanMeta ? { meta: cleanMeta } : {})
    };
    const outFileName = `level${lvl}.json`;
    const outFilePath = path.resolve(process.cwd(), 'src/data', outFileName);

    if (!dryRun) {
      fs.writeFileSync(outFilePath, JSON.stringify(levelData, null, 2), 'utf-8');
      const existingMeta = metadata[`level${lvl}`] ?? {};
      metadata[`level${lvl}`] = {
        ...existingMeta,
        id: levelData.id,
        symbol: levelData.symbol,
        atom: levelData.atom,
        uncertainty: levelData.uncertainty,
        hue: levelData.hue,
        antiHue: levelData.antiHue,
        explanations: levelData.explanations ?? [],
        authorTime: levelData.authorTime,
        ...(levelData.discoveryBox ? { discoveryBox: levelData.discoveryBox } : {}),
        ...(levelData.noblePlayground ? { noblePlayground: true } : {}),
        parJumps
      };
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

  if (!dryRun) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
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
