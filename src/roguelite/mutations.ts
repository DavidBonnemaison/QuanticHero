export type MutationRarity = 'Common' | 'Rare' | 'Exotic';

export interface MutationModifiers {
  speedMultiplier?: number;
  airControlMultiplier?: number;
  broglieWallWakeDurationMs?: number;
  phaseDashInvulnMs?: number;
  startingClones?: number;
  gravityMultiplier?: number;
  apexHangTimeMultiplier?: number;
  tunnelRegenIntervalMs?: number;
  reflexDilationRadiusPx?: number;
  reflexDilationScale?: number;
  reflexDilationDurationMs?: number;
  reflexDilationCooldownMs?: number;
  particleMagnetRadiusPx?: number;
  shieldChargesPerRoom?: number;
  coyoteBonusMs?: number;
  jumpBufferBonusMs?: number;
  jumpMultiplier?: number;
  coherenceGainMultiplier?: number;
  extraMaxLives?: number;
  healOnPick?: number;
  wallBounceBoostMultiplier?: number;
  waveDashSpeedMultiplier?: number;
}

export interface AggregatedMutationModifiers {
  speedMultiplier: number;
  airControlMultiplier: number;
  broglieWallWakeDurationMs: number;
  phaseDashInvulnMs: number;
  startingClones: number;
  gravityMultiplier: number;
  apexHangTimeMultiplier: number;
  tunnelRegenIntervalMs: number;
  reflexDilationRadiusPx: number;
  reflexDilationScale: number;
  reflexDilationDurationMs: number;
  reflexDilationCooldownMs: number;
  particleMagnetRadiusPx: number;
  shieldChargesPerRoom: number;
  coyoteBonusMs: number;
  jumpBufferBonusMs: number;
  jumpMultiplier: number;
  coherenceGainMultiplier: number;
  extraMaxLives: number;
  wallBounceBoostMultiplier: number;
  waveDashSpeedMultiplier: number;
}

export interface QuantumMutation {
  id: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
  icon: string;
  rarity: MutationRarity;
  stackable: boolean;
  maxStacks: number;
  synergies: string[];
  modifiers: MutationModifiers;
}

export interface MutationSynergy {
  id: string;
  requires: [string, string];
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
  bonusModifiers: Partial<MutationModifiers>;
}

export const DEFAULT_MUTATION_MODIFIERS: AggregatedMutationModifiers = {
  speedMultiplier: 1,
  airControlMultiplier: 1,
  broglieWallWakeDurationMs: 0,
  phaseDashInvulnMs: 0,
  startingClones: 0,
  gravityMultiplier: 1,
  apexHangTimeMultiplier: 1,
  tunnelRegenIntervalMs: 0,
  reflexDilationRadiusPx: 0,
  reflexDilationScale: 1,
  reflexDilationDurationMs: 0,
  reflexDilationCooldownMs: 0,
  particleMagnetRadiusPx: 0,
  shieldChargesPerRoom: 0,
  coyoteBonusMs: 0,
  jumpBufferBonusMs: 0,
  jumpMultiplier: 1,
  coherenceGainMultiplier: 1,
  extraMaxLives: 0,
  wallBounceBoostMultiplier: 1,
  waveDashSpeedMultiplier: 1
};

export const QUANTUM_MUTATIONS: readonly QuantumMutation[] = [
  {
    id: 'hyper_spin',
    nameEn: 'Hyper-Spin',
    nameFr: 'Hyper-Spin',
    descriptionEn: '+20% horizontal speed with reduced air inertia.',
    descriptionFr: '+20 % vitesse horizontale et inertie reduite en vol.',
    icon: '[>>]',
    rarity: 'Common',
    stackable: true,
    maxStacks: 2,
    synergies: ['phase_dash'],
    modifiers: {
      speedMultiplier: 1.2,
      airControlMultiplier: 0.78
    }
  },
  {
    id: 'broglie_wake',
    nameEn: 'de Broglie Wake',
    nameFr: 'Sillage de Broglie',
    descriptionEn: 'Every wall-jump solidifies a micro-platform behind you for 2.0 s.',
    descriptionFr: 'Chaque wall-jump solidifie une micro-plateforme derriere toi pendant 2.0 s.',
    icon: '[==]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 2,
    synergies: ['phonon_rebound'],
    modifiers: {
      broglieWallWakeDurationMs: 2000
    }
  },
  {
    id: 'phase_dash',
    nameEn: 'Phase Dash',
    nameFr: 'Phase Dash',
    descriptionEn: 'Wave-dash grants spike invulnerability for 0.35 s.',
    descriptionFr: 'Un wave-dash rend invulnerable aux piques pendant 0.35 s.',
    icon: '[//]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 2,
    synergies: ['hyper_spin', 'tachyon_dive'],
    modifiers: {
      phaseDashInvulnMs: 350
    }
  },
  {
    id: 'double_quantum',
    nameEn: 'Double Quantum',
    nameFr: 'Double Quantum',
    descriptionEn: 'Start every chamber with 1 active clone.',
    descriptionFr: 'Demarre chaque salle avec 1 clone deja actif.',
    icon: '[x2]',
    rarity: 'Exotic',
    stackable: false,
    maxStacks: 1,
    synergies: ['particle_magnet'],
    modifiers: {
      startingClones: 1
    }
  },
  {
    id: 'relative_gravity',
    nameEn: 'Relative Gravity',
    nameFr: 'Gravite Relative',
    descriptionEn: 'Apex Hang-Time x2 and gravity -15%.',
    descriptionFr: 'Apex Hang-Time double et gravite -15 %.',
    icon: '[g-]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 2,
    synergies: ['coyote_overclock'],
    modifiers: {
      apexHangTimeMultiplier: 2,
      gravityMultiplier: 0.85
    }
  },
  {
    id: 'infinite_tunnel',
    nameEn: 'Infinite Tunnel',
    nameFr: 'Tunnel Infini',
    descriptionEn: 'Regenerate 1 tunneling charge every 4.0 s.',
    descriptionFr: '1 charge de tunneling regeneree toutes les 4.0 s.',
    icon: '[||]',
    rarity: 'Exotic',
    stackable: true,
    maxStacks: 2,
    synergies: ['reflex_dilation'],
    modifiers: {
      tunnelRegenIntervalMs: 4000
    }
  },
  {
    id: 'reflex_dilation',
    nameEn: 'Reflex Dilation',
    nameFr: 'Dilatation Reflexe',
    descriptionEn: 'Near spikes (< 40 px), time slows to 0.35x for 0.4 s (5 s cooldown).',
    descriptionFr: 'Pres d un pique (< 40 px), le temps ralentit a 0.35x pendant 0.4 s (CD 5 s).',
    icon: '[dt]',
    rarity: 'Exotic',
    stackable: false,
    maxStacks: 1,
    synergies: ['infinite_tunnel'],
    modifiers: {
      reflexDilationRadiusPx: 40,
      reflexDilationScale: 0.35,
      reflexDilationDurationMs: 400,
      reflexDilationCooldownMs: 5000
    }
  },
  {
    id: 'particle_magnet',
    nameEn: 'Particle Magnet',
    nameFr: 'Aimant a Particules',
    descriptionEn: '120 px attraction radius on all quantum power-ups.',
    descriptionFr: 'Rayon d attraction de 120 px sur tous les power-ups.',
    icon: '[<>]',
    rarity: 'Common',
    stackable: true,
    maxStacks: 2,
    synergies: ['double_quantum'],
    modifiers: {
      particleMagnetRadiusPx: 120
    }
  },
  {
    id: 'quantum_shield',
    nameEn: 'Quantum Shield',
    nameFr: 'Bouclier Quantique',
    descriptionEn: 'Absorbs the first spike impact in each chamber.',
    descriptionFr: 'Absorbe le premier impact sur pique dans chaque salle.',
    icon: '[SH]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 2,
    synergies: ['extra_quantum'],
    modifiers: {
      shieldChargesPerRoom: 1
    }
  },
  {
    id: 'coyote_overclock',
    nameEn: 'Coyote Overclock',
    nameFr: 'Overclock Coyote',
    descriptionEn: '+70 ms coyote & jump buffer windows and +8% jump impulse.',
    descriptionFr: '+70 ms coyote et jump buffer, et +8 % impulsion de saut.',
    icon: '[+J]',
    rarity: 'Common',
    stackable: true,
    maxStacks: 2,
    synergies: ['relative_gravity'],
    modifiers: {
      coyoteBonusMs: 70,
      jumpBufferBonusMs: 70,
      jumpMultiplier: 1.08
    }
  },
  {
    id: 'coherence_surge',
    nameEn: 'Coherence Surge',
    nameFr: 'Surtension Coherente',
    descriptionEn: '+50% coherence build rate and +8% run speed.',
    descriptionFr: '+50 % gain de coherence et +8 % vitesse de course.',
    icon: '[C+]',
    rarity: 'Common',
    stackable: true,
    maxStacks: 3,
    synergies: ['tachyon_dive'],
    modifiers: {
      coherenceGainMultiplier: 1.5,
      speedMultiplier: 1.08
    }
  },
  {
    id: 'extra_quantum',
    nameEn: 'Extra Quantum',
    nameFr: 'Quantum Bonus',
    descriptionEn: '+1 max Quantum of Life and immediate +1 heal.',
    descriptionFr: '+1 Quantum de Vie max et soin immediat de +1.',
    icon: '[+Q]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 3,
    synergies: ['quantum_shield'],
    modifiers: {
      extraMaxLives: 1,
      healOnPick: 1
    }
  },
  {
    id: 'phonon_rebound',
    nameEn: 'Phonon Rebound',
    nameFr: 'Rebond Phonon',
    descriptionEn: '+18% wall-jump recoil velocity for sharper vertical climbs.',
    descriptionFr: '+18 % vitesse de rebond mural pour des ascensions eclairs.',
    icon: '[W^]',
    rarity: 'Common',
    stackable: true,
    maxStacks: 2,
    synergies: ['broglie_wake'],
    modifiers: {
      wallBounceBoostMultiplier: 1.18
    }
  },
  {
    id: 'tachyon_dive',
    nameEn: 'Tachyon Dive',
    nameFr: 'Plongeon Tachyon',
    descriptionEn: '+15% wave-dash speed burst for chaining dive-jumps.',
    descriptionFr: '+15 % vitesse de wave-dash pour enchainer les plongeons.',
    icon: '[TD]',
    rarity: 'Rare',
    stackable: true,
    maxStacks: 2,
    synergies: ['phase_dash', 'coherence_surge'],
    modifiers: {
      waveDashSpeedMultiplier: 1.15
    }
  }
] as const;

export const MUTATION_SYNERGIES: readonly MutationSynergy[] = [
  {
    id: 'relativistic_blur',
    requires: ['hyper_spin', 'phase_dash'],
    nameEn: 'Relativistic Blur',
    nameFr: 'Flou Relativiste',
    descriptionEn: '+100 ms Phase Dash invulnerability and +6% speed.',
    descriptionFr: '+100 ms invulnerabilite Phase Dash et +6 % vitesse.',
    bonusModifiers: {
      phaseDashInvulnMs: 100,
      speedMultiplier: 1.06
    }
  },
  {
    id: 'crystal_lattice',
    requires: ['broglie_wake', 'phonon_rebound'],
    nameEn: 'Crystal Lattice',
    nameFr: 'Reseau Cristallin',
    descriptionEn: '+600 ms de Broglie wall-wake lifetime.',
    descriptionFr: '+600 ms duree du sillage de Broglie.',
    bonusModifiers: {
      broglieWallWakeDurationMs: 600
    }
  },
  {
    id: 'orbital_drift',
    requires: ['relative_gravity', 'coyote_overclock'],
    nameEn: 'Orbital Drift',
    nameFr: 'Derive Orbitale',
    descriptionEn: '+0.35x additional Apex Hang-Time window.',
    descriptionFr: '+0.35x fenetre Apex Hang-Time supplementaire.',
    bonusModifiers: {
      apexHangTimeMultiplier: 1.15
    }
  },
  {
    id: 'entangled_harvester',
    requires: ['double_quantum', 'particle_magnet'],
    nameEn: 'Entangled Harvester',
    nameFr: 'Collecteur Intrique',
    descriptionEn: '+60 px Particle Magnet attraction radius.',
    descriptionFr: '+60 px rayon d attraction Aimant a Particules.',
    bonusModifiers: {
      particleMagnetRadiusPx: 60
    }
  },
  {
    id: 'chrono_phaser',
    requires: ['infinite_tunnel', 'reflex_dilation'],
    nameEn: 'Chrono-Phaser',
    nameFr: 'Chrono-Phaseur',
    descriptionEn: 'Reflex Dilation cooldown reduced by 1.0 s.',
    descriptionFr: 'Cooldown de Dilatation Reflexe reduit de 1.0 s.',
    bonusModifiers: {
      reflexDilationCooldownMs: -1000
    }
  },
  {
    id: 'nucleon_fortress',
    requires: ['quantum_shield', 'extra_quantum'],
    nameEn: 'Nucleon Fortress',
    nameFr: 'Forteresse Nucleon',
    descriptionEn: '+1 extra Quantum Shield charge per chamber.',
    descriptionFr: '+1 charge de Bouclier Quantique par salle.',
    bonusModifiers: {
      shieldChargesPerRoom: 1
    }
  }
] as const;

const MUTATION_BY_ID = new Map<string, QuantumMutation>(
  QUANTUM_MUTATIONS.map((mutation) => [mutation.id, mutation])
);

export function getMutationById(id: string): QuantumMutation | undefined {
  return MUTATION_BY_ID.get(id);
}

export function detectActiveSynergies(mutationIds: readonly string[]): MutationSynergy[] {
  const owned = new Set(mutationIds);
  return MUTATION_SYNERGIES.filter(
    (synergy) => owned.has(synergy.requires[0]) && owned.has(synergy.requires[1])
  );
}

export function findPotentialSynergies(
  activeMutationIds: readonly string[],
  candidateMutationId: string
): MutationSynergy[] {
  const owned = new Set(activeMutationIds);
  if (owned.has(candidateMutationId)) {
    return [];
  }
  return MUTATION_SYNERGIES.filter((synergy) => {
    const [a, b] = synergy.requires;
    return (
      (a === candidateMutationId && owned.has(b)) || (b === candidateMutationId && owned.has(a))
    );
  });
}

function clampSafe(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function applyModifierChunk(target: AggregatedMutationModifiers, mod: MutationModifiers): void {
  if (mod.speedMultiplier !== undefined && Number.isFinite(mod.speedMultiplier)) {
    target.speedMultiplier *= mod.speedMultiplier;
  }
  if (mod.airControlMultiplier !== undefined && Number.isFinite(mod.airControlMultiplier)) {
    target.airControlMultiplier *= mod.airControlMultiplier;
  }
  if (
    mod.broglieWallWakeDurationMs !== undefined &&
    Number.isFinite(mod.broglieWallWakeDurationMs)
  ) {
    target.broglieWallWakeDurationMs += mod.broglieWallWakeDurationMs;
  }
  if (mod.phaseDashInvulnMs !== undefined && Number.isFinite(mod.phaseDashInvulnMs)) {
    target.phaseDashInvulnMs += mod.phaseDashInvulnMs;
  }
  if (mod.startingClones !== undefined && Number.isFinite(mod.startingClones)) {
    target.startingClones += mod.startingClones;
  }
  if (mod.gravityMultiplier !== undefined && Number.isFinite(mod.gravityMultiplier)) {
    target.gravityMultiplier *= mod.gravityMultiplier;
  }
  if (mod.apexHangTimeMultiplier !== undefined && Number.isFinite(mod.apexHangTimeMultiplier)) {
    target.apexHangTimeMultiplier *= mod.apexHangTimeMultiplier;
  }
  if (mod.tunnelRegenIntervalMs !== undefined && Number.isFinite(mod.tunnelRegenIntervalMs)) {
    if (target.tunnelRegenIntervalMs <= 0) {
      target.tunnelRegenIntervalMs = mod.tunnelRegenIntervalMs;
    } else {
      // Stacking Infinite Tunnel speeds up regeneration by 25% per additional stack
      target.tunnelRegenIntervalMs = Math.round(target.tunnelRegenIntervalMs * 0.75);
    }
  }
  if (mod.reflexDilationRadiusPx !== undefined && Number.isFinite(mod.reflexDilationRadiusPx)) {
    target.reflexDilationRadiusPx = Math.max(
      target.reflexDilationRadiusPx,
      mod.reflexDilationRadiusPx
    );
  }
  if (mod.reflexDilationScale !== undefined && Number.isFinite(mod.reflexDilationScale)) {
    target.reflexDilationScale = Math.min(target.reflexDilationScale, mod.reflexDilationScale);
  }
  if (mod.reflexDilationDurationMs !== undefined && Number.isFinite(mod.reflexDilationDurationMs)) {
    target.reflexDilationDurationMs = Math.max(
      target.reflexDilationDurationMs,
      mod.reflexDilationDurationMs
    );
  }
  if (mod.reflexDilationCooldownMs !== undefined && Number.isFinite(mod.reflexDilationCooldownMs)) {
    if (target.reflexDilationCooldownMs <= 0) {
      target.reflexDilationCooldownMs = Math.max(1500, mod.reflexDilationCooldownMs);
    } else {
      target.reflexDilationCooldownMs = Math.max(
        1500,
        target.reflexDilationCooldownMs + mod.reflexDilationCooldownMs
      );
    }
  }
  if (mod.particleMagnetRadiusPx !== undefined && Number.isFinite(mod.particleMagnetRadiusPx)) {
    target.particleMagnetRadiusPx += mod.particleMagnetRadiusPx;
  }
  if (mod.shieldChargesPerRoom !== undefined && Number.isFinite(mod.shieldChargesPerRoom)) {
    target.shieldChargesPerRoom += mod.shieldChargesPerRoom;
  }
  if (mod.coyoteBonusMs !== undefined && Number.isFinite(mod.coyoteBonusMs)) {
    target.coyoteBonusMs += mod.coyoteBonusMs;
  }
  if (mod.jumpBufferBonusMs !== undefined && Number.isFinite(mod.jumpBufferBonusMs)) {
    target.jumpBufferBonusMs += mod.jumpBufferBonusMs;
  }
  if (mod.jumpMultiplier !== undefined && Number.isFinite(mod.jumpMultiplier)) {
    target.jumpMultiplier *= mod.jumpMultiplier;
  }
  if (mod.coherenceGainMultiplier !== undefined && Number.isFinite(mod.coherenceGainMultiplier)) {
    target.coherenceGainMultiplier *= mod.coherenceGainMultiplier;
  }
  if (mod.extraMaxLives !== undefined && Number.isFinite(mod.extraMaxLives)) {
    target.extraMaxLives += mod.extraMaxLives;
  }
  if (
    mod.wallBounceBoostMultiplier !== undefined &&
    Number.isFinite(mod.wallBounceBoostMultiplier)
  ) {
    target.wallBounceBoostMultiplier *= mod.wallBounceBoostMultiplier;
  }
  if (mod.waveDashSpeedMultiplier !== undefined && Number.isFinite(mod.waveDashSpeedMultiplier)) {
    target.waveDashSpeedMultiplier *= mod.waveDashSpeedMultiplier;
  }
}

/**
 * Purely aggregates all active mutations and unlocked synergies into safe,
 * bounded physics modifiers with zero NaN or conflicting extremes.
 */
export function aggregateMutationModifiers(
  mutationIds: readonly string[]
): AggregatedMutationModifiers {
  const result: AggregatedMutationModifiers = { ...DEFAULT_MUTATION_MODIFIERS };

  for (const id of mutationIds) {
    const mutation = MUTATION_BY_ID.get(id);
    if (!mutation) continue;
    applyModifierChunk(result, mutation.modifiers);
  }

  const synergies = detectActiveSynergies(mutationIds);
  for (const synergy of synergies) {
    applyModifierChunk(result, synergy.bonusModifiers);
  }

  return {
    speedMultiplier: clampSafe(result.speedMultiplier, 0.75, 1.85, 1),
    airControlMultiplier: clampSafe(result.airControlMultiplier, 0.55, 1.4, 1),
    broglieWallWakeDurationMs: clampSafe(result.broglieWallWakeDurationMs, 0, 5000, 0),
    phaseDashInvulnMs: clampSafe(result.phaseDashInvulnMs, 0, 1200, 0),
    startingClones: Math.floor(clampSafe(result.startingClones, 0, 2, 0)),
    gravityMultiplier: clampSafe(result.gravityMultiplier, 0.55, 1.3, 1),
    apexHangTimeMultiplier: clampSafe(result.apexHangTimeMultiplier, 1, 3.2, 1),
    tunnelRegenIntervalMs:
      result.tunnelRegenIntervalMs > 0
        ? Math.round(clampSafe(result.tunnelRegenIntervalMs, 1500, 10000, 4000))
        : 0,
    reflexDilationRadiusPx: clampSafe(result.reflexDilationRadiusPx, 0, 100, 0),
    reflexDilationScale:
      result.reflexDilationRadiusPx > 0 ? clampSafe(result.reflexDilationScale, 0.2, 0.8, 0.35) : 1,
    reflexDilationDurationMs: clampSafe(result.reflexDilationDurationMs, 0, 1200, 0),
    reflexDilationCooldownMs:
      result.reflexDilationRadiusPx > 0
        ? Math.round(clampSafe(result.reflexDilationCooldownMs, 1500, 12000, 5000))
        : 0,
    particleMagnetRadiusPx: clampSafe(result.particleMagnetRadiusPx, 0, 320, 0),
    shieldChargesPerRoom: Math.floor(clampSafe(result.shieldChargesPerRoom, 0, 3, 0)),
    coyoteBonusMs: clampSafe(result.coyoteBonusMs, 0, 220, 0),
    jumpBufferBonusMs: clampSafe(result.jumpBufferBonusMs, 0, 220, 0),
    jumpMultiplier: clampSafe(result.jumpMultiplier, 0.85, 1.35, 1),
    coherenceGainMultiplier: clampSafe(result.coherenceGainMultiplier, 1, 3.5, 1),
    extraMaxLives: Math.floor(clampSafe(result.extraMaxLives, 0, 4, 0)),
    wallBounceBoostMultiplier: clampSafe(result.wallBounceBoostMultiplier, 1, 1.5, 1),
    waveDashSpeedMultiplier: clampSafe(result.waveDashSpeedMultiplier, 1, 1.45, 1)
  };
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRarityWeight(rarity: MutationRarity, roomIndex: number): number {
  const depthBonus = Math.min(20, Math.max(0, roomIndex) * 2);
  switch (rarity) {
    case 'Common':
      return Math.max(30, 56 - depthBonus);
    case 'Rare':
      return 32 + Math.round(depthBonus * 0.5);
    case 'Exotic':
      return 12 + Math.round(depthBonus * 0.5);
  }
}

/**
 * Deterministic seeded draft returning 2 distinct eligible mutations,
 * weighted by rarity and respecting stack limits.
 */
export function rollMutationChoices(
  activeMutationIds: readonly string[],
  seed: number,
  roomIndex: number
): [QuantumMutation, QuantumMutation] {
  const stackCounts = new Map<string, number>();
  for (const id of activeMutationIds) {
    stackCounts.set(id, (stackCounts.get(id) ?? 0) + 1);
  }

  let pool = QUANTUM_MUTATIONS.filter((mutation) => {
    const count = stackCounts.get(mutation.id) ?? 0;
    if (!mutation.stackable && count >= 1) return false;
    return count < mutation.maxStacks;
  });

  // Fallback if player maxed almost everything in an ultra-deep run
  if (pool.length < 2) {
    pool = [...QUANTUM_MUTATIONS];
  }

  const combinedSeed = (seed * 2654435761 + (roomIndex + 1) * 1013904223) >>> 0;
  const rng = createMulberry32(combinedSeed);

  const pickWeighted = (candidates: QuantumMutation[]): QuantumMutation => {
    const weights = candidates.map((m) => getRarityWeight(m.rarity, roomIndex));
    const total = weights.reduce((acc, w) => acc + w, 0);
    let target = rng() * total;
    for (let i = 0; i < candidates.length; i++) {
      target -= weights[i];
      if (target <= 0) {
        return candidates[i];
      }
    }
    return candidates[candidates.length - 1];
  };

  const first = pickWeighted(pool);
  const remaining = pool.filter((m) => m.id !== first.id);
  const second = pickWeighted(remaining.length > 0 ? remaining : pool);

  return [first, second];
}
