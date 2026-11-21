import type { LevelData } from '../types';

export interface ChronoLoopEntry {
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

export const CHRONO_LOOP_LEVELS: readonly ChronoLoopEntry[] = [
  {
    id: 'chrono-1',
    index: 1,
    code: 'CL-01',
    title: 'Echo Gate',
    titleFr: 'Porte d’Écho',
    summary: 'Stand on the pressure plate, rewind with R, and let your echo hold the gate open.',
    summaryFr: 'Place-toi sur la plaque, rembobine avec R et laisse ton écho tenir la porte.',
    difficulty: 'TUTORIAL',
    levelData: {
      id: 'chrono-1',
      symbol: 'τ₁',
      atom: 'Echo Gate',
      width: 960,
      height: 600,
      hue: '#081b2e',
      antiHue: '#00e5ff',
      timeLoop: { cycleMs: 7000, maxEchoes: 1 },
      discoveryBox: {
        enabled: true,
        mechanic: 'chrono-loop',
        hintSteps: ['HOLD PLATE → PRESS R', 'PASS GATE WITH ECHO']
      },
      explanations: [
        'Your past self replays at 30 Hz as a physical Echo.',
        'Hold the pressure plate in Loop 1, then sprint through the gate in Loop 2.'
      ],
      player: { position: { x: 100, y: 500 } },
      door: { x: 860, y: 490 },
      platforms: [
        { x: 0, y: 540, width: 960, height: 60 },
        { x: 640, y: 240, width: 320, height: 140 }
      ],
      spikes: [],
      particles: [],
      gates: [{ id: 'g1', x: 640, y: 380, width: 28, height: 160 }],
      pressurePlates: [
        {
          id: 'p1',
          x: 280,
          y: 526,
          width: 72,
          height: 14,
          targetGateId: 'g1',
          requireLock: true
        }
      ],
      parTimeMs: 12000,
      parJumps: 2
    }
  },
  {
    id: 'chrono-2',
    index: 2,
    code: 'CL-02',
    title: 'Ghost Stepping Stone',
    titleFr: 'Marche Fantôme',
    summary: 'Bounce off your own echo’s head (Ghost Surfing) to scale an unreachable ledge.',
    summaryFr: 'Rebondis sur la tête de ton écho (Ghost Surfing) pour atteindre le rebord haut.',
    difficulty: 'TUTORIAL',
    levelData: {
      id: 'chrono-2',
      symbol: 'τ₂',
      atom: 'Ghost Stepping Stone',
      width: 960,
      height: 600,
      hue: '#111633',
      antiHue: '#38bdf8',
      timeLoop: { cycleMs: 6500, maxEchoes: 1 },
      discoveryBox: {
        enabled: true,
        mechanic: 'ghost-surf',
        hintSteps: ['JUMP ON STEP → LOOP', 'BOUNCE OFF ECHO HEAD']
      },
      explanations: [
        'Landing on your Echo from above triggers a high Ghost Surf boost.',
        'Position Echo 1 on the mid-step, then bounce off its head to reach the summit.'
      ],
      player: { position: { x: 100, y: 500 } },
      door: { x: 820, y: 200 },
      platforms: [
        { x: 0, y: 540, width: 960, height: 60 },
        { x: 380, y: 420, width: 160, height: 22 },
        { x: 660, y: 250, width: 260, height: 24 }
      ],
      spikes: [{ x: 560, y: 520, width: 160, height: 20 }],
      particles: [],
      parTimeMs: 14000,
      parJumps: 4
    }
  },
  {
    id: 'chrono-3',
    index: 3,
    code: 'CL-03',
    title: 'Twin Locks',
    titleFr: 'Verrous Jumeaux',
    summary: 'Coordinate 2 echoes on separate pressure plates to unlock a double-gated vault.',
    summaryFr: 'Coordonne 2 échos sur deux plaques distinctes pour ouvrir le coffre double.',
    difficulty: 'STANDARD',
    levelData: {
      id: 'chrono-3',
      symbol: 'τ₃',
      atom: 'Twin Locks',
      width: 1040,
      height: 600,
      hue: '#161130',
      antiHue: '#a855f7',
      timeLoop: { cycleMs: 7500, maxEchoes: 2 },
      explanations: [
        'Up to 2 echoes can coexist: Cyan (Loop 1) and Violet (Loop 2).',
        'Lock Plate 1 with Echo 1, Plate 2 with Echo 2, then run through both gates.'
      ],
      player: { position: { x: 90, y: 500 } },
      door: { x: 940, y: 490 },
      platforms: [
        { x: 0, y: 540, width: 1040, height: 60 },
        { x: 240, y: 410, width: 200, height: 22 },
        { x: 660, y: 240, width: 380, height: 140 }
      ],
      spikes: [],
      particles: [],
      gates: [
        { id: 'g1', x: 660, y: 380, width: 26, height: 160 },
        { id: 'g2', x: 760, y: 380, width: 26, height: 160 }
      ],
      pressurePlates: [
        {
          id: 'p1',
          x: 240,
          y: 526,
          width: 72,
          height: 14,
          targetGateId: 'g1',
          requireLock: true
        },
        {
          id: 'p2',
          x: 310,
          y: 396,
          width: 72,
          height: 14,
          targetGateId: 'g2',
          requireLock: true
        }
      ],
      parTimeMs: 18000,
      parJumps: 5
    }
  },
  {
    id: 'chrono-4',
    index: 4,
    code: 'CL-04',
    title: 'Pauli Catapult',
    titleFr: 'Catapulte de Pauli',
    summary:
      'Charge your echo with Pauli Exclusion and collide with your past self to launch across.',
    summaryFr: 'Charge ton écho en exclusion de Pauli et provoque une répulsion temporelle.',
    difficulty: 'STANDARD',
    levelData: {
      id: 'chrono-4',
      symbol: 'τ₄',
      atom: 'Pauli Catapult',
      width: 1080,
      height: 600,
      hue: '#230d24',
      antiHue: '#f43f5e',
      timeLoop: { cycleMs: 7000, maxEchoes: 1 },
      explanations: [
        'Temporal Pauli Repulsion launches you at high speed away from a Pauli-charged Echo.',
        'Collect the Pauli orb on Loop 1, wait at the cliff edge, then blast across on Loop 2.'
      ],
      player: { position: { x: 90, y: 500 } },
      door: { x: 960, y: 290 },
      platforms: [
        { x: 0, y: 540, width: 420, height: 60 },
        { x: 780, y: 340, width: 260, height: 28 },
        { x: 780, y: 540, width: 300, height: 60 }
      ],
      spikes: [{ x: 420, y: 560, width: 360, height: 40 }],
      particles: [{ x: 270, y: 490, type: 'pauli' }],
      parTimeMs: 16000,
      parJumps: 3
    }
  },
  {
    id: 'chrono-5',
    index: 5,
    code: 'CL-05',
    title: 'Stairway of Selves',
    titleFr: 'Escalier Temporel',
    summary: 'Chain two Ghost Surfs across 2 stacked echoes to climb a vertical quantum shaft.',
    summaryFr: 'Enchaîne deux Ghost Surfs sur 2 échos superposés pour gravir le puits quantique.',
    difficulty: 'ADVANCED',
    levelData: {
      id: 'chrono-5',
      symbol: 'τ₅',
      atom: 'Stairway of Selves',
      width: 960,
      height: 640,
      hue: '#0b1d2c',
      antiHue: '#22d3ee',
      timeLoop: { cycleMs: 7500, maxEchoes: 2 },
      explanations: [
        'Build a living ladder out of your own past jumps.',
        'Place Echo 1 on the lower pad and Echo 2 on the middle ledge, then surf both to the top.'
      ],
      player: { position: { x: 100, y: 560 } },
      door: { x: 820, y: 120 },
      platforms: [
        { x: 0, y: 600, width: 960, height: 40 },
        { x: 300, y: 490, width: 150, height: 22 },
        { x: 510, y: 330, width: 150, height: 22 },
        { x: 700, y: 170, width: 220, height: 24 }
      ],
      spikes: [{ x: 470, y: 580, width: 220, height: 20 }],
      particles: [],
      parTimeMs: 20000,
      parJumps: 6
    }
  },
  {
    id: 'chrono-6',
    index: 6,
    code: 'CL-06',
    title: 'Relay Vault',
    titleFr: 'Relais de Voûte',
    summary: 'Echo 1 unlocks the inner chamber, Echo 2 serves as a launch pad over the barrier.',
    summaryFr: 'L’Écho 1 ouvre la chambre interne, l’Écho 2 sert de tremplin au-dessus du mur.',
    difficulty: 'ADVANCED',
    levelData: {
      id: 'chrono-6',
      symbol: 'τ₆',
      atom: 'Relay Vault',
      width: 1080,
      height: 600,
      hue: '#0f172a',
      antiHue: '#38bdf8',
      timeLoop: { cycleMs: 8000, maxEchoes: 2 },
      explanations: [
        'Combine a Pressure Plate lock with a Ghost Surf boost.',
        'Echo 1 holds Plate 1 while Echo 2 moves past Gate 1 to boost you onto the upper gallery.'
      ],
      player: { position: { x: 80, y: 500 } },
      door: { x: 960, y: 210 },
      platforms: [
        { x: 0, y: 540, width: 1080, height: 60 },
        { x: 460, y: 220, width: 28, height: 160 },
        { x: 760, y: 260, width: 280, height: 24 },
        { x: 520, y: 410, width: 160, height: 22 }
      ],
      spikes: [{ x: 740, y: 520, width: 200, height: 20 }],
      particles: [],
      gates: [{ id: 'g1', x: 460, y: 380, width: 28, height: 160 }],
      pressurePlates: [
        {
          id: 'p1',
          x: 240,
          y: 526,
          width: 72,
          height: 14,
          targetGateId: 'g1',
          requireLock: true
        }
      ],
      parTimeMs: 22000,
      parJumps: 6
    }
  },
  {
    id: 'chrono-7',
    index: 7,
    code: 'CL-07',
    title: 'Temporal Collider',
    titleFr: 'Collisionneur Temporel',
    summary:
      'Unlock the Pauli orb with Echo 1, prime the blast with Echo 2, and surf the shockwave.',
    summaryFr: 'Débloque l’orbe Pauli avec l’Écho 1, arme le choc avec l’Écho 2 et décolle.',
    difficulty: 'ADVANCED',
    levelData: {
      id: 'chrono-7',
      symbol: 'τ₇',
      atom: 'Temporal Collider',
      width: 1120,
      height: 600,
      hue: '#1e1035',
      antiHue: '#fbbf24',
      timeLoop: { cycleMs: 8000, maxEchoes: 2 },
      explanations: [
        'Echo 1 opens the Pauli containment gate.',
        'Echo 2 grabs Pauli and waits at the launch marker to catapult Loop 3 to the portal.'
      ],
      player: { position: { x: 80, y: 500 } },
      door: { x: 1000, y: 220 },
      platforms: [
        { x: 0, y: 540, width: 640, height: 60 },
        { x: 360, y: 260, width: 28, height: 120 },
        { x: 840, y: 270, width: 240, height: 26 },
        { x: 840, y: 540, width: 280, height: 60 }
      ],
      spikes: [{ x: 640, y: 560, width: 200, height: 40 }],
      particles: [{ x: 470, y: 490, type: 'pauli' }],
      gates: [{ id: 'g1', x: 360, y: 380, width: 28, height: 160 }],
      pressurePlates: [
        {
          id: 'p1',
          x: 200,
          y: 526,
          width: 72,
          height: 14,
          targetGateId: 'g1',
          requireLock: true
        }
      ],
      parTimeMs: 24000,
      parJumps: 5
    }
  },
  {
    id: 'chrono-8',
    index: 8,
    code: 'CL-08',
    title: 'Causality Paradox',
    titleFr: 'Paradoxe de Causalité',
    summary: 'Master 3 simultaneous echoes: dual gate locks plus a final Ghost Surf to the apex.',
    summaryFr: 'Maîtrise 3 échos simultanés : double verrou et Ghost Surf final vers le sommet.',
    difficulty: 'PARADOX',
    levelData: {
      id: 'chrono-8',
      symbol: 'τ₈',
      atom: 'Causality Paradox',
      width: 1180,
      height: 640,
      hue: '#090d1f',
      antiHue: '#fbbf24',
      timeLoop: { cycleMs: 8000, maxEchoes: 3 },
      explanations: [
        'Three echoes in harmony: Cyan, Violet, and Gold.',
        'Hold both gates open while Echo 3 positions inside the vault to launch you to the portal.'
      ],
      player: { position: { x: 80, y: 540 } },
      door: { x: 1060, y: 200 },
      platforms: [
        { x: 0, y: 580, width: 1180, height: 60 },
        { x: 190, y: 450, width: 170, height: 22 },
        { x: 560, y: 260, width: 180, height: 160 },
        { x: 780, y: 440, width: 140, height: 22 },
        { x: 940, y: 250, width: 220, height: 24 }
      ],
      spikes: [{ x: 940, y: 560, width: 220, height: 20 }],
      particles: [],
      gates: [
        { id: 'g1', x: 560, y: 420, width: 26, height: 160 },
        { id: 'g2', x: 714, y: 420, width: 26, height: 160 }
      ],
      pressurePlates: [
        {
          id: 'p1',
          x: 210,
          y: 566,
          width: 72,
          height: 14,
          targetGateId: 'g1',
          requireLock: true
        },
        {
          id: 'p2',
          x: 240,
          y: 436,
          width: 72,
          height: 14,
          targetGateId: 'g2',
          requireLock: true
        }
      ],
      parTimeMs: 28000,
      parJumps: 8
    }
  }
];

export function getChronoLoopLevelById(id: string): ChronoLoopEntry | undefined {
  return CHRONO_LOOP_LEVELS.find((entry) => entry.id === id);
}

export function getNextChronoLoopLevel(currentId: string): ChronoLoopEntry | undefined {
  const idx = CHRONO_LOOP_LEVELS.findIndex((entry) => entry.id === currentId);
  if (idx < 0 || idx + 1 >= CHRONO_LOOP_LEVELS.length) return undefined;
  return CHRONO_LOOP_LEVELS[idx + 1];
}
