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
    'Try to get that electron, it should give you enough energy to make the jump to the next atom.'
  ],
  2: [
    'Welcome to Helium: an ultra-light noble gas drifting weightlessly through space.',
    'Snag that speed particle to kickstart your first cosmic speedrun before the universe cools!'
  ],
  3: [
    'Behold Lithium: an ultra-reactive alkali metal leaping across the primordial sea.',
    'Harness reduced gravity to bound across gaping quantum chasms and conquer the void.'
  ],
  4: [
    "Beryllium's hexagonal metallic lattice splits incoming quantum wavefunctions.",
    'Collect the duplication particle to replicate yourself and chart multiple paths at once!'
  ],
  5: [
    'Boron forms an unyielding refractory metalloid forged under intense cosmic pressure.',
    'Watch out for deep gravity wells, and use the vertical neon walls to bounce toward safety!'
  ],
  6: [
    'Carbon: the versatile four-valent foundation of organic life, graphite sheets, and diamond stars.',
    'Master gravity inversion to walk upside down along celestial ceilings without falling into the void!'
  ],
  7: [
    'Nitrogen fills the stellar atmospheres, guarded by stubborn and unyielding triple bonds.',
    'Channel quantum tunneling to glide effortlessly straight through impenetrable energy barriers!'
  ],
  8: [
    'Oxygen: the fiery fuel of stellar fusion, lighting auroral skies in shimmering emerald green.',
    'Synchronize with quantum phase superposition—time your jumps across alternating cyan and magenta platforms!'
  ],
  9: [
    'Fluorine is the most ravenous electronegative predator in the entire periodic table.',
    'Beware of Pauli exclusion repulsions, and tread lightly as radioactive platforms decay beneath your feet!'
  ],
  10: [
    'Neon blazes in glorious crimson-orange discharge, sealing the triumphant close of Period 2.',
    'Activate relativistic time dilation to slow down reality before the collapsing chamber crushes you!'
  ],
  11: [
    'Sodium ignites with a golden doublet flare as you enter Period 3.',
    'Beware of violent moisture reactions—maintain your momentum across alkali stepping stones.'
  ],
  12: [
    'Magnesium burns with brilliant, blinding white pyrotechnic intensity.',
    'Navigate through the high-temperature glare to reach the stellar gate.'
  ],
  26: [
    'You have reached Iron-56: the pinnacle of stellar nucleosynthesis and maximum nuclear binding energy.',
    'Beyond this iron peak, stellar fusion ceases. Only supernova shockwaves can forge what lies ahead.'
  ],
  55: [
    'Caesium marks the transition to deep blue atomic resonance.',
    'Its ultra-precise atomic oscillations govern the ticks of cosmic timekeeping.'
  ],
  79: [
    'Gold gleams with relativistic glory: inner electron velocities contract the s-orbitals.',
    'Survive the cosmic kilonova furnace where neutron star collisions showered the universe in gold.'
  ],
  92: [
    'Uranium: the primordial titan of nuclear fission, radiating emerald-green luminescent energy.',
    'Tread carefully around radioactive decay cascades as you step onto the transuranic frontier.'
  ],
  110: [
    'Darmstadtium initiates the Quantum Entanglement Matrix (Ψ_A ⊗ Ψ_B).',
    'Control twin wavefunctions simultaneously—your actions resonate across quantum mirror space!'
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
    'Coordinate Alpha and Beta to navigate crossed finish portals and achieve ultimate quantum synthesis!'
  ],
  118: [
    'Oganesson: the 118th and final element of the Periodic Table, where relativistic electron clouds smear into pure quantum chaos.',
    'You have completed the Cosmic Odyssey from the Primordial Big Bang to the outermost edge of atomic physics!'
  ]
};

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
  const line2 = `${element.description} Navigate this quantum sector to advance the cosmic synthesis.`;

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
