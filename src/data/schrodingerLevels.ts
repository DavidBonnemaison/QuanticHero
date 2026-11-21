import type { LevelData } from '../types';

export interface SchrodingerLabEntry {
  id: string;
  index: number;
  code: string;
  title: string;
  titleFr: string;
  summary: string;
  summaryFr: string;
  difficulty: 'TUTORIAL' | 'STANDARD' | 'ADVANCED' | 'PARADOX';
  levelData: LevelData;
}

export const SCHRODINGER_LEVELS: readonly SchrodingerLabEntry[] = [
  {
    id: 'schrodinger-1',
    index: 1,
    code: 'SL-01',
    title: 'Double Slit Bridge',
    titleFr: 'Pont à Double Fente',
    summary:
      'Observe the superposed bridge with E, Shift, or tap when its solid state (>50%) spans the chasm.',
    summaryFr:
      'Observe le pont superposé avec E, Shift ou tap quand son état solide (>50 %) traverse le gouffre.',
    difficulty: 'TUTORIAL',
    levelData: {
      id: 'schrodinger-1',
      symbol: 'Ψ₁',
      atom: 'Double Slit Bridge',
      width: 960,
      height: 600,
      hue: '#0c1028',
      antiHue: '#a855f7',
      discoveryBox: {
        enabled: true,
        mechanic: 'wavefunction-collapse',
        hintSteps: ['WATCH >50% STATE', 'PRESS E / SHIFT / TAP']
      },
      explanations: [
        'Nothing is solid until observed: superposed platforms oscillate between State A and State B.',
        'Press E, Shift, [OBSERVE], or tap the object when the dominant (>50%) state aligns with your path.'
      ],
      player: { position: { x: 100, y: 490 } },
      door: { x: 870, y: 510 },
      platforms: [
        { x: 0, y: 540, width: 300, height: 60 },
        {
          x: 340,
          y: 540,
          width: 280,
          height: 24,
          superposition: {
            altX: 340,
            altY: 360,
            periodMs: 3200,
            lockDurationMs: 3000
          }
        },
        { x: 660, y: 540, width: 300, height: 60 }
      ],
      spikes: [],
      particles: [],
      parTimeMs: 9000,
      parJumps: 2
    }
  },
  {
    id: 'schrodinger-2',
    index: 2,
    code: 'SL-02',
    title: 'Hazard Eigenstate',
    titleFr: 'État Propre du Danger',
    summary:
      'Superposed spikes oscillate off the runway. Collapse them into their safe ceiling state to sprint through.',
    summaryFr:
      'Des piques superposés oscillent hors de la piste. Effondre-les dans leur état sûr en hauteur pour passer.',
    difficulty: 'TUTORIAL',
    levelData: {
      id: 'schrodinger-2',
      symbol: 'Ψ₂',
      atom: 'Hazard Eigenstate',
      width: 960,
      height: 600,
      hue: '#140c2b',
      antiHue: '#c084fc',
      discoveryBox: {
        enabled: true,
        mechanic: 'wavefunction-spike',
        hintSteps: ['WAIT FOR SAFE STATE', 'COLLAPSE SPIKES AWAY']
      },
      explanations: [
        'Superposed spikes are intangible until observed, or locked into whichever state exceeds 50% probability.',
        'Collapse the hazard when its upper ghost is dominant to neutralize the runway for 3.0 seconds.'
      ],
      player: { position: { x: 90, y: 490 } },
      door: { x: 880, y: 510 },
      platforms: [
        { x: 0, y: 540, width: 960, height: 60 },
        { x: 300, y: 430, width: 120, height: 18 }
      ],
      spikes: [
        {
          x: 260,
          y: 516,
          width: 180,
          height: 24,
          superposition: {
            altX: 260,
            altY: 200,
            periodMs: 2800,
            lockDurationMs: 3200
          }
        },
        {
          x: 540,
          y: 516,
          width: 180,
          height: 24,
          superposition: {
            altX: 540,
            altY: 200,
            periodMs: 3400,
            lockDurationMs: 3200
          }
        }
      ],
      particles: [],
      parTimeMs: 10500,
      parJumps: 2
    }
  },
  {
    id: 'schrodinger-3',
    index: 3,
    code: 'SL-03',
    title: 'Phase Staircase',
    titleFr: 'Escalier de Phase',
    summary:
      'Ascend three out-of-phase superposed steps by timing each active observation before the 3.0 s lock expires.',
    summaryFr:
      'Gravis trois marches superposées déphasées en synchronisant chaque observation avant la fin des 3,0 s.',
    difficulty: 'STANDARD',
    levelData: {
      id: 'schrodinger-3',
      symbol: 'Ψ₃',
      atom: 'Phase Staircase',
      width: 1020,
      height: 620,
      hue: '#0a142d',
      antiHue: '#38bdf8',
      explanations: [
        'Each superposed platform oscillates on its own deterministic period.',
        'Lock each step in sequence and chain your jumps before reality decoheres.'
      ],
      player: { position: { x: 90, y: 510 } },
      door: { x: 930, y: 230 },
      platforms: [
        { x: 0, y: 560, width: 240, height: 60 },
        {
          x: 260,
          y: 470,
          width: 150,
          height: 22,
          superposition: {
            altX: 260,
            altY: 320,
            periodMs: 2400,
            lockDurationMs: 3000
          }
        },
        {
          x: 450,
          y: 380,
          width: 150,
          height: 22,
          superposition: {
            altX: 450,
            altY: 510,
            periodMs: 3000,
            lockDurationMs: 3000
          }
        },
        {
          x: 640,
          y: 290,
          width: 150,
          height: 22,
          superposition: {
            altX: 640,
            altY: 430,
            periodMs: 2600,
            lockDurationMs: 3000
          }
        },
        { x: 820, y: 260, width: 200, height: 28 }
      ],
      spikes: [],
      particles: [],
      parTimeMs: 12000,
      parJumps: 4
    }
  },
  {
    id: 'schrodinger-4',
    index: 4,
    code: 'SL-04',
    title: 'The Watching Eye',
    titleFr: 'L’Œil Observateur',
    summary:
      'A sweeping ceiling Observer Beam collapses reality as it scans. Ride the materialized bridges across.',
    summaryFr:
      'Un faisceau Observateur balaie la salle et matérialise la réalité sur son passage. Synchronise tes sauts.',
    difficulty: 'STANDARD',
    levelData: {
      id: 'schrodinger-4',
      symbol: 'Ψ₄',
      atom: 'The Watching Eye',
      width: 1080,
      height: 600,
      hue: '#0f102c',
      antiHue: '#00e5ff',
      observerBeams: [
        {
          x: 540,
          y: 72,
          sweepAngleDeg: 130,
          speedDegPerSec: 36,
          range: 560
        }
      ],
      explanations: [
        'Passive Observer Beams automatically collapse any superposed object their laser crosses.',
        'Read the beam sweep rhythm and cross the bridges as the eye locks them solid.'
      ],
      player: { position: { x: 80, y: 490 } },
      door: { x: 990, y: 510 },
      platforms: [
        { x: 0, y: 540, width: 200, height: 60 },
        {
          x: 240,
          y: 490,
          width: 160,
          height: 22,
          superposition: {
            altX: 240,
            altY: 410,
            periodMs: 3600,
            lockDurationMs: 3000
          }
        },
        {
          x: 460,
          y: 460,
          width: 160,
          height: 22,
          superposition: {
            altX: 460,
            altY: 380,
            periodMs: 3200,
            lockDurationMs: 3000
          }
        },
        {
          x: 680,
          y: 490,
          width: 160,
          height: 22,
          superposition: {
            altX: 680,
            altY: 410,
            periodMs: 3600,
            lockDurationMs: 3000
          }
        },
        { x: 880, y: 540, width: 200, height: 60 }
      ],
      spikes: [],
      particles: [],
      parTimeMs: 13000,
      parJumps: 4
    }
  },
  {
    id: 'schrodinger-5',
    index: 5,
    code: 'SL-05',
    title: 'Observer Paradox',
    titleFr: 'Paradoxe de l’Observateur',
    summary:
      'Combine the sweeping Observer Beam with active observation to neutralize spikes and bridge the upper vault.',
    summaryFr:
      'Combine le faisceau passif et ton observation active pour neutraliser les piques et franchir la voûte.',
    difficulty: 'ADVANCED',
    levelData: {
      id: 'schrodinger-5',
      symbol: 'Ψ₅',
      atom: 'Observer Paradox',
      width: 1120,
      height: 620,
      hue: '#170d2e',
      antiHue: '#f472b6',
      observerBeams: [
        {
          x: 560,
          y: 68,
          sweepAngleDeg: 140,
          speedDegPerSec: 44,
          range: 590
        }
      ],
      explanations: [
        'Active observation lets you lock hazards safely before the sweeping beam forces an unwanted eigenstate.',
        'Lock the spikes into their upper state, then climb the superposed platforms.'
      ],
      player: { position: { x: 80, y: 510 } },
      door: { x: 1030, y: 290 },
      platforms: [
        { x: 0, y: 560, width: 220, height: 60 },
        { x: 220, y: 560, width: 320, height: 60 },
        {
          x: 560,
          y: 470,
          width: 150,
          height: 22,
          superposition: {
            altX: 560,
            altY: 360,
            periodMs: 2600,
            lockDurationMs: 3000
          }
        },
        {
          x: 750,
          y: 380,
          width: 150,
          height: 22,
          superposition: {
            altX: 750,
            altY: 490,
            periodMs: 2900,
            lockDurationMs: 3000
          }
        },
        { x: 930, y: 320, width: 190, height: 28 }
      ],
      spikes: [
        {
          x: 290,
          y: 536,
          width: 180,
          height: 24,
          superposition: {
            altX: 290,
            altY: 220,
            periodMs: 2500,
            lockDurationMs: 3200
          }
        }
      ],
      particles: [],
      parTimeMs: 14000,
      parJumps: 4
    }
  },
  {
    id: 'schrodinger-6',
    index: 6,
    code: 'SL-06',
    title: 'Eigenstate Lab',
    titleFr: 'Laboratoire des États Propres',
    summary:
      'Dual counter-sweeping Observer Beams, four superposed platforms, and twin quantum traps. Master the collapse.',
    summaryFr:
      'Double faisceau Observateur, quatre plateformes superposées et pièges quantiques jumeaux. Maîtrise l’effondrement.',
    difficulty: 'PARADOX',
    levelData: {
      id: 'schrodinger-6',
      symbol: 'Ψ₆',
      atom: 'Eigenstate Lab',
      width: 1240,
      height: 640,
      hue: '#080e24',
      antiHue: '#fbbf24',
      observerBeams: [
        {
          x: 380,
          y: 64,
          sweepAngleDeg: 115,
          speedDegPerSec: 42,
          range: 590
        },
        {
          x: 860,
          y: 64,
          sweepAngleDeg: 115,
          speedDegPerSec: -46,
          range: 590
        }
      ],
      explanations: [
        'Twin Observer Beams sweep opposite halves of the Eigenstate Lab.',
        'Anticipate both phase clocks and use active observation to override local states.'
      ],
      player: { position: { x: 80, y: 530 } },
      door: { x: 1150, y: 230 },
      platforms: [
        { x: 0, y: 580, width: 200, height: 60 },
        {
          x: 230,
          y: 510,
          width: 140,
          height: 22,
          superposition: {
            altX: 230,
            altY: 410,
            periodMs: 2500,
            lockDurationMs: 3000
          }
        },
        {
          x: 410,
          y: 440,
          width: 140,
          height: 22,
          superposition: {
            altX: 410,
            altY: 540,
            periodMs: 2900,
            lockDurationMs: 3000
          }
        },
        { x: 580, y: 440, width: 120, height: 24 },
        {
          x: 730,
          y: 380,
          width: 140,
          height: 22,
          superposition: {
            altX: 730,
            altY: 490,
            periodMs: 2400,
            lockDurationMs: 3000
          }
        },
        {
          x: 900,
          y: 300,
          width: 140,
          height: 22,
          superposition: {
            altX: 900,
            altY: 400,
            periodMs: 2700,
            lockDurationMs: 3000
          }
        },
        { x: 1060, y: 260, width: 180, height: 28 }
      ],
      spikes: [
        {
          x: 595,
          y: 416,
          width: 90,
          height: 24,
          superposition: {
            altX: 595,
            altY: 180,
            periodMs: 2600,
            lockDurationMs: 3000
          }
        },
        {
          x: 1070,
          y: 236,
          width: 60,
          height: 24,
          superposition: {
            altX: 1070,
            altY: 110,
            periodMs: 2400,
            lockDurationMs: 3000
          }
        }
      ],
      particles: [],
      parTimeMs: 18000,
      parJumps: 6
    }
  }
];

export function getSchrodingerLevelById(id: string): SchrodingerLabEntry | undefined {
  return SCHRODINGER_LEVELS.find((entry) => entry.id === id);
}

export function getNextSchrodingerLevel(currentId: string): SchrodingerLabEntry | undefined {
  const idx = SCHRODINGER_LEVELS.findIndex((entry) => entry.id === currentId);
  if (idx < 0 || idx + 1 >= SCHRODINGER_LEVELS.length) return undefined;
  return SCHRODINGER_LEVELS[idx + 1];
}
