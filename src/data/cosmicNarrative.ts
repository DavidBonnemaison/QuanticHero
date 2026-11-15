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
  1: ['Reduced to a single quantum.', 'What carries a spark across the dark?'],
  5: ['Boron hums with a golden current.', 'Catch the pulse; the void widens.'],
  9: ['Weight is only a habit here.', 'How far does a step reach when gravity forgets?'],
  12: ['Two trials close the primordial dawn.', 'Swiftness and lightness share one road.'],
  13: ['The Stellar Forge awakens.', 'Denser lattices, higher climbs.'],
  14: ['A gate that refuses a solitary traveler.', 'Two bodies, one plate, one passage.'],
  18: ['The walls remember every impact.', 'What strikes sideways can rise.'],
  22: ['Up and down have traded places.', 'Fall toward the sky.'],
  26: ['The iron core burns.', 'Weightless and inverted, two laws collide.'],
  27: ['Beyond iron, the star shatters.', 'Echoes and thin walls drift in the blast.'],
  29: ['Solid stone, yet mostly empty space.', 'What passes through without breaking?'],
  36: ['Cyan and magenta take turns existing.', 'Every leap trades one ground for the other.'],
  46: ['The supernova reaches its crest.', 'Speed, passage, and shifting ground.'],
  47: ['Two neutron stars collide in silence.', 'Fragile footholds linger in the afterglow.'],
  48: ['Light fades beneath a lingering step.', 'Stand still, and the ground forgets you.'],
  52: ['Two identical fermions refuse the same place.', 'Bring them close and measure the recoil.'],
  55: ['The clock ticks slower for the world than for you.', 'Move before the moment catches up.'],
  68: ['Fleeting steps over the kilonova abyss.', 'Repulsion and decay share a narrow path.'],
  69: ['The relativistic crucible begins.', 'Shorter orbits, sharper turns.'],
  74: ['The walls are closing in.', 'Outrun what never stops.'],
  84: ['Three trials, one unstable core.', 'Swift, light, and unbroken through the wall.'],
  88: ['The transuranic threshold.', 'Inverted skies, shifting phases, hollow stone.'],
  89: ['The Island of Stability.', 'Every law you learned returns at once.'],
  100: ['One hundred elements forged.', 'A twin, a recoil, and a barrier.'],
  109: [
    'The final crucible before entanglement.',
    'Run, phase through, slow the fall, outlast the tide.'
  ],
  110: ['One mind, two wavefunctions.', 'Move one, and its twin answers.'],
  111: ['Twin skies, opposite weights.', 'One rises while the other falls.'],
  112: ['Two states bound across the void.', 'Keep both in phase.'],
  113: ['Parity inverted across two chambers.', 'Mirror paths, single will.'],
  114: ['The heart of the Island of Stability.', 'Crossed doors, one synthesis.'],
  118: [
    'Oganesson: the outermost edge of the table.',
    'From primordial spark to pure quantum symmetry.'
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
