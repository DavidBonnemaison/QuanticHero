import { getElementSpectroscopy } from './spectroscopy';

export interface CosmicAct {
  act: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  zRange: [number, number];
  description: string;
}

export const COSMIC_ACTS: Record<1 | 2 | 3 | 4, CosmicAct> = {
  1: {
    act: 1,
    title: 'The Primordial Soup',
    subtitle: 'Z 1–6: Quark-Gluon Cooling & First Quanta',
    zRange: [1, 6],
    description:
      'Cooling of the primordial quark-gluon plasma into the very first quanta of energy and light nuclei.'
  },
  2: {
    act: 2,
    title: 'The Stellar Forge',
    subtitle: 'Z 7–26: Massive Star Nucleosynthesis to Iron Peak',
    zRange: [7, 26],
    description:
      'Stellar nucleosynthesis deep in massive star cores, CNO fusion cycles, culminating at the iron-56 peak.'
  },
  3: {
    act: 3,
    title: 'Supernova Cataclysm & r-Process',
    subtitle: 'Z 27–82: Cosmic Explosions & Rapid Neutron Capture',
    zRange: [27, 82],
    description:
      'Violent core collapses, kilonova collisions, and rapid neutron captures generating heavy and precious elements.'
  },
  4: {
    act: 4,
    title: 'Island of Stability & Transuranic Frontier',
    subtitle: 'Z 83–118: Superheavy Frontiers Defying Classical Laws',
    zRange: [83, 118],
    description:
      'Synthetic transuranic titans born in relativistic accelerator collisions, challenging the limits of quantum stability.'
  }
};

/**
 * Curated narrative dialogues for key story levels (Levels 1 to 10 and beyond).
 * Each level contains at least two distinct story lines.
 */
export const LEVEL_NARRATIVES: Record<number, string[]> = {
  1: [
    'Oops. Looks like you have been reduced to a veeery small size. Sorry for that...',
    'The tiny floating spark looks like it might carry enough momentum to leap through the anomaly.'
  ],
  5: [
    'Boron hums with a golden current just beyond the first ledges.',
    'Catching that spark might carry you across wider voids ahead.'
  ],
  9: [
    'Fluorine drifts in a thin, weightless pocket above the chasm.',
    'A lighter step could let a single leap span far more vacuum.'
  ],
  12: [
    'Magnesium closes the primordial dawn with a twin trial.',
    'Swift momentum and lightened weight converge before the stellar forge.'
  ],
  13: [
    'Aluminium marks the threshold of the Stellar Forge.',
    'Denser lattices and higher climbs await inside the core.'
  ],
  14: [
    'Silicon guards a heavy barrier that will not yield on its own.',
    'Perhaps an identical self could hold the plate while you pass.'
  ],
  18: [
    'Argon rises through vertical shafts lined with glowing neon walls.',
    'Kinetic energy feels like it could rebound upward from the sides.'
  ],
  22: [
    'Titanium bends the rules of weight along an inverted ceiling.',
    'Gravity behaves like a mere suggestion in this chamber.'
  ],
  26: [
    'Iron marks the core of the Stellar Forge, where fusion reaches its peak.',
    'Inverted weight and buoyant currents unite before the supernova.'
  ],
  27: [
    'Beyond iron, the forge gives way to the breath of a supernova.',
    'Shockwaves scatter thin barriers and shifting echoes ahead.'
  ],
  29: [
    'Copper seals the corridor behind a solid, unyielding wall.',
    'Matter is mostly empty space after all.'
  ],
  36: [
    'Krypton flickers between alternating echoes of cyan and magenta.',
    'Every leap seems to rearrange which ground exists.'
  ],
  46: [
    'Palladium guards the edge of the supernova cataclysm.',
    'Speed, tunneling, and shifting phases converge in one trial.'
  ],
  47: [
    'Silver shimmers in the aftermath of colliding neutron stars.',
    'The kilonova echo leaves fragile footholds suspended in deep space.'
  ],
  48: [
    'Cadmium ledges glow briefly before dissolving into the void.',
    'Hesitation costs the ground beneath your feet.'
  ],
  52: [
    'Tellurium brings two identical fermions face to face.',
    'Forcing them together might yield quite a push across the abyss.'
  ],
  55: [
    'Caesium ticks with atomic precision at the heart of the kilonova.',
    'Slowing the world for a few moments may reveal hidden openings.'
  ],
  68: [
    'Erbium closes the kilonova sector beneath a cascade of decaying steps.',
    'Clone repulsion and fleeting ground demand calm precision.'
  ],
  69: [
    'Thulium ushers in the relativistic crucible, where orbitals contract.',
    'Longer chasms and brisker rhythms demand steady momentum.'
  ],
  74: [
    'Tungsten trembles as walls begin to close around the chamber.',
    'Moving while everything else slows down could offer a way out.'
  ],
  84: [
    'Polonium radiates an unstable aura over three distinct trials.',
    'Speed, lightened weight, and tunneling intertwine toward the gate.'
  ],
  88: [
    'Radium stands at the threshold of the transuranic frontier.',
    'Inverted gravity, tunneling, and shifting phases converge.'
  ],
  89: [
    'Actinium opens the Island of Stability, far beyond classical bounds.',
    'Every quantum effect you have met lingers in this outer expanse.'
  ],
  100: [
    'Fermium marks the hundredth element, a twin-state gauntlet.',
    'Clones, Pauli repulsion, and a thin barrier stand before the final stretch.'
  ],
  109: [
    'Meitnerium: the final synthetic crucible before the entangled realm.',
    'Speed, tunneling, time dilation, and rising collapse unite in one trial.'
  ],
  110: [
    'Darmstadtium initiates the Quantum Entanglement Matrix (Ψ_A ⊗ Ψ_B).',
    'Control twin wavefunctions simultaneously—your actions resonate across quantum mirror space.'
  ],
  111: [
    'Roentgenium challenges your entangled reflexes across inverted gravitational fields.',
    'When Alpha leaps upward, Beta plunges downward. Harmonize their trajectories to unlock the twin doors.'
  ],
  112: [
    'Copernicium bends classical chemistry: a volatile superheavy metal in a dual quantum state.',
    'Dodge synchronized obstacles while keeping both heroes in perfect quantum phase coherence.'
  ],
  113: [
    'Nihonium tests multi-axis spatial parity inversion in an asymmetric laboratory labyrinth.',
    'Guide both clones through disparate hazards before quantum decoherence collapses the link.'
  ],
  114: [
    'Flerovium: the fabled core of the Island of Stability.',
    'Coordinate Alpha and Beta to navigate crossed finish portals and achieve ultimate quantum synthesis.'
  ],
  118: [
    'Oganesson: the 118th and final element of the Periodic Table, where relativistic electron clouds smear into pure quantum chaos.',
    'You have completed the Cosmic Odyssey from the Primordial Big Bang to the outermost edge of atomic physics.'
  ]
};

/**
 * Returns explanations only for key story, transition, and boss levels.
 * Intermediate levels return [] so gameplay flows without constant interruptions.
 */
export function getCampaignExplanations(z: number): string[] {
  return LEVEL_NARRATIVES[z] ?? [];
}

/**
 * Returns the narrative lines for any given level (1 to 118).
 * If a curated dialogue exists, it is returned. Otherwise, an evocative,
 * scientifically grounded narrative is synthesized from the element's spectroscopy and cosmic act.
 */
export function getNarrativeForLevel(z: number): string[] {
  if (LEVEL_NARRATIVES[z]) {
    return LEVEL_NARRATIVES[z];
  }

  const element = getElementSpectroscopy(z);
  const act = COSMIC_ACTS[element.act];

  const line1 = `Entering ${element.name} (${element.symbol}, Z=${element.z}) — ${act.title}.`;
  const line2 =
    element.description.length <= 120
      ? element.description
      : `${element.description.slice(0, 117)}...`;

  return [line1, line2];
}

/**
 * Returns the Cosmic Act details for a given act number (1 to 4).
 */
export function getCosmicAct(act: 1 | 2 | 3 | 4): CosmicAct {
  return COSMIC_ACTS[act];
}

/**
 * Returns the Cosmic Act associated with a given atomic number Z.
 */
export function getActForElement(z: number): CosmicAct {
  const element = getElementSpectroscopy(z);
  return COSMIC_ACTS[element.act];
}
