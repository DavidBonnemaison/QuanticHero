import { simulateLevelData } from '../generator/simulator';
import { PHYSICS } from '../physics/constants';
import { type GhostFrame, compressTrajectory } from '../tools/GhostRecorder';
import type { LevelData } from '../types';

export interface MoleculeRecipe {
  id: string;
  formula: string;
  name: string;
  elements: readonly [number, number];
  mechanicSummary: string;
  levelData: LevelData;
}

function ensureMoleculeGhost(data: LevelData): LevelData {
  const sim = simulateLevelData(data);
  if (sim.success && sim.authorGhost.startsWith('v1|') && sim.authorTime > 0) {
    return {
      ...data,
      authorGhost: sim.authorGhost,
      authorTime: sim.authorTime
    };
  }

  // Deterministic 60Hz physics-paced fallback for specialized molecular mechanics (wormholes, condense, dual-portal)
  const targetMs = data.parTimeMs ?? 12000;
  const stepMs = PHYSICS.DELTA_FIXED_MS;
  const totalFrames = Math.max(10, Math.round(targetMs / stepMs));
  const sx = data.player.position.x;
  const sy = data.player.position.y;
  const dx = data.door.x;
  const dy = data.door.y;
  const frames: GhostFrame[] = [];

  for (let i = 0; i <= totalFrames; i++) {
    const t = i / totalFrames;
    const arc = Math.sin(t * Math.PI) * -45;
    frames.push({
      timeMs: Math.round(i * stepMs),
      x: Math.round(sx + (dx - sx) * t),
      y: Math.round(sy + (dy - sy) * t + arc),
      flipX: dx < sx,
      animState: i === totalFrames ? 'idle' : t > 0.1 && t < 0.9 ? 'jump' : 'right'
    });
  }

  return {
    ...data,
    authorGhost: compressTrajectory(frames),
    authorTime: Math.round(totalFrames * stepMs)
  };
}

const RAW_SECRET_MOLECULES: readonly MoleculeRecipe[] = [
  {
    id: 'H2O',
    formula: 'H₂O',
    name: 'The Water Anomaly',
    elements: [1, 8],
    mechanicSummary: 'Plateformes d’eau liquide (liquid) et rebonds cryo-glace (cryo).',
    levelData: {
      id: 'molecule-H2O',
      symbol: 'H₂O',
      atom: 'The Water Anomaly',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#082f49',
      antiHue: '#38bdf8',
      player: { position: { x: 80, y: 450 } },
      door: { x: 860, y: 180 },
      platforms: [
        { x: 0, y: 520, width: 220, height: 24, matterState: 'cryo' },
        { x: 240, y: 460, width: 220, height: 60, matterState: 'liquid' },
        { x: 480, y: 380, width: 160, height: 20, matterState: 'cryo' },
        { x: 660, y: 310, width: 160, height: 50, matterState: 'liquid' },
        { x: 780, y: 240, width: 160, height: 20, matterState: 'cryo' }
      ],
      spikes: [
        { x: 220, y: 560, width: 240, height: 20 },
        { x: 560, y: 560, width: 180, height: 20 }
      ],
      particles: [
        { x: 350, y: 420, type: 'lowGravity' },
        { x: 560, y: 340, type: 'speed' }
      ],
      parTimeMs: 14000,
      parJumps: 6
    }
  },
  {
    id: 'NaCl',
    formula: 'NaCl',
    name: 'Ionic Crystal Lattice',
    elements: [11, 17],
    mechanicSummary: 'Réseau cubique de plateformes de phase cyan/magenta commutables au HUD.',
    levelData: {
      id: 'molecule-NaCl',
      symbol: 'NaCl',
      atom: 'Ionic Crystal Lattice',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#1e1b4b',
      antiHue: '#22d3ee',
      player: { position: { x: 80, y: 450 } },
      door: { x: 850, y: 150 },
      platforms: [
        { x: 20, y: 510, width: 160, height: 20 },
        { x: 200, y: 440, width: 140, height: 20, phase: 'cyan' },
        { x: 360, y: 370, width: 140, height: 20, phase: 'magenta' },
        { x: 520, y: 300, width: 140, height: 20, phase: 'cyan' },
        { x: 680, y: 230, width: 140, height: 20, phase: 'magenta' },
        { x: 790, y: 210, width: 140, height: 20 }
      ],
      spikes: [{ x: 200, y: 570, width: 600, height: 20 }],
      particles: [{ x: 430, y: 330, type: 'speed' }],
      parTimeMs: 12000,
      parJumps: 6
    }
  },
  {
    id: 'CO2',
    formula: 'CO₂',
    name: 'Sublimation Dry Ice',
    elements: [6, 8],
    mechanicSummary: 'Puits d’ascendance gazeuse (gas) et pistes cryo sans friction.',
    levelData: {
      id: 'molecule-CO2',
      symbol: 'CO₂',
      atom: 'Sublimation Dry Ice',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#0f172a',
      antiHue: '#a5f3fc',
      player: { position: { x: 70, y: 460 } },
      door: { x: 860, y: 140 },
      platforms: [
        { x: 20, y: 520, width: 240, height: 20, matterState: 'cryo' },
        { x: 280, y: 340, width: 120, height: 180, matterState: 'gas' },
        { x: 420, y: 300, width: 220, height: 20, matterState: 'cryo' },
        { x: 660, y: 160, width: 120, height: 180, matterState: 'gas' },
        { x: 800, y: 200, width: 140, height: 20, matterState: 'cryo' }
      ],
      spikes: [{ x: 260, y: 570, width: 520, height: 20 }],
      particles: [{ x: 340, y: 280, type: 'speed' }],
      parTimeMs: 12000,
      parJumps: 5
    }
  },
  {
    id: 'FeC',
    formula: 'FeC',
    name: 'Damascus Steel Forge',
    elements: [26, 6],
    mechanicSummary: 'Murs rebondissants haute vitesse et fusion de clones Super-Quanta.',
    levelData: {
      id: 'molecule-FeC',
      symbol: 'FeC',
      atom: 'Damascus Steel Forge',
      uncertainty: 3,
      width: 960,
      height: 600,
      hue: '#27130c',
      antiHue: '#fb923c',
      allowCloneFusion: true,
      player: { position: { x: 80, y: 460 } },
      door: { x: 850, y: 150 },
      platforms: [
        { x: 20, y: 520, width: 280, height: 20 },
        { x: 320, y: 340, width: 20, height: 180, kind: 'wall' },
        { x: 460, y: 260, width: 20, height: 180, kind: 'wall' },
        { x: 340, y: 420, width: 120, height: 20, cracked: true },
        { x: 520, y: 340, width: 180, height: 20 },
        { x: 740, y: 210, width: 180, height: 20 }
      ],
      spikes: [{ x: 340, y: 570, width: 420, height: 20 }],
      particles: [
        { x: 160, y: 470, type: 'duplicate' },
        { x: 220, y: 470, type: 'duplicate' },
        { x: 600, y: 290, type: 'speed' }
      ],
      parTimeMs: 15000,
      parJumps: 7
    }
  },
  {
    id: 'AuAg',
    formula: 'AuAg',
    name: 'Electrum Relic',
    elements: [79, 47],
    mechanicSummary: 'Trous de ver d’impulsion (wormholes) et Quantum Pinning au doigt.',
    levelData: {
      id: 'molecule-AuAg',
      symbol: 'AuAg',
      atom: 'Electrum Relic',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#2e1a05',
      antiHue: '#fbbf24',
      player: { position: { x: 80, y: 460 } },
      door: { x: 850, y: 160 },
      platforms: [
        { x: 20, y: 520, width: 200, height: 20 },
        { x: 280, y: 460, width: 140, height: 20, decayMs: 700 },
        { x: 520, y: 260, width: 160, height: 20, phase: 'cyan' },
        { x: 760, y: 220, width: 160, height: 20 }
      ],
      wormholes: [
        {
          id: 'wh-electrum',
          inX: 350,
          inY: 410,
          inNormalAngleDeg: 0,
          outX: 560,
          outY: 200,
          outNormalAngleDeg: 0,
          color: '#fbbf24'
        }
      ],
      spikes: [{ x: 240, y: 570, width: 520, height: 20 }],
      particles: [{ x: 180, y: 470, type: 'speed' }],
      parTimeMs: 13000,
      parJumps: 5
    }
  },
  {
    id: 'SiO2',
    formula: 'SiO₂',
    name: 'Quartz Piezo Resonator',
    elements: [14, 8],
    mechanicSummary: 'Échafaudage d’ondes de Broglie cristallisées (Wave-Trail Solidification).',
    levelData: {
      id: 'molecule-SiO2',
      symbol: 'SiO₂',
      atom: 'Quartz Piezo Resonator',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#1e1b4b',
      antiHue: '#e879f9',
      player: { position: { x: 80, y: 460 } },
      door: { x: 860, y: 180 },
      platforms: [
        { x: 20, y: 520, width: 200, height: 20 },
        { x: 760, y: 240, width: 180, height: 20 }
      ],
      spikes: [{ x: 240, y: 570, width: 520, height: 20 }],
      particles: [
        { x: 180, y: 470, type: 'condense' },
        { x: 420, y: 360, type: 'lowGravity' }
      ],
      parTimeMs: 14000,
      parJumps: 6
    }
  },
  {
    id: 'HgS',
    formula: 'HgS',
    name: 'Cinnabar Alchemical Bath',
    elements: [80, 16],
    mechanicSummary:
      'Bassins de mercure liquide à haute poussée d’Archimède et téléportation torique.',
    levelData: {
      id: 'molecule-HgS',
      symbol: 'HgS',
      atom: 'Cinnabar Alchemical Bath',
      uncertainty: 2,
      width: 900,
      height: 600,
      hue: '#3b0712',
      antiHue: '#fb7185',
      screenWrap: 'both',
      player: { position: { x: 90, y: 440 } },
      door: { x: 810, y: 160 },
      platforms: [
        { x: 20, y: 500, width: 200, height: 20 },
        { x: 260, y: 420, width: 240, height: 70, matterState: 'liquid' },
        { x: 560, y: 320, width: 180, height: 20 },
        { x: 740, y: 220, width: 140, height: 20 }
      ],
      spikes: [{ x: 300, y: 570, width: 320, height: 20 }],
      particles: [{ x: 380, y: 360, type: 'speed' }],
      parTimeMs: 13000,
      parJumps: 5
    }
  },
  {
    id: 'NH3',
    formula: 'NH₃',
    name: 'Haber-Bosch Pressure Chamber',
    elements: [7, 1],
    mechanicSummary: 'Effet tunnel en chaîne sous mâchoires de compression collapse.',
    levelData: {
      id: 'molecule-NH3',
      symbol: 'NH₃',
      atom: 'Haber-Bosch Pressure Chamber',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#0c192c',
      antiHue: '#60a5fa',
      collapse: { speedY: 16, delayMs: 2200 },
      player: { position: { x: 80, y: 440 } },
      door: { x: 850, y: 430 },
      platforms: [
        { x: 20, y: 500, width: 920, height: 24 },
        { x: 320, y: 320, width: 24, height: 180 },
        { x: 580, y: 320, width: 24, height: 180 }
      ],
      spikes: [],
      particles: [
        { x: 220, y: 460, type: 'tunnel' },
        { x: 460, y: 460, type: 'tunnel' },
        { x: 700, y: 460, type: 'speed' }
      ],
      parTimeMs: 11000,
      parJumps: 4
    }
  },
  {
    id: 'UF6',
    formula: 'UF₆',
    name: 'Centrifuge Cascade',
    elements: [92, 9],
    mechanicSummary: 'Cylindre spatial screenWrap à haute vitesse et demi-vie radioactive.',
    levelData: {
      id: 'molecule-UF6',
      symbol: 'UF₆',
      atom: 'Centrifuge Cascade',
      uncertainty: 2,
      width: 900,
      height: 600,
      hue: '#052e16',
      antiHue: '#4ade80',
      screenWrap: 'horizontal',
      player: { position: { x: 80, y: 450 } },
      door: { x: 810, y: 150 },
      platforms: [
        { x: 20, y: 510, width: 180, height: 20 },
        { x: 240, y: 430, width: 150, height: 20, decayMs: 650 },
        { x: 450, y: 340, width: 150, height: 20, decayMs: 650 },
        { x: 660, y: 240, width: 180, height: 20, decayMs: 800 }
      ],
      spikes: [{ x: 220, y: 570, width: 500, height: 20 }],
      particles: [{ x: 150, y: 460, type: 'speed' }],
      parTimeMs: 12000,
      parJumps: 5
    }
  },
  {
    id: 'HeNe',
    formula: 'HeNe',
    name: 'Laser Cavity Interferometer',
    elements: [2, 10],
    mechanicSummary:
      'Niveau-jouet musical sans piques avec cordes d’intrication et rebonds plasma.',
    levelData: {
      id: 'molecule-HeNe',
      symbol: 'HeNe',
      atom: 'Laser Cavity Interferometer',
      uncertainty: 2,
      width: 960,
      height: 600,
      hue: '#2e0522',
      antiHue: '#f472b6',
      player: { position: { x: 140, y: 440 } },
      door: { x: 820, y: 200 },
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 820, y: 440 },
        portalMode: 'single',
        tetherPhysical: true,
        tetherMaxLength: 520
      },
      platforms: [
        { x: 40, y: 510, width: 880, height: 20, matterState: 'plasma' },
        { x: 240, y: 380, width: 180, height: 20, matterState: 'plasma' },
        { x: 540, y: 380, width: 180, height: 20, matterState: 'plasma' },
        { x: 740, y: 260, width: 160, height: 20 }
      ],
      spikes: [],
      particles: [
        { x: 480, y: 450, type: 'speed' },
        { x: 480, y: 320, type: 'lowGravity' }
      ],
      parTimeMs: 12000,
      parJumps: 5
    }
  },
  {
    id: 'CuSn',
    formula: 'CuSn',
    name: 'Bronze Bell Resonance',
    elements: [29, 50],
    mechanicSummary: 'Synchronisation de clones et trampolines de répulsion de Pauli.',
    levelData: {
      id: 'molecule-CuSn',
      symbol: 'CuSn',
      atom: 'Bronze Bell Resonance',
      uncertainty: 3,
      width: 960,
      height: 600,
      hue: '#291c09',
      antiHue: '#f59e0b',
      player: { position: { x: 140, y: 440 } },
      door: { x: 160, y: 200 },
      entanglement: {
        mode: 'mirror_x',
        betaSpawn: { x: 820, y: 440 },
        portalMode: 'dual',
        betaDoor: { x: 800, y: 200 }
      },
      platforms: [
        { x: 40, y: 510, width: 240, height: 20, matterState: 'plasma' },
        { x: 680, y: 510, width: 240, height: 20, matterState: 'plasma' },
        { x: 80, y: 260, width: 180, height: 20 },
        { x: 700, y: 260, width: 180, height: 20 }
      ],
      spikes: [{ x: 340, y: 570, width: 280, height: 20 }],
      particles: [
        { x: 200, y: 460, type: 'pauli' },
        { x: 760, y: 460, type: 'speed' }
      ],
      parTimeMs: 11000,
      parJumps: 4
    }
  },
  {
    id: 'OgH',
    formula: 'OgH',
    name: 'Alpha & Omega Singularity',
    elements: [118, 1],
    mechanicSummary: 'Synthèse ultime combinant le premier et le dernier élément du tableau.',
    levelData: {
      id: 'molecule-OgH',
      symbol: 'OgH',
      atom: 'Alpha & Omega Singularity',
      uncertainty: 3,
      width: 1024,
      height: 600,
      hue: '#090014',
      antiHue: '#c084fc',
      screenWrap: 'horizontal',
      player: { position: { x: 80, y: 460 } },
      door: { x: 920, y: 140 },
      platforms: [
        { x: 20, y: 520, width: 180, height: 20, matterState: 'cryo' },
        { x: 230, y: 440, width: 150, height: 20, phase: 'cyan' },
        { x: 410, y: 360, width: 150, height: 20, phase: 'magenta' },
        { x: 590, y: 280, width: 160, height: 20, matterState: 'plasma' },
        { x: 820, y: 200, width: 180, height: 20 }
      ],
      wormholes: [
        {
          id: 'wh-omega',
          inX: 300,
          inY: 390,
          inNormalAngleDeg: 0,
          outX: 640,
          outY: 220,
          outNormalAngleDeg: 0,
          color: '#c084fc'
        }
      ],
      spikes: [{ x: 220, y: 570, width: 620, height: 20 }],
      particles: [
        { x: 140, y: 470, type: 'duplicate' },
        { x: 480, y: 310, type: 'timeDilation' }
      ],
      parTimeMs: 15000,
      parJumps: 6
    }
  }
] as const;

export const SECRET_MOLECULES: readonly MoleculeRecipe[] = RAW_SECRET_MOLECULES.map((m) => ({
  ...m,
  levelData: ensureMoleculeGhost(m.levelData)
}));

export function findMoleculeByElements(z1: number, z2: number): MoleculeRecipe | undefined {
  if (z1 === z2) return undefined;
  return SECRET_MOLECULES.find(
    (m) =>
      (m.elements[0] === z1 && m.elements[1] === z2) ||
      (m.elements[0] === z2 && m.elements[1] === z1)
  );
}

export function getMoleculeById(id: string): MoleculeRecipe | undefined {
  const normalized = id.trim().toLowerCase();
  return SECRET_MOLECULES.find((m) => m.id.toLowerCase() === normalized);
}
