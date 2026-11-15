#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateQuantumLevel } from '../src/generator/dagGenerator';

function parseArgs(args: string[]) {
  const result: {
    atom?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    out?: string;
    seed?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--atom' && i + 1 < args.length) {
      result.atom = Number.parseInt(args[++i], 10);
    } else if (arg === '--difficulty' && i + 1 < args.length) {
      const diff = args[++i] as 'easy' | 'medium' | 'hard';
      if (['easy', 'medium', 'hard'].includes(diff)) {
        result.difficulty = diff;
      }
    } else if (arg === '--out' && i + 1 < args.length) {
      result.out = args[++i];
    } else if (arg === '--seed' && i + 1 < args.length) {
      result.seed = Number.parseInt(args[++i], 10);
    }
  }

  return result;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const atom = options.atom ?? 7;
  const seed = options.seed ?? 42;
  const difficulty = options.difficulty ?? (atom <= 4 ? 'easy' : atom <= 8 ? 'medium' : 'hard');

  console.log(
    `Generating Quantum Level: Atom Z=${atom}, Difficulty=${difficulty}, Seed=${seed}...`
  );

  const { levelData, simulation } = generateQuantumLevel({
    atom,
    seed,
    difficulty
  });

  console.log('Level generated successfully:');
  console.log(` - Element: ${levelData.atom} (${levelData.symbol})`);
  console.log(` - Platforms: ${levelData.platforms.length}`);
  console.log(` - Simulated Time (Author Time): ${(levelData.authorTime ?? 0) / 1000}s`);
  console.log(` - Author Ghost length: ${(levelData.authorGhost ?? '').length} chars`);
  console.log(
    ` - Simulation Result: ${simulation.success ? 'PASSED (100% physically reach verified)' : 'FAILED'}`
  );

  const jsonString = JSON.stringify(levelData, null, 2);

  if (options.out) {
    const resolvedPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, jsonString, 'utf-8');
    console.log(`Saved level data to: ${resolvedPath}`);
  } else {
    console.log('\n--- Level JSON Output ---');
    console.log(jsonString);
  }
}

main();
