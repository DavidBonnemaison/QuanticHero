import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPEC02_QUOTAS, verifyAllLevels } from '../scripts/verify-all-levels';
import { SECRET_MOLECULES } from '../src/data/molecules';
import {
  simulateLevelData,
  validateAuthorGhost,
  validateGhostNoWallPenetration
} from '../src/generator/simulator';
import type { LevelData } from '../src/types';

function loadCampaignLevel(z: number): LevelData {
  const filePath = path.resolve(process.cwd(), 'src/data', `level${z}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LevelData;
}

describe('Spec-02: Campaign Mechanic Density, Quotas & Real Molecule Ghosts', () => {
  it('enforces all Spec-02 global mechanic quotas and <= 5500px width cap across 118 levels', () => {
    const report = verifyAllLevels();
    expect(report.errors).toEqual([]);
    expect(report.campaignCount).toBe(118);

    const q = report.quotas;
    expect(q.duplicate).toBeGreaterThanOrEqual(SPEC02_QUOTAS.duplicate);
    expect(q.phase).toBeGreaterThanOrEqual(SPEC02_QUOTAS.phase);
    expect(q.matterState).toBeGreaterThanOrEqual(SPEC02_QUOTAS.matterState);
    expect(q.tunnel).toBeGreaterThanOrEqual(SPEC02_QUOTAS.tunnel);
    expect(q.condense).toBeGreaterThanOrEqual(SPEC02_QUOTAS.condense);
    expect(q.wormholes).toBeGreaterThanOrEqual(SPEC02_QUOTAS.wormholes);
    expect(q.entanglement).toBeGreaterThanOrEqual(SPEC02_QUOTAS.entanglement);
    expect(q.tetherPhysical).toBeGreaterThanOrEqual(SPEC02_QUOTAS.tetherPhysical);
    expect(q.gatesAndPlates).toBeGreaterThanOrEqual(SPEC02_QUOTAS.gatesAndPlates);
    expect(q.smartArchetypeLevels).toBeGreaterThanOrEqual(SPEC02_QUOTAS.smartArchetypeLevels);
    expect(q.period2DupOrPhase / 8).toBeGreaterThanOrEqual(SPEC02_QUOTAS.period2MinRatio);
    expect(q.over5500Count).toBe(0);
    expect(q.maxWidth).toBeLessThanOrEqual(SPEC02_QUOTAS.maxAllowedWidth);
  });

  it('keeps Period 7 (Z 87-118) within dense 2000-4800px target length with multi-mechanic synthesis', () => {
    for (let z = 87; z <= 118; z++) {
      const data = loadCampaignLevel(z);
      expect(data.width).toBeGreaterThanOrEqual(2000);
      expect(data.width).toBeLessThanOrEqual(4800);
    }
  });

  it('guarantees all 12 secret molecules have real physically simulated authorGhosts with zero wall penetration', () => {
    expect(SECRET_MOLECULES).toHaveLength(12);
    for (const mol of SECRET_MOLECULES) {
      const ghostCheck = validateAuthorGhost(mol.levelData);
      expect(ghostCheck.valid).toBe(true);

      const wallCheck = validateGhostNoWallPenetration(mol.levelData);
      expect(wallCheck.valid).toBe(true);

      const sim = simulateLevelData(mol.levelData);
      expect(sim.success).toBe(true);
      expect(sim.authorTime).toBeGreaterThan(0);
      expect(mol.levelData.authorGhost).toBe(sim.authorGhost);
    }
  });
});
