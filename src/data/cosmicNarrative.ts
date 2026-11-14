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
  2: [
    'Light and weightless noble air drifting in silence.',
    'The golden spark seems to urge swift movement before the trail fades.'
  ],
  3: [
    'A reactive floor floating over an expansive vacuum.',
    'A strange low-gravity current hovers in the open air.'
  ],
  4: [
    'A rigid metallic lattice with a heavy barrier ahead.',
    'Perhaps an identical self could stand where one cannot.'
  ],
  5: [
    'Dense vertical chasms and polished neon facets.',
    'Kinetic energy feels like it could bounce upward.'
  ],
  6: ['An upside-down expanse of diamond sheets.', 'Gravity behaves like a mere suggestion here.'],
  7: [
    'A solid unyielding wall standing between two chambers.',
    'Matter is mostly empty space after all.'
  ],
  8: [
    'Alternating echoes of cyan and magenta.',
    'Every leap seems to rearrange which ground exists.'
  ],
  9: [
    'Two identical fermions cannot occupy the same state.',
    'Forcing them together might yield quite a push across crumbling ground.'
  ],
  10: [
    'The chamber core trembles as walls draw closer.',
    'Moving while everything else slows down could offer a way out.'
  ],
  11: [
    'Sodium flickers with a warm amber glow as the stellar forge awakens.',
    'The air feels denser here, yet each leap still carries promise.'
  ],
  15: [
    'Shifting cyan and magenta echoes drift between moving ledges.',
    'Timing a step with the phase pulse might open a cleaner path.'
  ],
  20: [
    'Calcium plates lock into a restless canyon of wind and thin barriers.',
    'A burst of speed before phasing through stone could bridge the gap.'
  ],
  26: [
    'Iron marks the core of the stellar forge, where fusion reaches its peak.',
    'Gravity, decay, and floating currents converge before the next expanse.'
  ],
  27: [
    'Beyond iron, the forge gives way to the violent breath of a supernova.',
    'Platforms tremble lightly under the shockwave of heavy nuclei.'
  ],
  33: [
    'Arsenic crystallizes along neon walls that hum with reflected force.',
    'Phase-shifted ledges await those who rebound upward.'
  ],
  40: [
    'Zirconium splits the path into twin wavefunctions above a wide void.',
    'Two identical selves forced together might launch one far across.'
  ],
  46: [
    'Palladium guards the edge of the supernova cataclysm.',
    'Speed, shifting phases, and a rising floor test every reflex at once.'
  ],
  47: [
    'Silver shimmers in the aftermath of colliding neutron stars.',
    'The kilonova echo leaves fragile footholds suspended in deep space.'
  ],
  55: [
    'Caesium ticks with atomic precision at the heart of the kilonova.',
    'Slowing the world for a few moments may reveal hidden openings.'
  ],
  62: [
    'Samarium warps both gravity and solid walls into a tight labyrinth.',
    'Inverting weight before slipping through stone could unlock the exit.'
  ],
  68: [
    'Erbium closes the kilonova sector beneath a cascade of decaying steps.',
    'Clone repulsion and fleeting ground demand calm precision.'
  ],
  69: [
    'Thulium ushers in the relativistic crucible, where orbitals contract.',
    'Longer chasms and brisker rhythms demand steady momentum.'
  ],
  79: [
    'Gold gleams with relativistic brilliance across high-velocity spans.',
    'Inner-shell electrons race faster here, and so must your stride.'
  ],
  84: [
    'Polonium radiates an unstable aura over three distinct trials.',
    'Speed, lightened weight, and tunneling intertwine toward the gate.'
  ],
  88: [
    'Radium stands at the threshold of the transuranic frontier.',
    'Inverted gravity, shifting phases, and collapsing chambers converge.'
  ],
  89: [
    'Actinium opens the Island of Stability, far beyond classical bounds.',
    'Every quantum effect you have met lingers in this outer expanse.'
  ],
  92: [
    'Uranium hums with emerald fission energy across fragile bridges.',
    'Keep moving before the glowing ledges dissolve beneath your feet.'
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
