import type { DiscoveryBoxConfig, LevelData, MatterState, Spike } from '../types';

export interface PeriodDefinition {
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  zStart: number;
  zEnd: number;
  elementRange: string;
  nobleGasZ: number;
  nobleGasSymbol: string;
  name: string;
  unlockedMechanics: readonly string[];
  nobleTheme: string;
}

export interface MilestoneDefinition {
  level: number;
  symbol: string;
  mechanic: string;
  label: string;
  hintSteps: [string, string];
}

export interface CampaignLevelDirectives {
  level: number;
  period: PeriodDefinition;
  isNobleGas: boolean;
  isMilestone: boolean;
  discoveryBox?: DiscoveryBoxConfig;
  isolatedMechanic?: string;
  unlockedMechanics: string[];
}

export const NOBLE_GAS_LEVELS = [2, 10, 18, 36, 54, 86, 118] as const;

export const MILESTONE_LEVEL_NUMBERS = [
  4, 6, 8, 11, 14, 18, 19, 26, 35, 40, 47, 55, 80, 87
] as const;

export const PERIODS: readonly PeriodDefinition[] = [
  {
    period: 1,
    zStart: 1,
    zEnd: 2,
    elementRange: 'H → He',
    nobleGasZ: 2,
    nobleGasSymbol: 'He',
    name: 'Période 1 — Éveil Cinétique',
    unlockedMechanics: ['touch_ribbon', 'asymmetric_jump', 'flick_down', 'wall_bounce'],
    nobleTheme: 'Autoroute d’ascendance gazeuse (gas) et rebonds fluides sans piques'
  },
  {
    period: 2,
    zStart: 3,
    zEnd: 10,
    elementRange: 'Li → Ne',
    nobleGasZ: 10,
    nobleGasSymbol: 'Ne',
    name: 'Période 2 — Superposition & Phases',
    unlockedMechanics: ['superposition_orbital', 'clone_fusion', 'phase_shift_hud'],
    nobleTheme: 'Flipper synthwave de murs néon, pistes cryo et nuages gazeux'
  },
  {
    period: 3,
    zStart: 11,
    zEnd: 18,
    elementRange: 'Na → Ar',
    nobleGasZ: 18,
    nobleGasSymbol: 'Ar',
    name: 'Période 3 — Tunnel, Ondes & Tore',
    unlockedMechanics: ['quantum_tunneling', 'de_broglie_wave', 'screen_wrap'],
    nobleTheme: 'Chute libre infinie en cylindre toroïdal horizontal/vertical sans danger'
  },
  {
    period: 4,
    zStart: 19,
    zEnd: 36,
    elementRange: 'K → Kr',
    nobleGasZ: 36,
    nobleGasSymbol: 'Kr',
    name: 'Période 4 — Intrication & Fluides',
    unlockedMechanics: ['entanglement_reveal', 'entanglement_tether', 'liquid_platforms'],
    nobleTheme: 'Ballet aquatique et pendulaire à deux héros intriqués'
  },
  {
    period: 5,
    zStart: 37,
    zEnd: 54,
    elementRange: 'Rb → Xe',
    nobleGasZ: 54,
    nobleGasSymbol: 'Xe',
    name: 'Période 5 — Plancher Vivant & Pinning',
    unlockedMechanics: ['living_floor', 'quantum_pinning'],
    nobleTheme: 'Symphonie de plateformes de phase figées au doigt et trampolines plasma'
  },
  {
    period: 6,
    zStart: 55,
    zEnd: 86,
    elementRange: 'Cs → Rn',
    nobleGasZ: 86,
    nobleGasSymbol: 'Rn',
    name: 'Période 6 — Temps, Trous de Ver & Mercure',
    unlockedMechanics: ['time_dilation_wormhole', 'mercury_bath'],
    nobleTheme: 'Parkour supersonique à travers une chaîne de trous de ver et bassins de mercure'
  },
  {
    period: 7,
    zStart: 87,
    zEnd: 118,
    elementRange: 'Fr → Og',
    nobleGasZ: 118,
    nobleGasSymbol: 'Og',
    name: 'Période 7 — Demi-Vie, Surf Temporel & Constellation',
    unlockedMechanics: ['half_life_decay', 'ghost_surfing', 'master_constellation'],
    nobleTheme: 'Apothéose cosmique entourée des fantômes de tous les éléments précédents'
  }
] as const;

export const MILESTONE_DEFINITIONS: Readonly<Record<number, MilestoneDefinition>> = {
  4: {
    level: 4,
    symbol: 'Be',
    mechanic: 'superposition_orbital',
    label: 'Superposition & Switch Orbital',
    hintSteps: ['JUMP / TAP', 'SWITCH ORBIT']
  },
  6: {
    level: 6,
    symbol: 'C',
    mechanic: 'clone_fusion',
    label: 'Fusion & Scission de Clones Super-Quanta',
    hintSteps: ['GRAB 2x CLONE', 'MERGE QUANTA']
  },
  8: {
    level: 8,
    symbol: 'O',
    mechanic: 'phase_shift_hud',
    label: 'Phases Cyan/Magenta & Secret HUD',
    hintSteps: ['JUMP / TAP HUD', 'CYAN ↔ MAGENTA']
  },
  11: {
    level: 11,
    symbol: 'Na',
    mechanic: 'quantum_tunneling',
    label: 'Effet Tunnel',
    hintSteps: ['GRAB TUNNEL ORB', 'PASS THROUGH WALL']
  },
  14: {
    level: 14,
    symbol: 'Si',
    mechanic: 'de_broglie_wave',
    label: 'Échafaudage d’Onde de Broglie solidifiée',
    hintSteps: ['AIR SPACE / [C]', 'SOLIDIFY TRAIL']
  },
  18: {
    level: 18,
    symbol: 'Ar',
    mechanic: 'screen_wrap',
    label: 'Cylindre Spatial Screen-Wrap',
    hintSteps: ['CROSS EDGE', 'WRAP TORUS']
  },
  19: {
    level: 19,
    symbol: 'K',
    mechanic: 'entanglement_reveal',
    label: 'Intrication avec Dézoom Révélation',
    hintSteps: ['MOVE ALPHA', 'MIRROR BETA']
  },
  26: {
    level: 26,
    symbol: 'Fe',
    mechanic: 'entanglement_tether',
    label: 'Corde d’Intrication Physique & Supernova',
    hintSteps: ['PULL TETHER', 'SWING & LAUNCH']
  },
  35: {
    level: 35,
    symbol: 'Br',
    mechanic: 'liquid_platforms',
    label: 'Plateformes Liquides',
    hintSteps: ['ENTER LIQUID', 'BUOYANT JUMP']
  },
  40: {
    level: 40,
    symbol: 'Zr',
    mechanic: 'living_floor',
    label: 'Archétype Plancher Vivant Semelle-contre-Semelle',
    hintSteps: ['ALIGN +G / -G', 'WALK SOLE-TO-SOLE']
  },
  47: {
    level: 47,
    symbol: 'Ag',
    mechanic: 'quantum_pinning',
    label: 'Observation au Doigt Quantum Pinning',
    hintSteps: ['HOLD PLATFORM', 'PIN PHASE']
  },
  55: {
    level: 55,
    symbol: 'Cs',
    mechanic: 'time_dilation_wormhole',
    label: 'Dilatation Temporelle & Trous de Ver α↔ω',
    hintSteps: ['SLOW TIME 0.25x', 'ENTER WORMHOLE α↔ω']
  },
  80: {
    level: 80,
    symbol: 'Hg',
    mechanic: 'mercury_bath',
    label: 'Bains de Mercure Liquide',
    hintSteps: ['SINK IN MERCURY', 'HIGH BUOYANCY']
  },
  87: {
    level: 87,
    symbol: 'Fr',
    mechanic: 'ghost_surfing',
    label: 'Surf Temporel sur Fantôme',
    hintSteps: ['FOLLOW GHOST', 'SURF TEMPORAL WAVE']
  }
};

export function getPeriodForLevel(z: number): PeriodDefinition {
  const clamped = Math.max(1, Math.min(118, Math.round(z)));
  for (const p of PERIODS) {
    if (clamped >= p.zStart && clamped <= p.zEnd) {
      return p;
    }
  }
  return PERIODS[PERIODS.length - 1];
}

export function isNobleGasLevel(z: number): boolean {
  return (NOBLE_GAS_LEVELS as readonly number[]).includes(z);
}

export function isMilestoneLevel(z: number): boolean {
  return Object.prototype.hasOwnProperty.call(MILESTONE_DEFINITIONS, z);
}

export function getMilestoneDiscoveryBox(z: number): DiscoveryBoxConfig | undefined {
  const def = MILESTONE_DEFINITIONS[z];
  if (!def) return undefined;
  return {
    enabled: true,
    mechanic: def.mechanic,
    hintSteps: def.hintSteps,
    safeZoneRatio: 0.35
  };
}

export function getUnlockedMechanicsForLevel(z: number): string[] {
  const period = getPeriodForLevel(z);
  const unlocked = new Set<string>();
  for (const p of PERIODS) {
    if (p.period < period.period) {
      for (const m of p.unlockedMechanics) {
        unlocked.add(m);
      }
    }
  }
  // In the current period, only include mechanics whose milestone <= z
  for (const m of period.unlockedMechanics) {
    const milestoneEntry = Object.values(MILESTONE_DEFINITIONS).find((d) => d.mechanic === m);
    if (!milestoneEntry || milestoneEntry.level <= z) {
      unlocked.add(m);
    }
  }
  return Array.from(unlocked);
}

export function getCampaignDirectives(z: number): CampaignLevelDirectives {
  const period = getPeriodForLevel(z);
  const noble = isNobleGasLevel(z);
  const milestoneDef = MILESTONE_DEFINITIONS[z];
  const discoveryBox = getMilestoneDiscoveryBox(z);

  return {
    level: z,
    period,
    isNobleGas: noble,
    isMilestone: Boolean(milestoneDef),
    discoveryBox,
    isolatedMechanic: milestoneDef?.mechanic,
    unlockedMechanics: getUnlockedMechanicsForLevel(z)
  };
}

/**
 * Removes or clips any spikes overlapping the Safe Discovery Zone [0, width * safeRatio]
 * so milestone levels have a guaranteed hazard-free onboarding zone (0-35% of the level).
 */
export function sanitizeSafeDiscoveryZone(levelData: LevelData, safeRatio = 0.35): LevelData {
  const safeMaxX = Math.ceil(levelData.width * safeRatio);
  const sanitizedSpikes: Spike[] = [];

  for (const s of levelData.spikes ?? []) {
    const sw = s.width ?? 32;
    const sRight = s.x + sw;
    if (sRight <= safeMaxX) {
      // Completely inside the safe zone -> remove
      continue;
    }
    if (s.x < safeMaxX && sRight > safeMaxX) {
      // Spans across the safe zone boundary (e.g. bottom pit spike) -> clip to start at safeMaxX
      sanitizedSpikes.push({
        ...s,
        x: safeMaxX,
        width: sRight - safeMaxX
      });
      continue;
    }
    sanitizedSpikes.push(s);
  }

  // Ensure there is a continuous safe floor across the discovery zone if there was a bottom pit
  const hasSafeFloor = levelData.platforms.some(
    (p) => p.x <= levelData.player.position.x && p.x + p.width >= Math.min(safeMaxX * 0.6, 500)
  );
  const platforms = hasSafeFloor
    ? levelData.platforms
    : [
        ...levelData.platforms,
        {
          x: 0,
          y: levelData.height - 40,
          width: safeMaxX,
          height: 40
        }
      ];

  return {
    ...levelData,
    spikes: sanitizedSpikes,
    platforms
  };
}

function getNoblePlaygroundMatterState(z: number): MatterState {
  switch (z) {
    case 2:
      return 'gas';
    case 10:
      return 'cryo';
    case 18:
      return 'gas';
    case 36:
      return 'liquid';
    case 54:
      return 'plasma';
    case 86:
      return 'liquid';
    case 118:
      return 'plasma';
    default:
      return 'gas';
  }
}

/**
 * Applies Kishōtenketsu 7-period campaign rules to a LevelData:
 * - Attaches `period`
 * - Enforces Noble Gas deathless playground rules (`spikes: []`, `noblePlayground: true`, safety floor)
 * - Enforces Safe Discovery Box rules on milestone levels (`discoveryBox`, hazard-free 0..35% zone)
 */
export function applyCampaignDirectives(levelData: LevelData, z: number): LevelData {
  const directives = getCampaignDirectives(z);
  let result: LevelData = {
    ...levelData,
    period: directives.period.period
  };

  if (directives.isMilestone && directives.discoveryBox) {
    result = sanitizeSafeDiscoveryZone(result, directives.discoveryBox.safeZoneRatio ?? 0.35);
    result.discoveryBox = directives.discoveryBox;
  }

  if (directives.isNobleGas) {
    const nobleMatter = getNoblePlaygroundMatterState(z);
    const hasSafetyFloor = result.platforms.some(
      (p) => p.x <= 40 && p.x + p.width >= result.width - 40 && p.y >= result.height - 60
    );
    const platforms = hasSafetyFloor
      ? result.platforms
      : [
          ...result.platforms,
          {
            x: 0,
            y: result.height - 32,
            width: result.width,
            height: 32,
            matterState: nobleMatter
          }
        ];

    result = {
      ...result,
      noblePlayground: true,
      spikes: [],
      platforms,
      ...(z === 18 ? { screenWrap: result.screenWrap ?? 'both' } : {})
    };
  }

  return result;
}

export type CampaignPrimaryTheme =
  | 'pure'
  | 'speed'
  | 'lowGravity'
  | 'wall'
  | 'duplicate_gate'
  | 'clone_fusion'
  | 'phase'
  | 'tunnel'
  | 'condense'
  | 'antiGravity'
  | 'decay'
  | 'pauli'
  | 'wormhole'
  | 'liquid_basin'
  | 'archetype';

export type CampaignArchetypeId =
  | 'living_floor'
  | 'phase_remote'
  | 'perpetual_metronome'
  | 'midair_assist'
  | 'pauli_trampoline'
  | 'conservation_cage';

export interface CampaignMechanicPlan {
  level: number;
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  primary: CampaignPrimaryTheme;
  archetypeId?: CampaignArchetypeId;
  matterState?: MatterState;
  allowCloneFusion?: boolean;
  screenWrap?: 'horizontal' | 'vertical' | 'both';
  entanglement?: {
    mode: 'mirror_x' | 'inverted_gravity' | 'mirror_and_gravity';
    portalMode?: 'single' | 'dual';
    tetherPhysical?: boolean;
    revealInSafeZone?: boolean;
    allowHeroCollision?: boolean;
  };
  addWormhole?: boolean;
  addTimeDilation?: boolean;
  addGatePlate?: boolean;
  addDuplicate?: boolean;
  addPhaseClimax?: boolean;
  addDecayClimax?: boolean;
  addTunnelBarrier?: boolean;
  addCondenseChasm?: boolean;
}

const ARCHETYPE_CYCLE: readonly CampaignArchetypeId[] = [
  'phase_remote',
  'perpetual_metronome',
  'midair_assist',
  'pauli_trampoline',
  'conservation_cage',
  'living_floor'
];

const MATTER_CYCLE: readonly MatterState[] = ['liquid', 'cryo', 'gas', 'plasma'];

/**
 * Deterministic 7-period campaign mechanic planner (Spec 02).
 * Guarantees period-appropriate mechanic ramp-up, rich multi-mechanic combinations,
 * and strict global quotas across all 118 levels while preserving all 14 Milestones.
 */
export function getPeriodMechanicPlan(z: number): CampaignMechanicPlan {
  const period = getPeriodForLevel(z).period;

  // --- Period 1 (Z 1-2): Pure movement, neon walls, ascending gas ---
  if (z === 1) {
    return { level: z, period, primary: 'pure' };
  }
  if (z === 2) {
    return { level: z, period, primary: 'pure', matterState: 'gas' };
  }

  // --- Period 2 (Z 3-10): duplicate + clone fusion + cyan/magenta phases (>= 60%) ---
  if (period === 2) {
    switch (z) {
      case 3:
        return { level: z, period, primary: 'pure' };
      case 4:
        return { level: z, period, primary: 'duplicate_gate', addDuplicate: true, addGatePlate: true };
      case 5:
        return { level: z, period, primary: 'speed', addPhaseClimax: true };
      case 6:
        return {
          level: z,
          period,
          primary: 'clone_fusion',
          allowCloneFusion: true,
          addDuplicate: true,
          addPhaseClimax: true
        };
      case 7:
        return {
          level: z,
          period,
          primary: 'clone_fusion',
          allowCloneFusion: true,
          addDuplicate: true,
          addPhaseClimax: true
        };
      case 8:
        return { level: z, period, primary: 'phase', addPhaseClimax: true };
      case 9:
        return { level: z, period, primary: 'lowGravity', addPhaseClimax: true };
      case 10:
      default:
        return {
          level: z,
          period,
          primary: 'clone_fusion',
          allowCloneFusion: true,
          addDuplicate: true,
          addPhaseClimax: true,
          matterState: 'cryo'
        };
    }
  }

  // --- Period 3 (Z 11-18): tunnel + condense (de Broglie) + screenWrap + phases ---
  if (period === 3) {
    switch (z) {
      case 11:
        return { level: z, period, primary: 'tunnel', addPhaseClimax: true };
      case 12:
        return { level: z, period, primary: 'speed', addTunnelBarrier: true, addPhaseClimax: true };
      case 13:
        return { level: z, period, primary: 'tunnel', addPhaseClimax: true, screenWrap: 'horizontal' };
      case 14:
        return { level: z, period, primary: 'condense', addPhaseClimax: true };
      case 15:
        return { level: z, period, primary: 'condense', addPhaseClimax: true };
      case 16:
        return { level: z, period, primary: 'condense', addPhaseClimax: true, screenWrap: 'horizontal' };
      case 17:
        return { level: z, period, primary: 'tunnel', addPhaseClimax: true, screenWrap: 'horizontal' };
      case 18:
      default:
        return { level: z, period, primary: 'wall', screenWrap: 'both', matterState: 'gas' };
    }
  }

  // --- Period 4 (Z 19-36): entanglement (with/without tether), matterState, gates/pressurePlates ---
  if (period === 4) {
    if (z === 19) {
      return {
        level: z,
        period,
        primary: 'wall',
        matterState: 'cryo',
        entanglement: { mode: 'mirror_x', revealInSafeZone: true }
      };
    }
    if (z === 22) {
      return { level: z, period, primary: 'antiGravity', matterState: 'cryo' };
    }
    if (z === 26) {
      return {
        level: z,
        period,
        primary: 'speed',
        addDecayClimax: true,
        entanglement: { mode: 'mirror_x', tetherPhysical: true }
      };
    }
    if (z === 29) {
      return { level: z, period, primary: 'tunnel', matterState: 'cryo' };
    }
    if (z === 35) {
      return {
        level: z,
        period,
        primary: 'liquid_basin',
        matterState: 'liquid',
        addTunnelBarrier: true,
        addGatePlate: true,
        addDuplicate: true
      };
    }
    if (z === 36) {
      return {
        level: z,
        period,
        primary: 'phase',
        matterState: 'liquid',
        entanglement: { mode: 'mirror_x', tetherPhysical: true }
      };
    }

    const idx = z - 20;
    const matter = MATTER_CYCLE[idx % MATTER_CYCLE.length];
    const hasEnt = idx % 2 === 0;
    const hasTether = hasEnt && idx % 4 === 0;
    const isGate = idx % 3 === 1;
    const isCondense = z === 23 || z === 32;
    const isTunnel = z === 20 || z === 28 || z === 31;

    return {
      level: z,
      period,
      primary: isGate
        ? 'duplicate_gate'
        : isCondense
          ? 'condense'
          : isTunnel
            ? 'tunnel'
            : matter === 'liquid'
              ? 'liquid_basin'
              : 'phase',
      matterState: matter,
      ...(hasEnt
        ? { entanglement: { mode: 'mirror_x' as const, tetherPhysical: hasTether } }
        : {}),
      ...(isGate ? { addDuplicate: true, addGatePlate: true } : {}),
      addPhaseClimax: !isGate && idx % 2 === 1
    };
  }

  // --- Period 5 (Z 37-54): Smart Archetypes multi-room variants + quantum_pinning ---
  if (period === 5) {
    if (z === 40) {
      return {
        level: z,
        period,
        primary: 'archetype',
        archetypeId: 'living_floor',
        entanglement: { mode: 'inverted_gravity', allowHeroCollision: true }
      };
    }
    if (z === 42) {
      return {
        level: z,
        period,
        primary: 'archetype',
        archetypeId: 'phase_remote',
        addDuplicate: true,
        addPhaseClimax: true
      };
    }
    if (z === 46) {
      return {
        level: z,
        period,
        primary: 'speed',
        addTunnelBarrier: true,
        addPhaseClimax: true,
        matterState: 'plasma'
      };
    }
    if (z === 47) {
      return {
        level: z,
        period,
        primary: 'phase',
        addDecayClimax: true,
        addTunnelBarrier: true
      };
    }
    if (z === 52) {
      return { level: z, period, primary: 'pauli', addDuplicate: true, addDecayClimax: true };
    }
    if (z === 54) {
      return {
        level: z,
        period,
        primary: 'phase',
        matterState: 'plasma',
        allowCloneFusion: true,
        addDuplicate: true
      };
    }

    // All other 12 levels in Period 5 are multi-room Smart Archetype variants + quantum pinning
    const archIdx = (z - 37) % ARCHETYPE_CYCLE.length;
    const archetypeId = ARCHETYPE_CYCLE[archIdx];
    const matter = MATTER_CYCLE[(z - 37) % MATTER_CYCLE.length];
    return {
      level: z,
      period,
      primary: 'archetype',
      archetypeId,
      matterState: matter,
      addPhaseClimax: archIdx % 2 === 0,
      ...(archetypeId === 'living_floor'
        ? { entanglement: { mode: 'inverted_gravity' as const, allowHeroCollision: true } }
        : {})
    };
  }

  // --- Period 6 (Z 55-86): wormholes + timeDilation + decayMs + mercury liquid baths ---
  if (period === 6) {
    if (z === 55) {
      return {
        level: z,
        period,
        primary: 'archetype',
        archetypeId: 'perpetual_metronome',
        addTimeDilation: true,
        addWormhole: true,
        addDuplicate: true,
        addGatePlate: true
      };
    }
    if (z === 68) {
      return {
        level: z,
        period,
        primary: 'pauli',
        archetypeId: 'midair_assist',
        addDuplicate: true,
        addGatePlate: true,
        addDecayClimax: true
      };
    }
    if (z === 74) {
      return { level: z, period, primary: 'decay', addTimeDilation: true };
    }
    if (z === 79) {
      return {
        level: z,
        period,
        primary: 'wormhole',
        addWormhole: true,
        addPhaseClimax: true,
        matterState: 'liquid'
      };
    }
    if (z === 80) {
      return {
        level: z,
        period,
        primary: 'liquid_basin',
        matterState: 'liquid',
        addWormhole: true,
        addDecayClimax: true
      };
    }
    if (z === 84) {
      return {
        level: z,
        period,
        primary: 'speed',
        addTunnelBarrier: true,
        addDecayClimax: true,
        addWormhole: true
      };
    }
    if (z === 86) {
      return {
        level: z,
        period,
        primary: 'wormhole',
        addWormhole: true,
        screenWrap: 'horizontal',
        matterState: 'liquid'
      };
    }

    const idx = z - 55;
    // 6 Smart Archetype variants in Period 6
    if (idx === 2 || idx === 6 || idx === 10 || idx === 16 || idx === 21 || idx === 27) {
      const archetypeId = ARCHETYPE_CYCLE[idx % ARCHETYPE_CYCLE.length];
      return {
        level: z,
        period,
        primary: 'archetype',
        archetypeId,
        matterState: 'liquid',
        addWormhole: idx % 2 === 0,
        addTimeDilation: true,
        ...(archetypeId === 'living_floor'
          ? { entanglement: { mode: 'inverted_gravity' as const, allowHeroCollision: true } }
          : {})
      };
    }

    const isCondense = z === 59 || z === 66 || z === 72 || z === 78;
    const isTunnel = z === 56 || z === 63 || z === 69 || z === 75 || z === 81;
    const isGate = z === 60 || z === 67 || z === 76 || z === 85;
    const hasEnt = z === 58 || z === 64 || z === 73 || z === 83;
    const hasTether = z === 64 || z === 83;
    const hasWormhole = idx % 2 === 1 || z === 58 || z === 64;

    return {
      level: z,
      period,
      primary: isCondense
        ? 'condense'
        : isTunnel
          ? 'tunnel'
          : isGate
            ? 'duplicate_gate'
            : hasWormhole
              ? 'wormhole'
              : 'liquid_basin',
      matterState: idx % 3 === 0 ? 'liquid' : MATTER_CYCLE[idx % MATTER_CYCLE.length],
      addWormhole: hasWormhole,
      addTimeDilation: idx % 2 === 0,
      addDecayClimax: true,
      ...(hasEnt
        ? { entanglement: { mode: 'mirror_x' as const, tetherPhysical: hasTether } }
        : {}),
      ...(isGate ? { addDuplicate: true, addGatePlate: true } : {})
    };
  }

  // --- Period 7 (Z 87-118): Expert syntheses combining 3-4 mechanics per level (2000-4800px) ---
  if (z === 87) {
    return {
      level: z,
      period,
      primary: 'phase',
      matterState: 'cryo',
      addDecayClimax: true,
      addWormhole: true
    };
  }
  if (z === 88) {
    return {
      level: z,
      period,
      primary: 'antiGravity',
      archetypeId: 'conservation_cage',
      addTunnelBarrier: true,
      addPhaseClimax: true
    };
  }
  if (z === 100) {
    return {
      level: z,
      period,
      primary: 'pauli',
      addDuplicate: true,
      addTunnelBarrier: true,
      addDecayClimax: true,
      matterState: 'plasma'
    };
  }
  if (z === 109) {
    return {
      level: z,
      period,
      primary: 'speed',
      addTunnelBarrier: true,
      addTimeDilation: true
    };
  }
  if (z === 110) {
    return {
      level: z,
      period,
      primary: 'wormhole',
      addWormhole: true,
      addPhaseClimax: true,
      matterState: 'liquid',
      entanglement: { mode: 'mirror_x', portalMode: 'dual', revealInSafeZone: true }
    };
  }
  if (z === 111) {
    return {
      level: z,
      period,
      primary: 'tunnel',
      addPhaseClimax: true,
      addWormhole: true,
      matterState: 'cryo',
      entanglement: { mode: 'mirror_x', portalMode: 'single' }
    };
  }
  if (z === 112) {
    return {
      level: z,
      period,
      primary: 'archetype',
      archetypeId: 'living_floor',
      matterState: 'plasma',
      addDecayClimax: true,
      entanglement: { mode: 'inverted_gravity', portalMode: 'dual', allowHeroCollision: true }
    };
  }
  if (z === 113) {
    return {
      level: z,
      period,
      primary: 'condense',
      addPhaseClimax: true,
      addDecayClimax: true,
      matterState: 'liquid',
      entanglement: { mode: 'inverted_gravity', portalMode: 'dual' }
    };
  }
  if (z === 114) {
    return {
      level: z,
      period,
      primary: 'archetype',
      archetypeId: 'midair_assist',
      addWormhole: true,
      addTimeDilation: true,
      matterState: 'plasma',
      entanglement: { mode: 'mirror_and_gravity', portalMode: 'dual' }
    };
  }
  if (z === 118) {
    return {
      level: z,
      period,
      primary: 'phase',
      matterState: 'plasma',
      allowCloneFusion: true,
      addDuplicate: true,
      addWormhole: true
    };
  }

  const idx = z - 87;
  // 6 Expert Smart Archetype syntheses in Period 7
  if (idx === 3 || idx === 8 || idx === 15 || idx === 19 || idx === 27 || idx === 29) {
    const archetypeId = ARCHETYPE_CYCLE[idx % ARCHETYPE_CYCLE.length];
    return {
      level: z,
      period,
      primary: 'archetype',
      archetypeId,
      matterState: MATTER_CYCLE[idx % MATTER_CYCLE.length],
      addWormhole: true,
      addTimeDilation: true,
      addPhaseClimax: idx % 2 === 0,
      ...(archetypeId === 'living_floor'
        ? { entanglement: { mode: 'inverted_gravity' as const, allowHeroCollision: true } }
        : {})
    };
  }

  // Remaining 25 expert levels: every level combines 3-4 mechanics!
  const recipe = idx % 5;
  const matter = MATTER_CYCLE[idx % MATTER_CYCLE.length];
  if (recipe === 0) {
    // Tunnel + Phase + Wormhole + MatterState
    return {
      level: z,
      period,
      primary: 'tunnel',
      matterState: matter,
      addPhaseClimax: true,
      addWormhole: true,
      addTimeDilation: idx % 2 === 0
    };
  }
  if (recipe === 1) {
    // Condense + Phase + Decay + ScreenWrap
    return {
      level: z,
      period,
      primary: 'condense',
      matterState: matter,
      addPhaseClimax: true,
      addDecayClimax: true,
      screenWrap: 'horizontal'
    };
  }
  if (recipe === 2) {
    // Duplicate + Gate/Plate + Entanglement (with tetherPhysical) + MatterState
    return {
      level: z,
      period,
      primary: 'duplicate_gate',
      matterState: matter,
      addDuplicate: true,
      addGatePlate: true,
      addTimeDilation: true,
      entanglement: { mode: 'mirror_x', tetherPhysical: idx % 4 === 2 }
    };
  }
  if (recipe === 3) {
    // Wormhole + TimeDilation + Decay + Entanglement
    return {
      level: z,
      period,
      primary: 'wormhole',
      matterState: matter,
      addWormhole: true,
      addTimeDilation: true,
      addDecayClimax: true,
      entanglement: { mode: 'mirror_x', tetherPhysical: idx % 6 === 3 }
    };
  }
  // recipe === 4: Clone Fusion + Tunnel + Phase + MatterState
  return {
    level: z,
    period,
    primary: 'clone_fusion',
    allowCloneFusion: true,
    addDuplicate: true,
    addTunnelBarrier: true,
    addPhaseClimax: true,
    matterState: matter
  };
}
