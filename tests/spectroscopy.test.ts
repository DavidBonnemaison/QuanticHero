import { describe, expect, it } from 'vitest';
import {
  COSMIC_ACTS,
  LEVEL_NARRATIVES,
  getActForElement,
  getCosmicAct,
  getNarrativeForLevel
} from '../src/data/cosmicNarrative';
import {
  NOBLE_GAS_NUMBERS,
  SPECTROSCOPY_BY_SYMBOL,
  SPECTROSCOPY_BY_Z,
  SPECTROSCOPY_DATABASE,
  getElementSpectroscopy,
  getPeriodicPosition,
  isNobleGas
} from '../src/data/spectroscopy';
import { assemblePacedLevel } from '../src/generator/chunkAssembler';
import { PERIODIC_ELEMENTS, generateQuantumLevel } from '../src/generator/dagGenerator';

describe('Spec-03: Complete 118-Element Spectroscopy Database', () => {
  it('contains exactly 118 unique chemical elements from Z=1 to Z=118 without gaps', () => {
    expect(SPECTROSCOPY_DATABASE).toHaveLength(118);

    const zSet = new Set<number>();
    const symbolSet = new Set<string>();

    for (let z = 1; z <= 118; z++) {
      const el = SPECTROSCOPY_DATABASE[z - 1];
      expect(el).toBeDefined();
      expect(el.z).toBe(z);
      expect(typeof el.symbol).toBe('string');
      expect(el.symbol.length).toBeGreaterThan(0);
      expect(typeof el.name).toBe('string');
      expect(el.name.length).toBeGreaterThan(0);

      zSet.add(el.z);
      symbolSet.add(el.symbol.toLowerCase());
    }

    expect(zSet.size).toBe(118);
    expect(symbolSet.size).toBe(118);
  });

  it('validates that every element has valid hex hue and antiHue, act, and description', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

    for (const el of SPECTROSCOPY_DATABASE) {
      expect(el.hue).toMatch(hexColorRegex);
      expect(el.antiHue).toMatch(hexColorRegex);
      expect([1, 2, 3, 4]).toContain(el.act);
      expect(typeof el.description).toBe('string');
      expect(el.description.trim().length).toBeGreaterThan(10);

      // Validate Act partition boundaries
      if (el.z >= 1 && el.z <= 6) {
        expect(el.act).toBe(1);
      } else if (el.z >= 7 && el.z <= 26) {
        expect(el.act).toBe(2);
      } else if (el.z >= 27 && el.z <= 82) {
        expect(el.act).toBe(3);
      } else if (el.z >= 83 && el.z <= 118) {
        expect(el.act).toBe(4);
      }
    }
  });

  it('accurately reproduces exact physical palettes for key reference elements', () => {
    // H (1) : H-alpha Balmer #0a1128 / #e63946 (656.3 nm)
    const h = getElementSpectroscopy(1);
    expect(h.symbol).toBe('H');
    expect(h.hue).toBe('#0a1128');
    expect(h.antiHue).toBe('#e63946');
    expect(h.spectralLineNm).toBe(656.3);

    // He (2) : Raie jaune D3 #1c1900 / #ffd166 (587.6 nm)
    const he = getElementSpectroscopy(2);
    expect(he.symbol).toBe('He');
    expect(he.hue).toBe('#1c1900');
    expect(he.antiHue).toBe('#ffd166');
    expect(he.spectralLineNm).toBe(587.6);

    // Li (3) : Rouge carmin #20080e / #ff4d6d (670.8 nm)
    const li = getElementSpectroscopy(3);
    expect(li.symbol).toBe('Li');
    expect(li.hue).toBe('#20080e');
    expect(li.antiHue).toBe('#ff4d6d');
    expect(li.spectralLineNm).toBe(670.8);

    // Be (4) : Blanc-vert métallique #0f1416 / #70e000
    const be = getElementSpectroscopy(4);
    expect(be.symbol).toBe('Be');
    expect(be.hue).toBe('#0f1416');
    expect(be.antiHue).toBe('#70e000');

    // B (5) : Vert thermique #061a14 / #38b000
    const b = getElementSpectroscopy(5);
    expect(b.symbol).toBe('B');
    expect(b.hue).toBe('#061a14');
    expect(b.antiHue).toBe('#38b000');

    // C (6) : Noir graphite / éclat diamant #111116 / #00f5d4
    const c = getElementSpectroscopy(6);
    expect(c.symbol).toBe('C');
    expect(c.hue).toBe('#111116');
    expect(c.antiHue).toBe('#00f5d4');

    // N (7) : Émission aurorale azote / bleu nuit #0b132b / #48cae4
    const n = getElementSpectroscopy(7);
    expect(n.symbol).toBe('N');
    expect(n.hue).toBe('#0b132b');
    expect(n.antiHue).toBe('#48cae4');

    // O (8) : Raie verte aurores (557.7 nm) #032b1a / #52b788
    const o = getElementSpectroscopy(8);
    expect(o.symbol).toBe('O');
    expect(o.hue).toBe('#032b1a');
    expect(o.antiHue).toBe('#52b788');
    expect(o.spectralLineNm).toBe(557.7);

    // F (9) : Jaune-ambre halogène #261a00 / #fee440
    const f = getElementSpectroscopy(9);
    expect(f.symbol).toBe('F');
    expect(f.hue).toBe('#261a00');
    expect(f.antiHue).toBe('#fee440');

    // Ne (10) : Décharge néon rouge-orange emblématique #2b0b00 / #ff5400
    const ne = getElementSpectroscopy(10);
    expect(ne.symbol).toBe('Ne');
    expect(ne.hue).toBe('#2b0b00');
    expect(ne.antiHue).toBe('#ff5400');

    // Na (11) : Doublet sodium D #231700 / #ffbe0b (589 nm)
    const na = getElementSpectroscopy(11);
    expect(na.symbol).toBe('Na');
    expect(na.hue).toBe('#231700');
    expect(na.antiHue).toBe('#ffbe0b');
    expect(na.spectralLineNm).toBe(589.0);

    // Mg (12) : Éclat blanc magnésium #0e141a / #90e0ef
    const mg = getElementSpectroscopy(12);
    expect(mg.symbol).toBe('Mg');
    expect(mg.hue).toBe('#0e141a');
    expect(mg.antiHue).toBe('#90e0ef');

    // Fe (26) : Métal stellaire dense / rouge braise #1a1110 / #e63946
    const fe = getElementSpectroscopy(26);
    expect(fe.symbol).toBe('Fe');
    expect(fe.hue).toBe('#1a1110');
    expect(fe.antiHue).toBe('#e63946');

    // Cs (55) : Raies bleues caractéristiques #03071e / #3a86ff
    const cs = getElementSpectroscopy(55);
    expect(cs.symbol).toBe('Cs');
    expect(cs.hue).toBe('#03071e');
    expect(cs.antiHue).toBe('#3a86ff');

    // Au (79) : Or éclatant relativiste #1c1500 / #ffb703
    const au = getElementSpectroscopy(79);
    expect(au.symbol).toBe('Au');
    expect(au.hue).toBe('#1c1500');
    expect(au.antiHue).toBe('#ffb703');
  });

  it('correctly queries elements via getElementSpectroscopy by Z, symbol, and name', () => {
    expect(getElementSpectroscopy(1).name).toBe('Hydrogen');
    expect(getElementSpectroscopy('1').name).toBe('Hydrogen');
    expect(getElementSpectroscopy('H').name).toBe('Hydrogen');
    expect(getElementSpectroscopy('h').name).toBe('Hydrogen');
    expect(getElementSpectroscopy('hydrogen').symbol).toBe('H');

    expect(getElementSpectroscopy(118).symbol).toBe('Og');
    expect(getElementSpectroscopy('Og').name).toBe('Oganesson');
    expect(getElementSpectroscopy('oganesson').z).toBe(118);
  });
});

describe('Spec-03: 4-Act Cosmic Narrative & Odyssey Lore', () => {
  it('defines the 4 Cosmic Acts with valid title, subtitle, and range boundaries', () => {
    expect(COSMIC_ACTS[1].title).toBe('The Primordial Soup');
    expect(COSMIC_ACTS[1].zRange).toEqual([1, 6]);

    expect(COSMIC_ACTS[2].title).toBe('The Stellar Forge');
    expect(COSMIC_ACTS[2].zRange).toEqual([7, 26]);

    expect(COSMIC_ACTS[3].title).toBe('Supernova Cataclysm & r-Process');
    expect(COSMIC_ACTS[3].zRange).toEqual([27, 82]);

    expect(COSMIC_ACTS[4].title).toBe('Island of Stability & Transuranic Frontier');
    expect(COSMIC_ACTS[4].zRange).toEqual([83, 118]);

    for (let actNum = 1; actNum <= 4; actNum++) {
      const act = getCosmicAct(actNum as 1 | 2 | 3 | 4);
      expect(act.act).toBe(actNum);
      expect(act.description.length).toBeGreaterThan(20);
    }
  });

  it('validates that levels 1 to 10 each have at least 2 narrative lines in English', () => {
    for (let z = 1; z <= 10; z++) {
      const narrative = getNarrativeForLevel(z);
      expect(Array.isArray(narrative)).toBe(true);
      expect(narrative.length).toBeGreaterThanOrEqual(2);

      for (const line of narrative) {
        expect(typeof line).toBe('string');
        expect(line.trim().length).toBeGreaterThan(15);
      }
    }
  });

  it('provides concise riddle opening lines for Level 1 (Hydrogen)', () => {
    const level1Lines = getNarrativeForLevel(1);
    expect(level1Lines[0]).toBe('Reduced to a single quantum.');
    expect(level1Lines.length).toBeGreaterThanOrEqual(2);
  });

  it('provides short, subtle narrative lines without exclamation marks for levels 1 to 10', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const lines = getNarrativeForLevel(lvl);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const l of lines) {
        expect(l).not.toContain('!');
        expect(l.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it('generates consistent narrative lines for all 118 elements', () => {
    for (let z = 1; z <= 118; z++) {
      const narrative = getNarrativeForLevel(z);
      expect(narrative.length).toBeGreaterThanOrEqual(2);
      const act = getActForElement(z);
      expect([1, 2, 3, 4]).toContain(act.act);
    }
  });
});

describe('Spec-03: Generator & Level Assembly Integration', () => {
  it('embeds spectroscopy colors and cosmic narrative in dagGenerator output', () => {
    const generated = generateQuantumLevel({ atom: 7, seed: 1234, mode: 'dag' });
    expect(generated.levelData.symbol).toBe('N');
    expect(generated.levelData.atom).toBe('Nitrogen');
    expect(generated.levelData.hue).toBe('#0b132b');
    expect(generated.levelData.antiHue).toBe('#48cae4');
    expect(generated.levelData.explanations).toBeDefined();
    expect(generated.levelData.explanations?.length).toBeGreaterThanOrEqual(2);
    expect(generated.levelData.explanations?.[0]).toMatch(/^[^!]+$/);
  });

  it('embeds spectroscopy colors and cosmic narrative in paced assembler output', () => {
    const assembly = assemblePacedLevel({ atom: 8, seed: 5678 });
    expect(assembly.levelData.symbol).toBe('O');
    expect(assembly.levelData.atom).toBe('Oxygen');
    expect(assembly.levelData.hue).toBe('#032b1a');
    expect(assembly.levelData.antiHue).toBe('#52b788');
    expect(assembly.levelData.explanations).toBeDefined();
    expect(assembly.levelData.explanations?.length).toBeGreaterThanOrEqual(2);
    expect(assembly.levelData.explanations?.[0]).toMatch(/^[^!]+$/);
  });

  it('ensures PERIODIC_ELEMENTS contains all 118 elements with exact coordinates', () => {
    expect(Object.keys(PERIODIC_ELEMENTS)).toHaveLength(118);
    expect(PERIODIC_ELEMENTS[1].symbol).toBe('H');
    expect(PERIODIC_ELEMENTS[118].symbol).toBe('Og');
  });
});

describe('Epic 03 Spec-01: IUPAC Periodic Table Positions (18 × 7 + f-block)', () => {
  it('exposes valid group (1-18), period (1-7), and block (s|p|d|f) on all 118 elements', () => {
    const coords = new Set<string>();

    for (const el of SPECTROSCOPY_DATABASE) {
      expect(el.group).toBeGreaterThanOrEqual(1);
      expect(el.group).toBeLessThanOrEqual(18);
      expect(el.period).toBeGreaterThanOrEqual(1);
      expect(el.period).toBeLessThanOrEqual(7);
      expect(['s', 'p', 'd', 'f']).toContain(el.block);

      const pos = getPeriodicPosition(el.z);
      expect(pos.group).toBe(el.group);
      expect(pos.period).toBe(el.period);
      expect(pos.block).toBe(el.block);
      expect(pos.gridColumn).toBeGreaterThanOrEqual(1);
      expect(pos.gridColumn).toBeLessThanOrEqual(18);
      expect([1, 2, 3, 4, 5, 6, 7, 9, 10]).toContain(pos.gridRow);

      coords.add(`${pos.gridRow}:${pos.gridColumn}`);
    }

    // All 118 elements must occupy unique visual grid coordinates
    expect(coords.size).toBe(118);
  });

  it('places key IUPAC anchor elements at their exact standard coordinates', () => {
    // Hydrogen (1): group 1, period 1, s-block, row 1 col 1
    expect(getPeriodicPosition(1)).toEqual({
      group: 1,
      period: 1,
      block: 's',
      gridRow: 1,
      gridColumn: 1,
      isLanthanide: false,
      isActinide: false
    });

    // Helium (2): group 18, period 1, s-block, row 1 col 18
    expect(getPeriodicPosition(2)).toEqual({
      group: 18,
      period: 1,
      block: 's',
      gridRow: 1,
      gridColumn: 18,
      isLanthanide: false,
      isActinide: false
    });

    // Lithium (3) & Neon (10)
    expect(getPeriodicPosition(3)).toMatchObject({
      group: 1,
      period: 2,
      block: 's',
      gridRow: 2,
      gridColumn: 1
    });
    expect(getPeriodicPosition(10)).toMatchObject({
      group: 18,
      period: 2,
      block: 'p',
      gridRow: 2,
      gridColumn: 18
    });

    // Iron (26)
    expect(getPeriodicPosition(26)).toMatchObject({
      group: 8,
      period: 4,
      block: 'd',
      gridRow: 4,
      gridColumn: 8
    });

    // Lanthanides (57 La .. 71 Lu): detached on gridRow 9, cols 4..18
    expect(getPeriodicPosition(57)).toEqual({
      group: 3,
      period: 6,
      block: 'f',
      gridRow: 9,
      gridColumn: 4,
      isLanthanide: true,
      isActinide: false
    });
    expect(getPeriodicPosition(71)).toEqual({
      group: 3,
      period: 6,
      block: 'f',
      gridRow: 9,
      gridColumn: 18,
      isLanthanide: true,
      isActinide: false
    });
    // Hafnium (72) resumes main Period 6 at col 4
    expect(getPeriodicPosition(72)).toMatchObject({
      group: 4,
      period: 6,
      block: 'd',
      gridRow: 6,
      gridColumn: 4
    });

    // Actinides (89 Ac .. 103 Lr): detached on gridRow 10, cols 4..18
    expect(getPeriodicPosition(89)).toEqual({
      group: 3,
      period: 7,
      block: 'f',
      gridRow: 10,
      gridColumn: 4,
      isLanthanide: false,
      isActinide: true
    });
    expect(getPeriodicPosition(103)).toEqual({
      group: 3,
      period: 7,
      block: 'f',
      gridRow: 10,
      gridColumn: 18,
      isLanthanide: false,
      isActinide: true
    });
    // Rutherfordium (104) resumes main Period 7 at col 4
    expect(getPeriodicPosition(104)).toMatchObject({
      group: 4,
      period: 7,
      block: 'd',
      gridRow: 7,
      gridColumn: 4
    });

    // Oganesson (118): group 18, period 7, p-block, row 7 col 18
    expect(getPeriodicPosition(118)).toEqual({
      group: 18,
      period: 7,
      block: 'p',
      gridRow: 7,
      gridColumn: 18,
      isLanthanide: false,
      isActinide: false
    });
  });

  it('identifies all 7 Noble Gases in group 18', () => {
    expect(NOBLE_GAS_NUMBERS).toEqual([2, 10, 18, 36, 54, 86, 118]);
    for (const z of NOBLE_GAS_NUMBERS) {
      expect(isNobleGas(z)).toBe(true);
      expect(getPeriodicPosition(z).group).toBe(18);
    }
    expect(isNobleGas(1)).toBe(false);
    expect(isNobleGas(79)).toBe(false);
  });
});
