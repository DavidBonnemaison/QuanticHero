// QuantumHero Spectroscopy Database
// Complete physical and spectroscopic database of all 118 elements of the Periodic Table

export interface ElementSpectroscopy {
  z: number;
  symbol: string;
  name: string; // Nom anglais de l'élément (Hydrogen, Helium, etc.)
  act: 1 | 2 | 3 | 4; // Acte cosmique (1: 1-6, 2: 7-26, 3: 27-82, 4: 83-118)
  hue: string; // Teinte sombre de fond cosmique
  antiHue: string; // Couleur éclatante néon / particules / contraste
  spectralLineNm?: number; // Raie d'émission optique dominante (en nm) si connue
  description: string; // Brève description scientifique de la signature optique
}

export const SPECTROSCOPY_DATABASE: ElementSpectroscopy[] = [
  {
    z: 1,
    symbol: 'H',
    name: 'Hydrogen',
    act: 1,
    hue: '#0a1128',
    antiHue: '#e63946',
    spectralLineNm: 656.3,
    description:
      'Prominent Balmer H-alpha red emission line at 656.3 nm illuminating interstellar nebulae.'
  },
  {
    z: 2,
    symbol: 'He',
    name: 'Helium',
    act: 1,
    hue: '#1c1900',
    antiHue: '#ffd166',
    spectralLineNm: 587.6,
    description:
      'Famous solar D3 yellow emission line at 587.6 nm first discovered in the solar chromosphere.'
  },
  {
    z: 3,
    symbol: 'Li',
    name: 'Lithium',
    act: 1,
    hue: '#20080e',
    antiHue: '#ff4d6d',
    spectralLineNm: 670.8,
    description:
      'Intense carmine-red atomic resonance doublet at 670.8 nm from alkali flame excitation.'
  },
  {
    z: 4,
    symbol: 'Be',
    name: 'Beryllium',
    act: 1,
    hue: '#0f1416',
    antiHue: '#70e000',
    description: 'Metallic emerald-green spark discharge signature from divalent beryllium ions.'
  },
  {
    z: 5,
    symbol: 'B',
    name: 'Boron',
    act: 1,
    hue: '#061a14',
    antiHue: '#38b000',
    description: 'Vivid green atomic flame emission from thermal suboxide transitions.'
  },
  {
    z: 6,
    symbol: 'C',
    name: 'Carbon',
    act: 1,
    hue: '#111116',
    antiHue: '#00f5d4',
    description: 'Graphite continuum absorption with diamond-sharp optical Swan band transitions.'
  },
  {
    z: 7,
    symbol: 'N',
    name: 'Nitrogen',
    act: 2,
    hue: '#0b132b',
    antiHue: '#48cae4',
    description:
      'Deep midnight-blue auroral Vegard-Kaplan band emissions from ionized atmospheric nitrogen.'
  },
  {
    z: 8,
    symbol: 'O',
    name: 'Oxygen',
    act: 2,
    hue: '#032b1a',
    antiHue: '#52b788',
    spectralLineNm: 557.7,
    description:
      'Forbidden auroral green emission line at 557.7 nm produced by excited metastable atomic oxygen.'
  },
  {
    z: 9,
    symbol: 'F',
    name: 'Fluorine',
    act: 2,
    hue: '#261a00',
    antiHue: '#fee440',
    description: 'Piercing halogen amber-yellow gas discharge lines in the near-optical spectrum.'
  },
  {
    z: 10,
    symbol: 'Ne',
    name: 'Neon',
    act: 2,
    hue: '#2b0b00',
    antiHue: '#ff5400',
    spectralLineNm: 585.2,
    description:
      'Iconic fiery red-orange high-voltage glow discharge spectrum with intense lines near 585-640 nm.'
  },
  {
    z: 11,
    symbol: 'Na',
    name: 'Sodium',
    act: 2,
    hue: '#231700',
    antiHue: '#ffbe0b',
    spectralLineNm: 589,
    description: 'Brilliant yellow sodium D doublet resonance lines at 589.0 nm and 589.6 nm.'
  },
  {
    z: 12,
    symbol: 'Mg',
    name: 'Magnesium',
    act: 2,
    hue: '#0e141a',
    antiHue: '#90e0ef',
    spectralLineNm: 518.4,
    description: 'Dazzling silver-white pyrotechnic emission with prominent green triplet b-lines.'
  },
  {
    z: 13,
    symbol: 'Al',
    name: 'Aluminium',
    act: 2,
    hue: '#101728',
    antiHue: '#93c5fd',
    spectralLineNm: 396.2,
    description: 'Near-ultraviolet doublet resonance lines reflecting a bright silvery luster.'
  },
  {
    z: 14,
    symbol: 'Si',
    name: 'Silicon',
    act: 2,
    hue: '#0c1b2a',
    antiHue: '#38bdf8',
    description: 'Semiconductor crystalline optical bandgap reflectance with violet plasma glow.'
  },
  {
    z: 15,
    symbol: 'P',
    name: 'Phosphorus',
    act: 2,
    hue: '#240816',
    antiHue: '#f43f5e',
    spectralLineNm: 525,
    description:
      'Eerie chemiluminescent green-white glow and deep crimson molecular band signatures.'
  },
  {
    z: 16,
    symbol: 'S',
    name: 'Sulfur',
    act: 2,
    hue: '#1e1c05',
    antiHue: '#facc15',
    description: 'Brimstone yellow flame emission with distinct blue-violet molecular dimer bands.'
  },
  {
    z: 17,
    symbol: 'Cl',
    name: 'Chlorine',
    act: 2,
    hue: '#072418',
    antiHue: '#4ade80',
    description:
      'Pale yellow-green diatomic halogen absorption continuum and ionic green spark lines.'
  },
  {
    z: 18,
    symbol: 'Ar',
    name: 'Argon',
    act: 2,
    hue: '#140a28',
    antiHue: '#c084fc',
    spectralLineNm: 811.5,
    description:
      'Deep lilac-violet and sky-blue glow discharge dominated by intense near-infrared lines.'
  },
  {
    z: 19,
    symbol: 'K',
    name: 'Potassium',
    act: 2,
    hue: '#1b0d2e',
    antiHue: '#e879f9',
    spectralLineNm: 766.5,
    description: 'Characteristic lilac-violet flame emission doublet at 766.5 nm and 769.9 nm.'
  },
  {
    z: 20,
    symbol: 'Ca',
    name: 'Calcium',
    act: 2,
    hue: '#1e1005',
    antiHue: '#fb923c',
    spectralLineNm: 422.7,
    description: 'Brick-red flame color with historic solar Fraunhofer H and K lines in violet.'
  },
  {
    z: 21,
    symbol: 'Sc',
    name: 'Scandium',
    act: 2,
    hue: '#0d1824',
    antiHue: '#67e8f9',
    description:
      'High-intensity halide arc discharge with vibrant multi-wavelength blue-green lines.'
  },
  {
    z: 22,
    symbol: 'Ti',
    name: 'Titanium',
    act: 2,
    hue: '#121929',
    antiHue: '#a5f3fc',
    description:
      'Dense forest of spark lines across blue-violet indicative of refractory aerospace alloys.'
  },
  {
    z: 23,
    symbol: 'V',
    name: 'Vanadium',
    act: 2,
    hue: '#081c1c',
    antiHue: '#2dd4bf',
    description:
      'Multichromatic oxidation states yielding radiant turquoise and emerald emission spectra.'
  },
  {
    z: 24,
    symbol: 'Cr',
    name: 'Chromium',
    act: 2,
    hue: '#1c0915',
    antiHue: '#fb7185',
    spectralLineNm: 694.3,
    description:
      'Deep ruby laser fluorescence line at 694.3 nm and brilliant blue-violet atomic triplets.'
  },
  {
    z: 25,
    symbol: 'Mn',
    name: 'Manganese',
    act: 2,
    hue: '#1c0f2a',
    antiHue: '#e879f9',
    spectralLineNm: 403.1,
    description:
      'Characteristic violet atomic triplet lines and radiant permanganate absorption bands.'
  },
  {
    z: 26,
    symbol: 'Fe',
    name: 'Iron',
    act: 2,
    hue: '#1a1110',
    antiHue: '#e63946',
    spectralLineNm: 527,
    description:
      'Stellar core nucleosynthesis peak with thousands of ember-red and Fraunhofer absorption lines.'
  },
  {
    z: 27,
    symbol: 'Co',
    name: 'Cobalt',
    act: 3,
    hue: '#06132a',
    antiHue: '#3b82f6',
    description:
      'Vibrant cobalt-blue chromatic luminescence and sharp blue-violet atomic multiplets.'
  },
  {
    z: 28,
    symbol: 'Ni',
    name: 'Nickel',
    act: 3,
    hue: '#081c15',
    antiHue: '#34d399',
    description: 'Supernova Ni-56 decay cascade and deep emerald-green spark lines.'
  },
  {
    z: 29,
    symbol: 'Cu',
    name: 'Copper',
    act: 3,
    hue: '#041f19',
    antiHue: '#22c55e',
    spectralLineNm: 510.5,
    description:
      'Vivid green-turquoise flame test emission with green copper-vapor laser transitions at 510.5 nm.'
  },
  {
    z: 30,
    symbol: 'Zn',
    name: 'Zinc',
    act: 3,
    hue: '#0c1626',
    antiHue: '#60a5fa',
    spectralLineNm: 481.1,
    description: 'Electric bluish-green atomic spark lines at 468.0 nm, 472.2 nm, and 481.1 nm.'
  },
  {
    z: 31,
    symbol: 'Ga',
    name: 'Gallium',
    act: 3,
    hue: '#140d2b',
    antiHue: '#a78bfa',
    spectralLineNm: 417.2,
    description: 'Deep violet resonance doublet lines at 403.3 nm and 417.2 nm.'
  },
  {
    z: 32,
    symbol: 'Ge',
    name: 'Germanium',
    act: 3,
    hue: '#0a1d28',
    antiHue: '#22d3ee',
    description:
      'Semiconducting crystal infrared transmittance with sharp ultraviolet-blue spark lines.'
  },
  {
    z: 33,
    symbol: 'As',
    name: 'Arsenic',
    act: 3,
    hue: '#1c1f0d',
    antiHue: '#a3e635',
    description: 'Pale ghost-blue/lime arsenic vapor luminescence with ultraviolet atomic lines.'
  },
  {
    z: 34,
    symbol: 'Se',
    name: 'Selenium',
    act: 3,
    hue: '#24081c',
    antiHue: '#f472b6',
    description: 'Azure flame emission and photoconductive deep red optical band absorption.'
  },
  {
    z: 35,
    symbol: 'Br',
    name: 'Bromine',
    act: 3,
    hue: '#240909',
    antiHue: '#f87171',
    description:
      'Fuming reddish-brown diatomic molecular absorption with sharp red-orange discharge lines.'
  },
  {
    z: 36,
    symbol: 'Kr',
    name: 'Krypton',
    act: 3,
    hue: '#150f2b',
    antiHue: '#818cf8',
    spectralLineNm: 557,
    description:
      'Brilliant whitish-green and violet glow discharge, historic standard of the optical meter.'
  },
  {
    z: 37,
    symbol: 'Rb',
    name: 'Rubidium',
    act: 3,
    hue: '#260618',
    antiHue: '#e11d48',
    spectralLineNm: 780,
    description:
      'Rich dark-red alkali spectral lines discovered spectroscopically by Bunsen and Kirchhoff.'
  },
  {
    z: 38,
    symbol: 'Sr',
    name: 'Strontium',
    act: 3,
    hue: '#260505',
    antiHue: '#ef4444',
    spectralLineNm: 460.7,
    description: 'Piercing crimson-scarlet flame test lines and blue atomic transition at 460.7 nm.'
  },
  {
    z: 39,
    symbol: 'Y',
    name: 'Yttrium',
    act: 3,
    hue: '#0d1a29',
    antiHue: '#38bdf8',
    description: 'Phosphor activator lines in red CRT and laser crystal YAG hosts.'
  },
  {
    z: 40,
    symbol: 'Zr',
    name: 'Zirconium',
    act: 3,
    hue: '#12182b',
    antiHue: '#60a5fa',
    description: 'Luminous optical refractory transitions in S-type red giant star atmospheres.'
  },
  {
    z: 41,
    symbol: 'Nb',
    name: 'Niobium',
    act: 3,
    hue: '#0a1d20',
    antiHue: '#2dd4bf',
    description:
      'Superconducting radio-frequency cavity glow and iridescent anodic oxidation fringes.'
  },
  {
    z: 42,
    symbol: 'Mo',
    name: 'Molybdenum',
    act: 3,
    hue: '#0e1c18',
    antiHue: '#34d399',
    description: 'Dense refractory emission spectrum with characteristic yellow-orange triplets.'
  },
  {
    z: 43,
    symbol: 'Tc',
    name: 'Technetium',
    act: 3,
    hue: '#20082b',
    antiHue: '#c084fc',
    description:
      'First artificial element; its stellar absorption lines proved ongoing cosmic nucleosynthesis.'
  },
  {
    z: 44,
    symbol: 'Ru',
    name: 'Ruthenium',
    act: 3,
    hue: '#1d102e',
    antiHue: '#e879f9',
    description: 'Solar cell dye sensitizer luminescent charge-transfer transitions.'
  },
  {
    z: 45,
    symbol: 'Rh',
    name: 'Rhodium',
    act: 3,
    hue: '#0e1a2c',
    antiHue: '#93c5fd',
    description:
      'High-reflectance noble metal optical lines with dazzling white-blue specular highlights.'
  },
  {
    z: 46,
    symbol: 'Pd',
    name: 'Palladium',
    act: 3,
    hue: '#111827',
    antiHue: '#cbd5e1',
    description: 'Catalytic hydrogen sponge with silver-white metallic absorption lines.'
  },
  {
    z: 47,
    symbol: 'Ag',
    name: 'Silver',
    act: 3,
    hue: '#0f172a',
    antiHue: '#f1f5f9',
    spectralLineNm: 328.1,
    description:
      'Highest optical reflectivity of any element with intense resonance lines in near-UV.'
  },
  {
    z: 48,
    symbol: 'Cd',
    name: 'Cadmium',
    act: 3,
    hue: '#0d1c29',
    antiHue: '#38bdf8',
    spectralLineNm: 643.8,
    description:
      'Fundamental historic red wavelength standard at 643.8 nm and blue-green helium-cadmium laser.'
  },
  {
    z: 49,
    symbol: 'In',
    name: 'Indium',
    act: 3,
    hue: '#0b0f30',
    antiHue: '#6366f1',
    spectralLineNm: 451.1,
    description:
      'Brilliant indigo-blue atomic emission line at 451.1 nm giving the element its name.'
  },
  {
    z: 50,
    symbol: 'Sn',
    name: 'Tin',
    act: 3,
    hue: '#121826',
    antiHue: '#94a3b8',
    description: 'Extreme-ultraviolet plasma droplet emission driving modern lithography.'
  },
  {
    z: 51,
    symbol: 'Sb',
    name: 'Antimony',
    act: 3,
    hue: '#111b29',
    antiHue: '#67e8f9',
    description: 'Silvery-blue brittle metalloid spark emission with sharp UV-blue lines.'
  },
  {
    z: 52,
    symbol: 'Te',
    name: 'Tellurium',
    act: 3,
    hue: '#0b1d1f',
    antiHue: '#2dd4bf',
    description: 'Greenish-blue flame luminescence and infrared optical semiconductor behavior.'
  },
  {
    z: 53,
    symbol: 'I',
    name: 'Iodine',
    act: 3,
    hue: '#200730',
    antiHue: '#c084fc',
    description: 'Luminous deep violet vapor absorption bands and laser calibration iodine cells.'
  },
  {
    z: 54,
    symbol: 'Xe',
    name: 'Xenon',
    act: 3,
    hue: '#091c30',
    antiHue: '#60a5fa',
    description:
      'Brilliant sky-blue arc flash spectrum closely approximating natural solar daylight.'
  },
  {
    z: 55,
    symbol: 'Cs',
    name: 'Caesium',
    act: 3,
    hue: '#03071e',
    antiHue: '#3a86ff',
    spectralLineNm: 455.5,
    description:
      'Distinctive sky-blue double resonance lines at 455.5 nm and 459.3 nm defining atomic clocks.'
  },
  {
    z: 56,
    symbol: 'Ba',
    name: 'Barium',
    act: 3,
    hue: '#062413',
    antiHue: '#4ade80',
    spectralLineNm: 455.4,
    description: 'Vivid apple-green pyrotechnic flame signature and ionic Fraunhofer barium line.'
  },
  {
    z: 57,
    symbol: 'La',
    name: 'Lanthanum',
    act: 3,
    hue: '#10172d',
    antiHue: '#818cf8',
    description: 'Carbon-arc studio lighting spectrum and lanthanide series gateway.'
  },
  {
    z: 58,
    symbol: 'Ce',
    name: 'Cerium',
    act: 3,
    hue: '#1f1606',
    antiHue: '#f59e0b',
    description: 'Pyrophoric incandescent sparks and ultraviolet solar absorbing cut-off filters.'
  },
  {
    z: 59,
    symbol: 'Pr',
    name: 'Praseodymium',
    act: 3,
    hue: '#082115',
    antiHue: '#10b981',
    description: 'Apple-green didymium optical filtration glass lines with sharp 589 nm cutoff.'
  },
  {
    z: 60,
    symbol: 'Nd',
    name: 'Neodymium',
    act: 3,
    hue: '#240821',
    antiHue: '#ec4899',
    spectralLineNm: 1064,
    description: 'Pivotal 1064 nm Nd:YAG infrared laser line with vivid purple-pink transmission.'
  },
  {
    z: 61,
    symbol: 'Pm',
    name: 'Promethium',
    act: 3,
    hue: '#1f0d2b',
    antiHue: '#d946ef',
    description: 'Radioactive blue-green radioluminescent phosphor excitation glow.'
  },
  {
    z: 62,
    symbol: 'Sm',
    name: 'Samarium',
    act: 3,
    hue: '#241008',
    antiHue: '#f97316',
    description: 'Sharp orange-red optical fluorescence bands in divalent fluorite crystals.'
  },
  {
    z: 63,
    symbol: 'Eu',
    name: 'Europium',
    act: 3,
    hue: '#26060c',
    antiHue: '#f43f5e',
    spectralLineNm: 611,
    description:
      'World-standard bright red phosphor line at 611 nm in televisions and euro banknotes.'
  },
  {
    z: 64,
    symbol: 'Gd',
    name: 'Gadolinium',
    act: 3,
    hue: '#13182b',
    antiHue: '#93c5fd',
    description: 'Narrow ultraviolet phosphorescence transitions and MRI magnetic contrast.'
  },
  {
    z: 65,
    symbol: 'Tb',
    name: 'Terbium',
    act: 3,
    hue: '#072412',
    antiHue: '#22c55e',
    spectralLineNm: 543,
    description: 'Pure green phosphor emission line at 543 nm essential for tricolor lighting.'
  },
  {
    z: 66,
    symbol: 'Dy',
    name: 'Dysprosium',
    act: 3,
    hue: '#1d1c07',
    antiHue: '#facc15',
    description: 'High-intensity metal-halide discharge white arc spectra.'
  },
  {
    z: 67,
    symbol: 'Ho',
    name: 'Holmium',
    act: 3,
    hue: '#241306',
    antiHue: '#fb923c',
    description: 'Extremely sharp calibration absorption peaks spanning the visible and near-IR.'
  },
  {
    z: 68,
    symbol: 'Er',
    name: 'Erbium',
    act: 3,
    hue: '#24081c',
    antiHue: '#f472b6',
    spectralLineNm: 1550,
    description:
      '1550 nm telecommunication fiber optical amplifier emission band and pink glass tint.'
  },
  {
    z: 69,
    symbol: 'Tm',
    name: 'Thulium',
    act: 3,
    hue: '#0b162e',
    antiHue: '#60a5fa',
    description: 'Bright blue atomic upconversion emissions and surgical holmium-thulium lasers.'
  },
  {
    z: 70,
    symbol: 'Yb',
    name: 'Ytterbium',
    act: 3,
    hue: '#121b2b',
    antiHue: '#38bdf8',
    spectralLineNm: 1030,
    description:
      'High-power 1030 nm industrial fiber laser line and optical atomic clock lattice transitions.'
  },
  {
    z: 71,
    symbol: 'Lu',
    name: 'Lutetium',
    act: 3,
    hue: '#19112e',
    antiHue: '#a78bfa',
    description:
      'Final lanthanide element with dense ultraviolet cerium-co-doped scintillator lines.'
  },
  {
    z: 72,
    symbol: 'Hf',
    name: 'Hafnium',
    act: 3,
    hue: '#0e1c2b',
    antiHue: '#22d3ee',
    description: 'High-k dielectric oxide transmission with brilliant spark multiplets.'
  },
  {
    z: 73,
    symbol: 'Ta',
    name: 'Tantalum',
    act: 3,
    hue: '#091f24',
    antiHue: '#2dd4bf',
    description: 'Iridescent interference thin-film oxide hues in microcapacitors.'
  },
  {
    z: 74,
    symbol: 'W',
    name: 'Tungsten',
    act: 3,
    hue: '#241a05',
    antiHue: '#fde047',
    description: 'Continuous blackbody thermal incandescent white-hot emission at 3400 K.'
  },
  {
    z: 75,
    symbol: 'Re',
    name: 'Rhenium',
    act: 3,
    hue: '#1c1329',
    antiHue: '#c084fc',
    description: 'Rare supernova byproduct with catalytic multiline optical transitions.'
  },
  {
    z: 76,
    symbol: 'Os',
    name: 'Osmium',
    act: 3,
    hue: '#081a29',
    antiHue: '#38bdf8',
    description: 'Densest natural element, showing a subtle bluish-white specular luster.'
  },
  {
    z: 77,
    symbol: 'Ir',
    name: 'Iridium',
    act: 3,
    hue: '#201809',
    antiHue: '#facc15',
    description: 'Chicxulub asteroid impact layer biomarker; vibrant rainbow oxidation lines.'
  },
  {
    z: 78,
    symbol: 'Pt',
    name: 'Platinum',
    act: 3,
    hue: '#111827',
    antiHue: '#e2e8f0',
    description: 'Inert noble metal standard with crisp UV-optical spark lines.'
  },
  {
    z: 79,
    symbol: 'Au',
    name: 'Gold',
    act: 3,
    hue: '#1c1500',
    antiHue: '#ffb703',
    spectralLineNm: 583.7,
    description: 'Lustrous golden hue created by relativistic contraction of outer s-orbitals.'
  },
  {
    z: 80,
    symbol: 'Hg',
    name: 'Mercury',
    act: 3,
    hue: '#062024',
    antiHue: '#2dd4bf',
    spectralLineNm: 546.1,
    description:
      'Primary green mercury vapor line at 546.1 nm and triplet lines at 435.8 and 404.7 nm.'
  },
  {
    z: 81,
    symbol: 'Tl',
    name: 'Thallium',
    act: 3,
    hue: '#072412',
    antiHue: '#22c55e',
    spectralLineNm: 535,
    description:
      'Intense emerald-green atomic line at 535.0 nm named after Greek thallos (green shoot).'
  },
  {
    z: 82,
    symbol: 'Pb',
    name: 'Lead',
    act: 3,
    hue: '#111827',
    antiHue: '#94a3b8',
    spectralLineNm: 405.8,
    description:
      'Final stable endpoint of cosmic radioactive decay chains, showing soft bluish-gray lines.'
  },
  {
    z: 83,
    symbol: 'Bi',
    name: 'Bismuth',
    act: 4,
    hue: '#170d2b',
    antiHue: '#d946ef',
    description: 'Iridescent rainbow thin-film oxide wave interference on cooling stepped crystals.'
  },
  {
    z: 84,
    symbol: 'Po',
    name: 'Polonium',
    act: 4,
    hue: '#26081d',
    antiHue: '#f43f5e',
    description:
      'Eerie blue radioluminescent glow caused by intense alpha ionization of surrounding air.'
  },
  {
    z: 85,
    symbol: 'At',
    name: 'Astatine',
    act: 4,
    hue: '#260710',
    antiHue: '#fb7185',
    description: 'Ultra-rare semi-metallic halogen showing dark radioactive vapor absorption.'
  },
  {
    z: 86,
    symbol: 'Rn',
    name: 'Radon',
    act: 4,
    hue: '#170829',
    antiHue: '#a855f7',
    description:
      'Radioactive noble gas glowing with a brilliant yellow-orange discharge below freezing.'
  },
  {
    z: 87,
    symbol: 'Fr',
    name: 'Francium',
    act: 4,
    hue: '#2b0615',
    antiHue: '#f43f5e',
    spectralLineNm: 718,
    description: 'Fleeting alkali optical resonance lines probed in laser magneto-optical traps.'
  },
  {
    z: 88,
    symbol: 'Ra',
    name: 'Radium',
    act: 4,
    hue: '#062615',
    antiHue: '#22c55e',
    spectralLineNm: 482.6,
    description: 'Historic faint blue-green radioluminescent glow discovered by Marie Curie.'
  },
  {
    z: 89,
    symbol: 'Ac',
    name: 'Actinium',
    act: 4,
    hue: '#0b1c30',
    antiHue: '#38bdf8',
    description:
      'High-energy actinide emitting an ethereal pale blue radioluminescent aura in the dark.'
  },
  {
    z: 90,
    symbol: 'Th',
    name: 'Thorium',
    act: 4,
    hue: '#121b2b',
    antiHue: '#60a5fa',
    description: 'Dazzling white incandescent glow in gas mantles and nuclear fuel transitions.'
  },
  {
    z: 91,
    symbol: 'Pa',
    name: 'Protactinium',
    act: 4,
    hue: '#200e30',
    antiHue: '#c084fc',
    description: 'Complex dense actinide spark lines with bright orange-red emission components.'
  },
  {
    z: 92,
    symbol: 'U',
    name: 'Uranium',
    act: 4,
    hue: '#062412',
    antiHue: '#39ff14',
    description: 'Signature radioactive neon green-yellow fluorescence of uranyl ions under UV.'
  },
  {
    z: 93,
    symbol: 'Np',
    name: 'Neptunium',
    act: 4,
    hue: '#091d29',
    antiHue: '#06b6d4',
    description:
      'First synthetic transuranic element, displaying silvery-cyan atomic spark transitions.'
  },
  {
    z: 94,
    symbol: 'Pu',
    name: 'Plutonium',
    act: 4,
    hue: '#260a0a',
    antiHue: '#f97316',
    description: 'Self-heating pyrophoric red-orange thermal glow fueled by intense alpha decay.'
  },
  {
    z: 95,
    symbol: 'Am',
    name: 'Americium',
    act: 4,
    hue: '#240822',
    antiHue: '#ec4899',
    description: 'Smoke-detector alpha emitter producing distinct ruby-pink fluorescence lines.'
  },
  {
    z: 96,
    symbol: 'Cm',
    name: 'Curium',
    act: 4,
    hue: '#1f0a2e',
    antiHue: '#a855f7',
    description:
      'Intense purple radioluminescent air glow surrounding macroscopic metallic spheres.'
  },
  {
    z: 97,
    symbol: 'Bk',
    name: 'Berkelium',
    act: 4,
    hue: '#141a29',
    antiHue: '#38bdf8',
    description: 'Synchrotron-produced transuranic element with distinctive green emission bands.'
  },
  {
    z: 98,
    symbol: 'Cf',
    name: 'Californium',
    act: 4,
    hue: '#241208',
    antiHue: '#fb923c',
    description: 'Prolific neutron emitter radiating strong amber-orange optical transitions.'
  },
  {
    z: 99,
    symbol: 'Es',
    name: 'Einsteinium',
    act: 4,
    hue: '#0b2426',
    antiHue: '#2dd4bf',
    description:
      'First identified in thermonuclear fallout; glows with a self-excited ghostly cyan hue.'
  },
  {
    z: 100,
    symbol: 'Fm',
    name: 'Fermium',
    act: 4,
    hue: '#1b0a2e',
    antiHue: '#c084fc',
    description:
      'Heaviest element synthesizable via neutron capture; intense violet spark spectrum.'
  },
  {
    z: 101,
    symbol: 'Md',
    name: 'Mendelevium',
    act: 4,
    hue: '#260718',
    antiHue: '#f43f5e',
    description: 'First element produced one atom at a time; exotic divalent gas phase lines.'
  },
  {
    z: 102,
    symbol: 'No',
    name: 'Nobelium',
    act: 4,
    hue: '#0e182b',
    antiHue: '#60a5fa',
    spectralLineNm: 351,
    description: 'Laser spectroscopy in gas cells revealed prominent 351 nm resonance transition.'
  },
  {
    z: 103,
    symbol: 'Lr',
    name: 'Lawrencium',
    act: 4,
    hue: '#1e112b',
    antiHue: '#a78bfa',
    description: 'Final actinide, proving anomalous relativistic 7p valence orbital stabilization.'
  },
  {
    z: 104,
    symbol: 'Rf',
    name: 'Rutherfordium',
    act: 4,
    hue: '#091e2b',
    antiHue: '#22d3ee',
    description:
      'Pioneering superheavy transactinide defying non-relativistic electron configurations.'
  },
  {
    z: 105,
    symbol: 'Db',
    name: 'Dubnium',
    act: 4,
    hue: '#0a2124',
    antiHue: '#2dd4bf',
    description:
      'Synthesized at Dubna and Berkeley; exhibits relativistic tantalum-like spark lines.'
  },
  {
    z: 106,
    symbol: 'Sg',
    name: 'Seaborgium',
    act: 4,
    hue: '#0d241d',
    antiHue: '#34d399',
    description: 'Volatile superheavy hexacarbonyl with predicted green laser excitation lines.'
  },
  {
    z: 107,
    symbol: 'Bh',
    name: 'Bohrium',
    act: 4,
    hue: '#1f0d2b',
    antiHue: '#d946ef',
    description:
      'Relativistic quantum chemistry signature confirming Group 7 oxychloride transitions.'
  },
  {
    z: 108,
    symbol: 'Hs',
    name: 'Hassium',
    act: 4,
    hue: '#081c2e',
    antiHue: '#38bdf8',
    description: 'Superheavy tetroxide former showing blue-shifted relativistic core orbitals.'
  },
  {
    z: 109,
    symbol: 'Mt',
    name: 'Meitnerium',
    act: 4,
    hue: '#20160a',
    antiHue: '#fbbf24',
    description: 'Named in honor of Lise Meitner; relativistic noble metal electron transitions.'
  },
  {
    z: 110,
    symbol: 'Ds',
    name: 'Darmstadtium',
    act: 4,
    hue: '#111827',
    antiHue: '#94a3b8',
    description: 'Superheavy Group 10 metal with strong relativistic contraction of the 8s shell.'
  },
  {
    z: 111,
    symbol: 'Rg',
    name: 'Roentgenium',
    act: 4,
    hue: '#241a06',
    antiHue: '#f59e0b',
    description: 'Predicted to display a deep golden relativistic reflection spectrum akin to Au.'
  },
  {
    z: 112,
    symbol: 'Cn',
    name: 'Copernicium',
    act: 4,
    hue: '#072024',
    antiHue: '#2dd4bf',
    description:
      'Relativistically stabilized closed-shell superheavy volatile metal akin to noble gases.'
  },
  {
    z: 113,
    symbol: 'Nh',
    name: 'Nihonium',
    act: 4,
    hue: '#160d2b',
    antiHue: '#818cf8',
    description: 'First element discovered in Asia (RIKEN); extreme spin-orbit 7p1/2 splitting.'
  },
  {
    z: 114,
    symbol: 'Fl',
    name: 'Flerovium',
    act: 4,
    hue: '#0a1d2e',
    antiHue: '#60a5fa',
    description:
      'Heart of the Island of Stability, displaying high volatility and inert gas behavior.'
  },
  {
    z: 115,
    symbol: 'Mc',
    name: 'Moscovium',
    act: 4,
    hue: '#1e0c2b',
    antiHue: '#c084fc',
    description: 'Rapidly decaying transactinide with strong relativistic quantum spin dynamics.'
  },
  {
    z: 116,
    symbol: 'Lv',
    name: 'Livermorium',
    act: 4,
    hue: '#24081c',
    antiHue: '#f43f5e',
    description: 'Chalcogen titan synthesized via curium-calcium heavy-ion fusion reactions.'
  },
  {
    z: 117,
    symbol: 'Ts',
    name: 'Tennessine',
    act: 4,
    hue: '#240711',
    antiHue: '#fb7185',
    description:
      'Relativistic superheavy halogen predicted to exhibit metallic semiconductor bands.'
  },
  {
    z: 118,
    symbol: 'Og',
    name: 'Oganesson',
    act: 4,
    hue: '#16082e',
    antiHue: '#a855f7',
    description:
      'Terminal element of the periodic table; extreme quantum electrodynamic Thomas-Fermi electron smear.'
  }
];

export const SPECTROSCOPY_BY_Z: Record<number, ElementSpectroscopy> = Object.fromEntries(
  SPECTROSCOPY_DATABASE.map((el) => [el.z, el])
);

export const SPECTROSCOPY_BY_SYMBOL: Record<string, ElementSpectroscopy> = Object.fromEntries(
  SPECTROSCOPY_DATABASE.map((el) => [el.symbol.toLowerCase(), el])
);

/**
 * Retrieves the spectroscopic signature and palette for an element by atomic number (Z),
 * symbol, or element name.
 */
export function getElementSpectroscopy(zOrSymbol: number | string): ElementSpectroscopy {
  if (typeof zOrSymbol === 'number') {
    const el = SPECTROSCOPY_BY_Z[zOrSymbol];
    if (el) return el;
  } else if (typeof zOrSymbol === 'string') {
    const parsed = Number.parseInt(zOrSymbol, 10);
    if (!Number.isNaN(parsed) && SPECTROSCOPY_BY_Z[parsed]) {
      return SPECTROSCOPY_BY_Z[parsed];
    }
    const clean = zOrSymbol.trim().toLowerCase();
    const bySym = SPECTROSCOPY_BY_SYMBOL[clean];
    if (bySym) return bySym;
    const byName = SPECTROSCOPY_DATABASE.find((e) => e.name.toLowerCase() === clean);
    if (byName) return byName;
  }
  // Fallback to Hydrogen if unmapped
  return SPECTROSCOPY_DATABASE[0];
}
