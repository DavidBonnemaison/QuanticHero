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
    hintSteps: ['CONDENSE WAVE', 'WALK ON TRAIL']
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
