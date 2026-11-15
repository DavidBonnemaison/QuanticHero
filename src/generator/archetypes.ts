import type { LevelData } from '../types';

export type SmartArchetypeId =
  | 'living_floor'
  | 'phase_remote'
  | 'perpetual_metronome'
  | 'midair_assist'
  | 'pauli_trampoline'
  | 'conservation_cage';

/**
 * Archétype #1 — « Le Plancher Vivant »
 * Alpha (gravité +700) et Beta (gravité -700) partagent la même chambre au-dessus d'un gouffre.
 * Avec `allowHeroCollision: true`, ils se percutent pied contre pied à mi-hauteur (`y = height / 2`)
 * et deviennent le plancher vivant l'un de l'autre pour traverser le vide.
 */
export function createLivingFloorArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1400;
  const height = overrides.height ?? 800;
  const midY = Math.round(height / 2);

  return {
    id: '112',
    symbol: 'Cn',
    atom: 'Copernicium',
    archetype: 'living_floor',
    uncertainty: 1,
    width,
    height,
    hue: '#081b26',
    antiHue: '#00e5ff',
    explanations: [
      'Le Plancher Vivant : Alpha (+g) et Beta (-g) se percutent pied contre pied à mi-hauteur.',
      'Leurs gravités opposées s’annulent : marchez ensemble au-dessus du gouffre !'
    ],
    entanglement: {
      mode: 'inverted_gravity',
      allowHeroCollision: true,
      betaSpawn: { x: 140, y: 120 },
      portalMode: 'dual',
      betaDoor: { x: width - 120, y: midY - 60 }
    },
    player: { position: { x: 140, y: height - 120 } },
    platforms: [
      // Starting ledges
      { x: 60, y: height - 80, width: 220, height: 24 },
      { x: 60, y: 56, width: 220, height: 24 },
      // Landing ledges near dual portals (no floor/ceiling in the middle chasm!)
      { x: width - 260, y: midY + 40, width: 200, height: 24 },
      { x: width - 260, y: midY - 120, width: 200, height: 24 }
    ],
    spikes: [
      { x: 0, y: height - 16, width, height: 16 },
      { x: 0, y: 0, width, height: 16 }
    ],
    particles: [],
    door: { x: width - 120, y: midY + 40 },
    ...overrides
  };
}

/**
 * Archétype #2 — « Le Télécommandeur de Phase »
 * Héros A traverse un tunnel bas hérissé de piques au plafond au-dessus d'un pont alterné cyan/magenta.
 * Clone B reste dans une chambre latérale sécurisée et saute sur place en rythme pour commuter
 * les plateformes sous les pieds de A.
 */
export function createPhaseRemoteArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1500;
  const height = overrides.height ?? 900;

  return {
    id: '42',
    symbol: 'Mo',
    atom: 'Molybdenum',
    archetype: 'phase_remote',
    uncertainty: 2,
    width,
    height,
    hue: '#0c1026',
    antiHue: '#ec4899',
    explanations: [
      'Le Télécommandeur de Phase : sauter dans le tunnel bas est mortel.',
      'Basculez sur le Clone B en chambre latérale et sautez en rythme pour commuter le pont sous A !'
    ],
    player: { position: { x: 380, y: 740 } },
    particles: [{ x: 260, y: 740, type: 'duplicate' }],
    platforms: [
      // Lateral safe chamber for Clone B (left)
      { x: 60, y: 780, width: 240, height: 28 },
      { x: 40, y: 560, width: 20, height: 248, kind: 'wall' },
      { x: 300, y: 560, width: 20, height: 248, kind: 'wall' },
      // Entry ledge for Hero A
      { x: 320, y: 780, width: 160, height: 28 },
      // Low tunnel ceiling (prevents jumping inside tunnel)
      { x: 480, y: 650, width: 720, height: 28 },
      // Alternating cyan -> magenta -> cyan bridge
      { x: 500, y: 780, width: 200, height: 24, phase: 'cyan' },
      { x: 740, y: 780, width: 200, height: 24, phase: 'magenta' },
      { x: 980, y: 780, width: 200, height: 24, phase: 'cyan' },
      // Exit platform
      { x: 1220, y: 780, width: 220, height: 28 }
    ],
    spikes: [
      // Low ceiling spikes inside the tunnel: jumping = instant death
      { x: 500, y: 678, width: 680, height: 18 },
      // Abyss floor
      { x: 0, y: height - 16, width, height: 16 }
    ],
    door: { x: 1360, y: 780 },
    ...overrides
  };
}

/**
 * Archétype #3 — « Le Métronome Perpétuel »
 * Une plaque `requireLock` posée sur une plateforme à demi-vie rapide (`decayMs: 650`)
 * encadrée par deux murs rebondissants (`kind: 'wall'`).
 * Le clone rebondit perpétuellement d'un mur à l'autre, effleurant la plaque sans jamais
 * déclencher l'effondrement complet.
 */
export function createPerpetualMetronomeArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1400;
  const height = overrides.height ?? 900;

  return {
    id: '55',
    symbol: 'Cs',
    atom: 'Cesium',
    archetype: 'perpetual_metronome',
    uncertainty: 2,
    width,
    height,
    hue: '#141229',
    antiHue: '#f59e0b',
    explanations: [
      'Le Métronome Perpétuel : la plaque repose sur une plateforme instable (650 ms).',
      'Lancez un clone entre les deux murs rebondissants pour maintenir la porte ouverte !'
    ],
    player: { position: { x: 180, y: 740 } },
    particles: [{ x: 240, y: 740, type: 'duplicate' }],
    platforms: [
      { x: 80, y: 780, width: 240, height: 28 },
      // Left bouncing wall framing the fast-decay plate
      { x: 350, y: 640, width: 24, height: 160, kind: 'wall' },
      // Fast half-life decay platform (650 ms)
      { x: 390, y: 780, width: 220, height: 24, decayMs: 650 },
      // Right bouncing wall framing the fast-decay plate
      { x: 626, y: 640, width: 24, height: 160, kind: 'wall' },
      // Upper bridge to exit
      { x: 700, y: 740, width: 600, height: 28 }
    ],
    pressurePlates: [
      {
        id: 'metronome_plate',
        x: 460,
        y: 770,
        width: 80,
        height: 10,
        targetGateId: 'metronome_gate',
        requireLock: true
      }
    ],
    gates: [
      {
        id: 'metronome_gate',
        x: 1080,
        y: 580,
        width: 24,
        height: 160
      }
    ],
    spikes: [{ x: 0, y: height - 16, width, height: 16 }],
    door: { x: 1220, y: 740 },
    ...overrides
  };
}

/**
 * Archétype #4 — « La Passe Décisive en Plein Vol »
 * Une plaque de pression suspendue en plein air au-dessus d'un gouffre.
 * Le Héros 1 saute dans le vide pour toucher la plaque au sommet de sa parabole :
 * GameScene transfère automatiquement le focus et la caméra au Clone 2 à l'instant où la porte s'ouvre.
 */
export function createMidairAssistArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1400;
  const height = overrides.height ?? 900;

  return {
    id: '68',
    symbol: 'Er',
    atom: 'Erbium',
    archetype: 'midair_assist',
    uncertainty: 2,
    width,
    height,
    hue: '#111827',
    antiHue: '#10b981',
    explanations: [
      'La Passe Décisive en Plein Vol : touchez la plaque suspendue au sommet du saut.',
      'Le focus et la caméra basculeront automatiquement vers le Clone 2 devant la porte !'
    ],
    player: { position: { x: 160, y: 740 } },
    particles: [{ x: 240, y: 740, type: 'duplicate' }],
    platforms: [
      // Launch pad for Hero 1
      { x: 80, y: 780, width: 260, height: 28 },
      // Far ledge where Clone 2 waits in front of the gate
      { x: 760, y: 780, width: 560, height: 28 }
    ],
    pressurePlates: [
      {
        id: 'midair_plate',
        x: 490,
        y: 590,
        width: 96,
        height: 14,
        targetGateId: 'midair_gate',
        requireLock: false,
        autoSwitchOnTrigger: true
      }
    ],
    gates: [
      {
        id: 'midair_gate',
        x: 1040,
        y: 620,
        width: 24,
        height: 160
      }
    ],
    spikes: [{ x: 0, y: height - 16, width, height: 16 }],
    door: { x: 1240, y: 780 },
    ...overrides
  };
}

/**
 * Archétype #5 — « Le Trampoline Humain de Pauli »
 * Une cheminée verticale de 280 px (impossible à franchir avec un saut normal de 145 px).
 * Le Clone 1 se place au pied de la cheminée, le Clone 2 ramasse une particule `pauli`
 * et saute juste au-dessus du Clone 1 : l'explosion de répulsion (`vy = -580`, `vx = -620`)
 * catapulte le Clone 2 au sommet de la cheminée et propulse le Clone 1 sur une plaque éloignée.
 */
export function createPauliTrampolineArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1400;
  const height = overrides.height ?? 900;

  return {
    id: '74',
    symbol: 'W',
    atom: 'Tungsten',
    archetype: 'pauli_trampoline',
    uncertainty: 2,
    width,
    height,
    hue: '#1b1126',
    antiHue: '#f43f5e',
    explanations: [
      'Le Trampoline Humain de Pauli : la cheminée de 280 px dépasse la hauteur de saut.',
      'Placez un clone au pied, ramassez la particule Pauli et sautez au-dessus de lui !'
    ],
    player: { position: { x: 520, y: 740 } },
    particles: [
      { x: 420, y: 740, type: 'duplicate' },
      { x: 640, y: 740, type: 'pauli' }
    ],
    platforms: [
      // Main floor
      { x: 100, y: 780, width: 720, height: 28 },
      // 280 px tall vertical chimney walls (from y=500 to y=780)
      { x: 820, y: 500, width: 24, height: 280 },
      { x: 960, y: 500, width: 24, height: 280 },
      // Summit ledge at top of the 280 px chimney
      { x: 960, y: 500, width: 340, height: 28 }
    ],
    pressurePlates: [
      {
        id: 'pauli_lock_plate',
        x: 150,
        y: 770,
        width: 90,
        height: 10,
        targetGateId: 'pauli_gate',
        requireLock: true
      }
    ],
    gates: [
      {
        id: 'pauli_gate',
        x: 1120,
        y: 340,
        width: 24,
        height: 160
      }
    ],
    spikes: [{ x: 0, y: height - 16, width, height: 16 }],
    door: { x: 1240, y: 500 },
    ...overrides
  };
}

/**
 * Archétype #6 — « La Cage de Conservation » (Tentation Inversée)
 * Le portail de sortie est entouré de plateformes éphémères (`color: '#f1c40f'`).
 * Les toucher les fait disparaître, ouvrant l'accès au portail.
 * Une particule bonus appât brille juste devant : si le joueur la ramasse par réflexe,
 * `restoreEphemeralPlatforms()` referme la cage autour du portail !
 */
export function createConservationCageArchetype(overrides: Partial<LevelData> = {}): LevelData {
  const width = overrides.width ?? 1200;
  const height = overrides.height ?? 800;

  return {
    id: '88',
    symbol: 'Ra',
    atom: 'Radium',
    archetype: 'conservation_cage',
    uncertainty: 1,
    width,
    height,
    hue: '#141a0f',
    antiHue: '#f1c40f',
    explanations: [
      'La Cage de Conservation : effleurez les barreaux dorés pour ouvrir le portail.',
      'Méfiez-vous de la particule bonus devant la sortie : elle restaure la cage !'
    ],
    player: { position: { x: 160, y: 640 } },
    particles: [
      // Bait bonus particle right in front of the portal
      { x: 820, y: 640, type: 'speed', restoresEphemeral: true }
    ],
    platforms: [
      { x: 60, y: 680, width: 1080, height: 28 },
      // Ephemeral cage surrounding the portal (color: '#f1c40f')
      { x: 880, y: 540, width: 24, height: 140, color: '#f1c40f', ephemeral: true },
      { x: 880, y: 516, width: 180, height: 24, color: '#f1c40f', ephemeral: true },
      { x: 1036, y: 540, width: 24, height: 140, color: '#f1c40f', ephemeral: true }
    ],
    spikes: [{ x: 0, y: height - 16, width, height: 16 }],
    door: { x: 960, y: 680 },
    ...overrides
  };
}

export const SMART_ARCHETYPES: Record<
  SmartArchetypeId,
  (overrides?: Partial<LevelData>) => LevelData
> = {
  living_floor: createLivingFloorArchetype,
  phase_remote: createPhaseRemoteArchetype,
  perpetual_metronome: createPerpetualMetronomeArchetype,
  midair_assist: createMidairAssistArchetype,
  pauli_trampoline: createPauliTrampolineArchetype,
  conservation_cage: createConservationCageArchetype
};

export const CAMPAIGN_ARCHETYPE_MAPPING: Record<number, SmartArchetypeId> = {
  42: 'phase_remote',
  55: 'perpetual_metronome',
  68: 'midair_assist',
  74: 'pauli_trampoline',
  88: 'conservation_cage',
  112: 'living_floor'
};

export function getSmartArchetype(
  id: SmartArchetypeId,
  overrides: Partial<LevelData> = {}
): LevelData {
  return SMART_ARCHETYPES[id](overrides);
}

export function listSmartArchetypes(): SmartArchetypeId[] {
  return Object.keys(SMART_ARCHETYPES) as SmartArchetypeId[];
}
