import { describe, expect, it } from 'vitest';
import {
  SECRET_MOLECULES,
  findMoleculeByElements,
  getMoleculeById
} from './molecules';

describe('Secret Molecules Data (Spec-10)', () => {
  it('defines all 12 secret molecular recipes with unique IDs and valid LevelData', () => {
    expect(SECRET_MOLECULES).toHaveLength(12);

    const expectedIds = [
      'H2O',
      'NaCl',
      'CO2',
      'FeC',
      'AuAg',
      'SiO2',
      'HgS',
      'NH3',
      'UF6',
      'HeNe',
      'CuSn',
      'OgH'
    ];
    expect(SECRET_MOLECULES.map((m) => m.id)).toEqual(expectedIds);

    for (const mol of SECRET_MOLECULES) {
      expect(mol.levelData.width).toBeGreaterThan(0);
      expect(mol.levelData.height).toBeGreaterThan(0);
      expect(mol.levelData.platforms.length).toBeGreaterThan(0);
      expect(mol.levelData.player.position.x).toBeGreaterThanOrEqual(0);
      expect(mol.levelData.player.position.y).toBeGreaterThanOrEqual(0);
      expect(mol.levelData.door.x).toBeGreaterThanOrEqual(0);
      expect(mol.levelData.door.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves H (1) + O (8) and O (8) + H (1) to H2O', () => {
    const m1 = findMoleculeByElements(1, 8);
    const m2 = findMoleculeByElements(8, 1);
    expect(m1?.id).toBe('H2O');
    expect(m2?.id).toBe('H2O');
    expect(m1?.levelData.atom).toBe('The Water Anomaly');
    expect(getMoleculeById('h2o')?.id).toBe('H2O');
  });

  it('returns undefined for invalid or identical element pairs', () => {
    expect(findMoleculeByElements(1, 1)).toBeUndefined();
    expect(findMoleculeByElements(3, 4)).toBeUndefined();
  });
});
