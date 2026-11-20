import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MILESTONE_DEFINITIONS, MILESTONE_LEVEL_NUMBERS } from '../src/generator/campaignDirector';
import { simulateLevelData, validateAuthorGhost } from '../src/generator/simulator';
import type { LevelData } from '../src/types';

function loadCampaignLevel(z: number): LevelData {
  const filePath = path.resolve(process.cwd(), 'src/data', `level${z}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LevelData;
}

describe('Spec-01: Milestone Integrity & DiscoveryBox Contract Tests', () => {
  it('identifies exactly the 14 campaign milestones with discoveryBox.enabled === true', () => {
    const discoveredMilestones: number[] = [];
    for (let z = 1; z <= 118; z++) {
      const data = loadCampaignLevel(z);
      if (data.discoveryBox?.enabled === true) {
        discoveredMilestones.push(z);
      }
    }
    expect(discoveredMilestones).toEqual([...MILESTONE_LEVEL_NUMBERS]);
    expect(discoveredMilestones).toHaveLength(14);
  });

  for (const z of MILESTONE_LEVEL_NUMBERS) {
    const def = MILESTONE_DEFINITIONS[z];

    describe(`Milestone Level ${z} (${def.symbol}) — ${def.mechanic}`, () => {
      const levelData = loadCampaignLevel(z);
      const safeMaxX = Math.ceil(levelData.width * (levelData.discoveryBox?.safeZoneRatio ?? 0.35));

      it('has a valid Safe Discovery Box with 2 hint steps and zero spikes inside 0-35%', () => {
        expect(levelData.discoveryBox?.enabled).toBe(true);
        expect(levelData.discoveryBox?.mechanic).toBe(def.mechanic);
        expect(levelData.discoveryBox?.hintSteps).toHaveLength(2);
        expect(levelData.discoveryBox?.hintSteps[0].length).toBeGreaterThan(0);
        expect(levelData.discoveryBox?.hintSteps[1].length).toBeGreaterThan(0);

        const intrudingSpikes = (levelData.spikes ?? []).filter((s) => s.x < safeMaxX);
        expect(intrudingSpikes).toEqual([]);
      });

      it(`physically contains the taught "${def.mechanic}" entities in the JSON (discovery zone)`, () => {
        switch (def.mechanic) {
          case 'superposition_orbital': {
            const dupInZone = levelData.particles.filter(
              (p) => p.type === 'duplicate' && p.x <= safeMaxX
            );
            expect(dupInZone.length).toBeGreaterThanOrEqual(1);
            expect(levelData.pressurePlates?.some((pl) => pl.requireLock === true)).toBe(true);
            expect(levelData.gates?.length ?? 0).toBeGreaterThanOrEqual(1);
            break;
          }

          case 'clone_fusion': {
            const dupInZone = levelData.particles.filter(
              (p) => p.type === 'duplicate' && p.x <= safeMaxX
            );
            expect(dupInZone.length).toBeGreaterThanOrEqual(1);
            expect(levelData.platforms.some((p) => p.cracked === true)).toBe(true);
            break;
          }

          case 'phase_shift_hud': {
            const cyanInZone = levelData.platforms.filter(
              (p) => p.phase === 'cyan' && p.x <= safeMaxX
            );
            const magentaInZone = levelData.platforms.filter(
              (p) => p.phase === 'magenta' && p.x <= safeMaxX
            );
            expect(cyanInZone.length).toBeGreaterThanOrEqual(1);
            expect(magentaInZone.length).toBeGreaterThanOrEqual(1);
            break;
          }

          case 'quantum_tunneling': {
            const tunnelInZone = levelData.particles.filter(
              (p) => p.type === 'tunnel' && p.x <= safeMaxX
            );
            expect(tunnelInZone.length).toBeGreaterThanOrEqual(1);

            const thinFullHeightWalls = levelData.platforms.filter(
              (p) => p.width <= 80 && p.y === 0 && p.height >= levelData.height * 0.8
            );
            expect(thinFullHeightWalls.length).toBeGreaterThanOrEqual(2);
            expect(thinFullHeightWalls.some((w) => w.x <= safeMaxX)).toBe(true);
            break;
          }

          case 'de_broglie_wave': {
            const condenseInZone = levelData.particles.filter(
              (p) => p.type === 'condense' && p.x <= safeMaxX
            );
            expect(condenseInZone.length).toBeGreaterThanOrEqual(1);

            // Verify there is a wide chasm (>= 350px) requiring mid-air wave crystallization
            const mainPlats = levelData.platforms
              .filter((p) => p.height <= 24 && p.y < levelData.height - 60)
              .sort((a, b) => a.x - b.x);
            let maxGap = 0;
            for (let i = 1; i < mainPlats.length; i++) {
              maxGap = Math.max(maxGap, mainPlats[i].x - (mainPlats[i - 1].x + mainPlats[i - 1].width));
            }
            expect(maxGap).toBeGreaterThanOrEqual(350);
            break;
          }

          case 'screen_wrap': {
            expect(levelData.screenWrap).toBe('both');
            break;
          }

          case 'entanglement_reveal': {
            expect(levelData.entanglement).toBeDefined();
            expect(levelData.entanglement?.revealAtX).toBeDefined();
            expect(levelData.entanglement?.revealAtX).toBeLessThanOrEqual(safeMaxX + 5);
            break;
          }

          case 'entanglement_tether': {
            expect(levelData.entanglement).toBeDefined();
            expect(levelData.entanglement?.tetherPhysical).toBe(true);
            expect(levelData.tetherPylons?.length ?? 0).toBeGreaterThanOrEqual(2);
            expect(levelData.tetherPylons?.some((py) => py.x <= safeMaxX)).toBe(true);
            break;
          }

          case 'liquid_platforms':
          case 'mercury_bath': {
            const liquidInZone = levelData.platforms.filter(
              (p) => p.matterState === 'liquid' && p.x <= safeMaxX
            );
            expect(liquidInZone.length).toBeGreaterThanOrEqual(1);
            break;
          }

          case 'living_floor': {
            expect(levelData.entanglement?.mode).toBe('inverted_gravity');
            expect(levelData.entanglement?.allowHeroCollision).toBe(true);
            break;
          }

          case 'quantum_pinning': {
            const phaseInZone = levelData.platforms.filter(
              (p) => Boolean(p.phase) && p.x <= safeMaxX
            );
            expect(phaseInZone.length).toBeGreaterThanOrEqual(1);
            expect(levelData.platforms.some((p) => p.phase === 'cyan')).toBe(true);
            expect(levelData.platforms.some((p) => p.phase === 'magenta')).toBe(true);
            break;
          }

          case 'time_dilation_wormhole': {
            const timeDilationInZone = levelData.particles.filter(
              (p) => p.type === 'timeDilation' && p.x <= safeMaxX
            );
            expect(timeDilationInZone.length).toBeGreaterThanOrEqual(1);
            expect(levelData.wormholes?.length ?? 0).toBeGreaterThanOrEqual(1);
            break;
          }

          case 'ghost_surfing': {
            const ghostCheck = validateAuthorGhost(levelData);
            expect(ghostCheck.valid).toBe(true);
            expect(ghostCheck.frameCount).toBeGreaterThanOrEqual(20);
            break;
          }

          default:
            throw new Error(`Unhandled milestone mechanic: ${def.mechanic}`);
        }
      });

      it('has a valid authorGhost and is physically solvable via simulateLevelData', () => {
        const ghostCheck = validateAuthorGhost(levelData);
        expect(ghostCheck.valid).toBe(true);
        expect(ghostCheck.frameCount).toBeGreaterThanOrEqual(2);
        expect(ghostCheck.durationMs).toBeGreaterThan(0);

        const sim = simulateLevelData(levelData);
        expect(sim.success).toBe(true);
        expect(sim.authorTime).toBeGreaterThan(0);
        expect(sim.authorGhost.startsWith('v1|')).toBe(true);
      });
    });
  }
});
