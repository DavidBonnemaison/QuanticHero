import { describe, expect, it } from 'vitest';
import { verifyAllLevels } from '../scripts/verify-all-levels';
import { SECRET_MOLECULES } from '../src/data/molecules';
import {
  MILESTONE_LEVEL_NUMBERS,
  NOBLE_GAS_LEVELS,
  PERIODS,
  applyCampaignDirectives,
  getCampaignDirectives,
  getPeriodForLevel,
  getUnlockedMechanicsForLevel,
  isMilestoneLevel,
  isNobleGasLevel
} from '../src/generator/campaignDirector';
import { validateAuthorGhost } from '../src/generator/simulator';
import type { LevelData } from '../src/types';

describe('Spec-12: 7-Period Kishōtenketsu Campaign, Safe Discovery Boxes & E2E Validation', () => {
  describe('7-Period Periodic Table Architecture', () => {
    it('defines 7 contiguous periods covering Z=1..118', () => {
      expect(PERIODS).toHaveLength(7);
      expect(PERIODS[0].zStart).toBe(1);
      expect(PERIODS[6].zEnd).toBe(118);

      for (let i = 1; i < PERIODS.length; i++) {
        expect(PERIODS[i].zStart).toBe(PERIODS[i - 1].zEnd + 1);
      }

      expect(getPeriodForLevel(1).period).toBe(1);
      expect(getPeriodForLevel(2).period).toBe(1);
      expect(getPeriodForLevel(10).period).toBe(2);
      expect(getPeriodForLevel(18).period).toBe(3);
      expect(getPeriodForLevel(36).period).toBe(4);
      expect(getPeriodForLevel(54).period).toBe(5);
      expect(getPeriodForLevel(86).period).toBe(6);
      expect(getPeriodForLevel(118).period).toBe(7);
    });

    it('progressively unlocks mechanics across periods without premature spoilers', () => {
      const p1 = getUnlockedMechanicsForLevel(2);
      expect(p1).toContain('touch_ribbon');
      expect(p1).not.toContain('quantum_tunneling');
      expect(p1).not.toContain('ghost_surfing');

      const na11 = getUnlockedMechanicsForLevel(11);
      expect(na11).toContain('quantum_tunneling');
      expect(na11).not.toContain('de_broglie_wave');

      const og118 = getUnlockedMechanicsForLevel(118);
      expect(og118).toContain('ghost_surfing');
      expect(og118).toContain('master_constellation');
    });
  });

  describe('7 Noble Gas Deathless Playgrounds', () => {
    it('identifies all 7 noble gases (2, 10, 18, 36, 54, 86, 118)', () => {
      expect(NOBLE_GAS_LEVELS).toEqual([2, 10, 18, 36, 54, 86, 118]);
      for (const z of NOBLE_GAS_LEVELS) {
        expect(isNobleGasLevel(z)).toBe(true);
      }
      expect(isNobleGasLevel(1)).toBe(false);
      expect(isNobleGasLevel(117)).toBe(false);
    });

    it('strips all spikes and marks noblePlayground: true via applyCampaignDirectives', () => {
      const dummy: LevelData = {
        id: '10',
        symbol: 'Ne',
        atom: 'Neon',
        width: 2000,
        height: 1000,
        hue: '#000',
        antiHue: '#ff5400',
        player: { position: { x: 100, y: 800 } },
        door: { x: 1800, y: 800 },
        platforms: [{ x: 50, y: 832, width: 200, height: 20 }],
        spikes: [{ x: 0, y: 985, width: 2000, height: 15 }],
        particles: []
      };

      const directed = applyCampaignDirectives(dummy, 10);
      expect(directed.noblePlayground).toBe(true);
      expect(directed.spikes).toEqual([]);
      expect(directed.period).toBe(2);
    });
  });

  describe('14 Milestone Levels & Safe Discovery Boxes', () => {
    it('configures all 14 milestone levels with 2-step diegetic hints', () => {
      expect(MILESTONE_LEVEL_NUMBERS).toEqual([
        4, 6, 8, 11, 14, 18, 19, 26, 35, 40, 47, 55, 80, 87
      ]);
      for (const z of MILESTONE_LEVEL_NUMBERS) {
        expect(isMilestoneLevel(z)).toBe(true);
        const dir = getCampaignDirectives(z);
        expect(dir.discoveryBox?.enabled).toBe(true);
        expect(dir.discoveryBox?.hintSteps).toHaveLength(2);
      }
    });

    it('removes/clips spikes inside the 0-35% Safe Discovery Zone', () => {
      const dummy: LevelData = {
        id: '11',
        symbol: 'Na',
        atom: 'Sodium',
        width: 2000,
        height: 1000,
        hue: '#000',
        antiHue: '#00f5d4',
        player: { position: { x: 120, y: 700 } },
        door: { x: 1850, y: 700 },
        platforms: [{ x: 60, y: 732, width: 240, height: 20 }],
        spikes: [
          { x: 0, y: 985, width: 2000, height: 15 },
          { x: 400, y: 712, width: 32, height: 20 },
          { x: 1200, y: 712, width: 32, height: 20 }
        ],
        particles: []
      };

      const directed = applyCampaignDirectives(dummy, 11);
      expect(directed.discoveryBox?.enabled).toBe(true);
      expect(directed.discoveryBox?.mechanic).toBe('quantum_tunneling');
      // 35% of 2000 = 700: spike at 400 removed, bottom spike clipped to start at 700
      expect(directed.spikes.every((s) => s.x >= 700)).toBe(true);
      expect(directed.spikes).toHaveLength(2);
    });
  });

  describe('End-to-End 118 Campaign + 12 Secret Molecules Verification', () => {
    it('validates all 118 campaign levels and 12 secret molecules with 0 errors', () => {
      const report = verifyAllLevels();
      expect(report.campaignCount).toBe(118);
      expect(report.nobleGasCount).toBe(7);
      expect(report.milestoneCount).toBe(14);
      expect(report.moleculeCount).toBe(12);
      expect(report.errors).toEqual([]);
    });

    it('ensures every secret molecule has a valid v1| authorGhost and positive authorTime', () => {
      expect(SECRET_MOLECULES).toHaveLength(12);
      for (const mol of SECRET_MOLECULES) {
        const res = validateAuthorGhost(mol.levelData);
        expect(res.valid).toBe(true);
        expect(res.frameCount).toBeGreaterThanOrEqual(2);
        expect(res.durationMs).toBeGreaterThan(0);
      }
    });
  });
});
