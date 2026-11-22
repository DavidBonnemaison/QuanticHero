import type Phaser from 'phaser';
import type { HeroSkin } from '../types';
import type { HeroVisualState } from './HeroRenderer';

export type PixelHeroSkinId =
  | 'gameboy'
  | 'pico'
  | 'megabit'
  | 'astronaut'
  | 'cybercat'
  | 'hazmat'
  | 'samurai'
  | 'bot'
  | 'wizard'
  | 'ninja';

export const PIXEL_HERO_SKIN_IDS: readonly PixelHeroSkinId[] = [
  'gameboy',
  'pico',
  'megabit',
  'astronaut',
  'cybercat',
  'hazmat',
  'samurai',
  'bot',
  'wizard',
  'ninja'
] as const;

export const ALL_HERO_SKINS: readonly HeroSkin[] = [
  'pico',
  'gameboy',
  'megabit',
  'astronaut',
  'cybercat',
  'hazmat',
  'samurai',
  'bot',
  'wizard',
  'ninja',
  'neo',
  'quantum',
  'classic'
] as const;

export function isPixelHeroSkin(skin: HeroSkin): skin is PixelHeroSkinId {
  return (PIXEL_HERO_SKIN_IDS as readonly string[]).includes(skin);
}

/**
 * Matches classic `hero.png` animation timings:
 * - idle: 4 frames @ 10 fps
 * - run:  6 frames @ 30 fps
 * - jump: 3 frames @ 3 fps
 */
export const PIXEL_ANIM_CONFIG = {
  idleFrames: 4,
  idleFps: 10,
  runFrames: 6,
  runFps: 30,
  jumpFrames: 3,
  jumpFps: 3
} as const;

interface PixelSkinSpec {
  id: PixelHeroSkinId;
  /** 11-row upper body (rows 0..10), 14 cols wide, asymmetric 3/4-profile facing RIGHT */
  upperNormal: readonly string[];
  /** 11-row upper body variant with blink / subtle standby expression (same height — zero squash) */
  upperBlink: readonly string[];
  /** 11-row upper body variant while running (arms swinging forward/back, same height) */
  upperRunA: readonly string[];
  upperRunB: readonly string[];
  /** 11-row upper body variant while airborne/jumping */
  upperJump: readonly string[];
  /** Leg/boot color keys */
  legKey: string;
  bootKey: string;
  /** Palette mapping single-char keys to 0xRRGGBB; 'A' uses dynamic phase/accent color */
  palette: Record<string, number>;
}

// ============================================================================
// Shared 5-row lower-body animations (rows 11..15, 14 cols, facing RIGHT).
// All idle & run frames maintain exact 16-row total height so the hero NEVER
// squashes when moving, with feet planted flush on row 15 (y + 32).
// ============================================================================
function buildLegs(template: readonly string[], legKey: string, bootKey: string): string[] {
  return template.map((row) => row.replace(/L/g, legKey).replace(/B/g, bootKey));
}

// 4-frame idle lower body (planted flush on row 15, subtle weight shift on frame 2)
const LEGS_IDLE_0 = [
  '....OLLLLOO...',
  '....OL..LOO...',
  '....OL..LOO...',
  '....OB..BOO...',
  '...OOOB.BOOO..'
];
const LEGS_IDLE_1 = [
  '....OLLLLOO...',
  '....OL..LOO...',
  '....OL..LOO...',
  '....OB..BOO...',
  '...OOOB.BOOO..'
];
const LEGS_IDLE_2 = [
  '....OLLLLOO...',
  '....OL..LOO...',
  '....OL..LOO...',
  '....OB..BBO...',
  '...OOOB.BOOO..'
];
const LEGS_IDLE_3 = LEGS_IDLE_0;

// 6-frame smooth run cycle (matching hero.png's 6-frame @ 30fps run cadence, constant 16-row height!)
const LEGS_RUN_FRAMES = [
  // Frame 0: wide stride right foot forward
  ['....OLLLLOO...', '...OLL..LLO...', '..OLL....LLO..', '..OBB....BBO..', '..OOO....OOO..'],
  // Frame 1: contact / pull-through
  ['....OLLLLOO...', '....OLL.LLO...', '...OLL...LLO..', '...OBB...BBO..', '...OOO...OOO..'],
  // Frame 2: passing (legs cross beneath torso, right knee slightly lifted)
  ['....OLLLLOO...', '....OLLLLOO...', '.....OLLLO....', '....OBBOOBO...', '....OOO..OO...'],
  // Frame 3: wide stride left foot forward
  ['....OLLLLOO...', '...OLL..LLO...', '..OLL....LLO..', '..BBO....OBB..', '..OOO....OOO..'],
  // Frame 4: contact / pull-through
  ['....OLLLLOO...', '....OLL.LLO...', '...OLL...LLO..', '...BBO...OBB..', '...OOO...OOO..'],
  // Frame 5: passing opposite
  ['....OLLLLOO...', '....OLLLLOO...', '.....OLLLO....', '...OBOOBBO....', '...OO..OOO....']
];

// 3-frame jump cycle (launch, apex, descent — matching hero.png's 3-frame jump)
const LEGS_JUMP_FRAMES = [
  // Frame 0: launch (front knee tucked forward)
  ['....OLLLLOO...', '...OLL..LLO...', '...OBB...LLO..', '...OOO...BBO..', '.........OOO..'],
  // Frame 1: apex (both knees tucked)
  ['....OLLLLOO...', '...OLL..LLO...', '...OBB..BBO...', '...OOO..OOO...', '..............'],
  // Frame 2: descent (legs reaching down toward platform)
  ['....OLLLLOO...', '....OL..LOO...', '...OLL..LLO...', '...OBB..BBO...', '...OOO..OOO...']
];

// ============================================================================
// 10 Distinct Asymmetric 3/4-Profile Skins (all facing RIGHT by default so
// horizontal flipX makes left <-> right turns immediately unmistakable!)
// ============================================================================
export const PIXEL_SKIN_SPECS: Record<PixelHeroSkinId, PixelSkinSpec> = {
  // 1. PICO — Evolved PICO-8 Lab Scientist (direct successor to hero.png)
  pico: {
    id: 'pico',
    upperNormal: [
      '...OOOOOOO....',
      '..OHHHHHHHO...',
      '..OHHSSSSSSO..',
      '..OHSSESSEESO.',
      '..OSSSSSSSSO..',
      '...OOOOOOOO...',
      '..OOWWWWWWO...',
      '.OWWWAAAWWWO..',
      '.OSWWAAAWWWOO.',
      '..OOWWWWWWO...',
      '...OOWWWWOO...'
    ],
    upperBlink: [
      '...OOOOOOO....',
      '..OHHHHHHHO...',
      '..OHHSSSSSSO..',
      '..OHSSSSSSSSO.',
      '..OSSSSSSSSO..',
      '...OOOOOOOO...',
      '..OOWWWWWWO...',
      '.OWWWAAAWWWO..',
      '.OSWWAAAWWWOO.',
      '..OOWWWWWWO...',
      '...OOWWWWOO...'
    ],
    upperRunA: [
      '...OOOOOOO....',
      '..OHHHHHHHO...',
      '..OHHSSSSSSO..',
      '..OHSSESSEESO.',
      '..OSSSSSSSSO..',
      '...OOOOOOOO...',
      '..OOWWWWWWO...',
      '.OSWWAAAWWWOO.',
      '..OOWAAAWWWOS.',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    upperRunB: [
      '...OOOOOOO....',
      '..OHHHHHHHO...',
      '..OHHSSSSSSO..',
      '..OHSSESSEESO.',
      '..OSSSSSSSSO..',
      '...OOOOOOOO...',
      '..OOWWWWWWO...',
      '..OWWAAAWWWOS.',
      '.OSWWAAAWWWO..',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    upperJump: [
      '...OOOOOOO....',
      '..OHHHHHHHO...',
      '..OHHSSSSSSO..',
      '..OHSSESSEESO.',
      '..OSSSSSSSSOO.',
      '...OOOOOOOOOS.',
      '..OOWWWWWWWOO.',
      '.OSWWAAAWWWO..',
      '..OOWAAAWWWO..',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    legKey: 'D',
    bootKey: 'B',
    palette: {
      O: 0x050814,
      H: 0x7c2d12,
      S: 0xfdba74,
      E: 0x050814,
      W: 0xf8fafc,
      D: 0x334155,
      B: 0xf59e0b
    }
  },

  // 2. GAMEBOY — Classic DMG 4-Shade LCD Hero (asymmetric visor & antenna)
  gameboy: {
    id: 'gameboy',
    upperNormal: [
      '...OO.OOOO....',
      '..OAAOLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLAEAELO..',
      '..OLLLLLLLLO..',
      '...OOOOOOOO...',
      '..OOMMMMMMOO..',
      '.ODOMMMAAAMO..',
      '.ODOMMMAAAMOO.',
      '..OOMMMMMMOO..',
      '...OOMMMMOO...'
    ],
    upperBlink: [
      '...OO.OOOO....',
      '..OAAOLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLLLLLLO..',
      '...OOOOOOOO...',
      '..OOMMMMMMOO..',
      '.ODOMMMAAAMO..',
      '.ODOMMMAAAMOO.',
      '..OOMMMMMMOO..',
      '...OOMMMMOO...'
    ],
    upperRunA: [
      '..OO..OOOO....',
      '..OAAOLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLAEAELO..',
      '..OLLLLLLLLO..',
      '...OOOOOOOO...',
      '..OOMMMMMMOO..',
      '.ODOMMMAAAMOO.',
      '..OOMMMAAAMOD.',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    upperRunB: [
      '...OO.OOOO....',
      '..OAAOLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLAEAELO..',
      '..OLLLLLLLLO..',
      '...OOOOOOOO...',
      '..OOMMMMMMOO..',
      '..OMMMMAAAMOD.',
      '.ODOMMMAAAMO..',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    upperJump: [
      '..OO..OOOO....',
      '..OAAOLLLLLO..',
      '..OLLLLLLLLO..',
      '..OLLLAEAELO..',
      '..OLLLLLLLLOO.',
      '...OOOOOOOOOD.',
      '..OOMMMMMMMOO.',
      '.ODOMMMAAAMO..',
      '..OOMMMAAAMO..',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    legKey: 'M',
    bootKey: 'D',
    palette: {
      O: 0x0f380f,
      D: 0x306230,
      M: 0x8bac0f,
      L: 0x9bbc0f,
      E: 0x0f380f
    }
  },

  // 3. MEGABIT — 8-Bit NES Blue Jumper with arm buster on front side
  megabit: {
    id: 'megabit',
    upperNormal: [
      '...OOOOOOO....',
      '..OBBBAAABBO..',
      '..OBBBSSSSSO..',
      '..OBBSESSEESO.',
      '..OBBSSSSSSO..',
      '...OOOOOOOO...',
      '..OOBBBAAABO..',
      '.OBOBBBBBBAOO.',
      '.OBOBBBBBAAAO.',
      '..OOBBBBBBBO..',
      '...OOBBBBOO...'
    ],
    upperBlink: [
      '...OOOOOOO....',
      '..OBBBAAABBO..',
      '..OBBBSSSSSO..',
      '..OBBSSSSSSO..',
      '..OBBSSSSSSO..',
      '...OOOOOOOO...',
      '..OOBBBAAABO..',
      '.OBOBBBBBBAOO.',
      '.OBOBBBBBAAAO.',
      '..OOBBBBBBBO..',
      '...OOBBBBOO...'
    ],
    upperRunA: [
      '...OOOOOOO....',
      '..OBBBAAABBO..',
      '..OBBBSSSSSO..',
      '..OBBSESSEESO.',
      '..OBBSSSSSSO..',
      '...OOOOOOOO...',
      '..OOBBBAAABO..',
      '.OBOBBBBBAAAO.',
      '..OOBBBBBBAOO.',
      '...OOBBBBOO...',
      '...OOBBBBOO...'
    ],
    upperRunB: [
      '...OOOOOOO....',
      '..OBBBAAABBO..',
      '..OBBBSSSSSO..',
      '..OBBSESSEESO.',
      '..OBBSSSSSSO..',
      '...OOOOOOOO...',
      '..OOBBBAAABO..',
      '..OBBBBBBBAOO.',
      '.OBOBBBBBAAAO.',
      '...OOBBBBOO...',
      '...OOBBBBOO...'
    ],
    upperJump: [
      '...OOOOOOO....',
      '..OBBBAAABBO..',
      '..OBBBSSSSSO..',
      '..OBBSESSEESO.',
      '..OBBSSSSSSOO.',
      '...OOOOOOOOOA.',
      '..OOBBBAAABAO.',
      '.OBOBBBBBBOO..',
      '..OOBBBBBBBO..',
      '...OOBBBBOO...',
      '...OOBBBBOO...'
    ],
    legKey: 'B',
    bootKey: 'A',
    palette: {
      O: 0x050814,
      B: 0x2563eb,
      S: 0xfed7aa,
      E: 0x050814
    }
  },

  // 4. ASTRONAUT — Retro Cosmonaut with backpack on back & golden visor facing right
  astronaut: {
    id: 'astronaut',
    upperNormal: [
      '...OOOOOOO....',
      '..OWWWWWWWWO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGYO.',
      '..OWWOGGGGGO..',
      '...OOOOOOOO...',
      '.ODOWWWAAWWO..',
      '.ODOWWWWWWWOO.',
      '.ODOWWWDDWWWO.',
      '.OOOWWWWWWWOO.',
      '...OOWWWWOO...'
    ],
    upperBlink: [
      '...OOOOOOO....',
      '..OWWWWWWWWO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGO..',
      '...OOOOOOOO...',
      '.ODOWWWAAWWO..',
      '.ODOWWWWWWWOO.',
      '.ODOWWWDDWWWO.',
      '.OOOWWWWWWWOO.',
      '...OOWWWWOO...'
    ],
    upperRunA: [
      '...OOOOOOO....',
      '..OWWWWWWWWO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGYO.',
      '..OWWOGGGGGO..',
      '...OOOOOOOO...',
      '.ODOWWWAAWWOO.',
      '.ODOWWWWWWWOW.',
      '.OOOWWWDDWWO..',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    upperRunB: [
      '...OOOOOOO....',
      '..OWWWWWWWWO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGYO.',
      '..OWWOGGGGGO..',
      '...OOOOOOOO...',
      '.ODOWWWAAWWO..',
      '.ODOWWWWWWWO..',
      '.ODOWWWDDWWOW.',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    upperJump: [
      '...OOOOOOO....',
      '..OWWWWWWWWO..',
      '..OWWOGGGGGO..',
      '..OWWOGGGGGYO.',
      '..OWWOGGGGGOO.',
      '.OAOOOOOOOOOW.',
      '.ODOWWWAAWWOO.',
      '.ODOWWWDDWWO..',
      '.OOOWWWWWWWOO.',
      '...OOWWWWOO...',
      '...OOWWWWOO...'
    ],
    legKey: 'W',
    bootKey: 'D',
    palette: {
      O: 0x050814,
      W: 0xe2e8f0,
      G: 0xfbbf24,
      Y: 0xfef08a,
      D: 0x475569
    }
  },

  // 5. CYBERCAT — Schrödinger's 8-Bit Cat (swishing tail on back, muzzle facing right)
  cybercat: {
    id: 'cybercat',
    upperNormal: [
      '..OO....OO....',
      '.OFOO..OOFO...',
      '.OFPFOOOFPFO..',
      '..OFFFAFFAEFO.',
      '..OFFFFWWWWWO.',
      '...OOOOOOOOO..',
      '.OO.OOAAAAOO..',
      'OFO.OFFFFFFOO.',
      '.OO.OFFFFFFO..',
      '....OOFFFFOO..',
      '....OOFFFFOO..'
    ],
    upperBlink: [
      '..OO....OO....',
      '.OFOO..OOFO...',
      '.OFPFOOOFPFO..',
      '..OFFFFFFFFFO.',
      '..OFFFFWWWWWO.',
      '...OOOOOOOOO..',
      '.OO.OOAAAAOO..',
      'OFO.OFFFFFFOO.',
      '.OO.OFFFFFFO..',
      '....OOFFFFOO..',
      '....OOFFFFOO..'
    ],
    upperRunA: [
      '..OO....OO....',
      '.OFOO..OOFO...',
      '.OFPFOOOFPFO..',
      '..OFFFAFFAEFO.',
      '..OFFFFWWWWWO.',
      '...OOOOOOOOO..',
      'OO..OOAAAAOO..',
      '.OO.OFFFFFFOW.',
      '....OFFFFFFO..',
      '....OOFFFFOO..',
      '....OOFFFFOO..'
    ],
    upperRunB: [
      '..OO....OO....',
      '.OFOO..OOFO...',
      '.OFPFOOOFPFO..',
      '..OFFFAFFAEFO.',
      '..OFFFFWWWWWO.',
      '...OOOOOOOOO..',
      '.OO.OOAAAAOO..',
      'OFO.OFFFFFFO..',
      '....OFFFFFFOW.',
      '....OOFFFFOO..',
      '....OOFFFFOO..'
    ],
    upperJump: [
      '..OO....OO....',
      '.OFOO..OOFO...',
      '.OFPFOOOFPFO..',
      '..OFFFAFFAEFO.',
      '..OFFFFWWWWWO.',
      '...OOOOOOOOOW.',
      'OO..OOAAAAOOO.',
      '.OO.OFFFFFFO..',
      '....OFFFFFFO..',
      '....OOFFFFOO..',
      '....OOFFFFOO..'
    ],
    legKey: 'F',
    bootKey: 'W',
    palette: {
      O: 0x050814,
      F: 0x334155,
      P: 0xf472b6,
      W: 0xf8fafc,
      E: 0x050814
    }
  },

  // 6. HAZMAT — Reactor Hazmat Tech (air tank on back, respirator facing right)
  hazmat: {
    id: 'hazmat',
    upperNormal: [
      '...OOOOOOO....',
      '..OYYYYYYYYO..',
      '..OYYODDDDDO..',
      '..OYYODADADO..',
      '..OYYODDDDDO..',
      '...OOOOOOOO...',
      '.ODOYYYAAYYO..',
      '.ODOYYYYYYYOO.',
      '.ODOYYYDDYYYO.',
      '.OOOYYYYYYYOO.',
      '...OOYYYYOO...'
    ],
    upperBlink: [
      '...OOOOOOO....',
      '..OYYYYYYYYO..',
      '..OYYODDDDDO..',
      '..OYYODDDDDO..',
      '..OYYODDDDDO..',
      '...OOOOOOOO...',
      '.ODOYYYAAYYO..',
      '.ODOYYYYYYYOO.',
      '.ODOYYYDDYYYO.',
      '.OOOYYYYYYYOO.',
      '...OOYYYYOO...'
    ],
    upperRunA: [
      '...OOOOOOO....',
      '..OYYYYYYYYO..',
      '..OYYODDDDDO..',
      '..OYYODADADO..',
      '..OYYODDDDDO..',
      '...OOOOOOOO...',
      '.ODOYYYAAYYOO.',
      '.ODOYYYYYYYOD.',
      '.OOOYYYDDYYO..',
      '...OOYYYYOO...',
      '...OOYYYYOO...'
    ],
    upperRunB: [
      '...OOOOOOO....',
      '..OYYYYYYYYO..',
      '..OYYODDDDDO..',
      '..OYYODADADO..',
      '..OYYODDDDDO..',
      '...OOOOOOOO...',
      '.ODOYYYAAYYO..',
      '.ODOYYYYYYYO..',
      '.ODOYYYDDYYOD.',
      '...OOYYYYOO...',
      '...OOYYYYOO...'
    ],
    upperJump: [
      '...OOOOOOO....',
      '..OYYYYYYYYO..',
      '..OYYODDDDDO..',
      '..OYYODADADO..',
      '..OYYODDDDDOO.',
      '.ODOOOOOOOOOY.',
      '.ODOYYYAAYYOO.',
      '.OOOYYYDDYYO..',
      '...OOYYYYYYOO.',
      '...OOYYYYOO...',
      '...OOYYYYOO...'
    ],
    legKey: 'Y',
    bootKey: 'D',
    palette: {
      O: 0x050814,
      Y: 0xfacc15,
      D: 0x1e293b
    }
  },

  // 7. SAMURAI — Neon Cyber-Ronin (kasa hat, glowing eyes facing right, scarf trailing left)
  samurai: {
    id: 'samurai',
    upperNormal: [
      '.....OOOO.....',
      '...OOHHHHOO...',
      '.OOHHHHHHHHOO.',
      'OOHHHHHHHHHHOO',
      '..OODDDADADO..',
      '...OOOOOOOO...',
      '.ORODDDAAADO..',
      'ORRODDDDDDDOO.',
      '..OODDDRRDDO..',
      '...OODDDDOO...',
      '...OODDDDOO...'
    ],
    upperBlink: [
      '.....OOOO.....',
      '...OOHHHHOO...',
      '.OOHHHHHHHHOO.',
      'OOHHHHHHHHHHOO',
      '..OODDDDDDDO..',
      '...OOOOOOOO...',
      '.ORODDDAAADO..',
      'ORRODDDDDDDOO.',
      '..OODDDRRDDO..',
      '...OODDDDOO...',
      '...OODDDDOO...'
    ],
    upperRunA: [
      '.....OOOO.....',
      '...OOHHHHOO...',
      '.OOHHHHHHHHOO.',
      'OOHHHHHHHHHHOO',
      '..OODDDADADO..',
      '...OOOOOOOO...',
      'ORRODDDAAADOO.',
      '.OOODDDDDDDOR.',
      '...OODDRRDDO..',
      '...OODDDDOO...',
      '...OODDDDOO...'
    ],
    upperRunB: [
      '.....OOOO.....',
      '...OOHHHHOO...',
      '.OOHHHHHHHHOO.',
      'OOHHHHHHHHHHOO',
      '..OODDDADADO..',
      '...OOOOOOOO...',
      '.ORODDDAAADO..',
      'ORRODDDDDDDO..',
      '...OODDRRDDOR.',
      '...OODDDDOO...',
      '...OODDDDOO...'
    ],
    upperJump: [
      '.....OOOO.....',
      '...OOHHHHOO...',
      '.OOHHHHHHHHOO.',
      'OOHHHHHHHHHHOO',
      '..OODDDADADOO.',
      '...OOOOOOOOOR.',
      'ORRODDDAAADOO.',
      '..OODDDRRDDO..',
      '...OODDDDOO...',
      '...OODDDDOO...',
      '...OODDDDOO...'
    ],
    legKey: 'D',
    bootKey: 'R',
    palette: {
      O: 0x050814,
      H: 0xd97706,
      D: 0x1e293b,
      R: 0xe11d48
    }
  },

  // 8. BOT — Retro CRT Arcade Bot (screen & eyes facing right, antenna on back)
  bot: {
    id: 'bot',
    upperNormal: [
      '...OO.........',
      '..OAAO........',
      '..OOOOOOOOOO..',
      '..OMMODDDDDO..',
      '..OMMODADADO..',
      '..OMMODDDDDO..',
      '..OOOOOOOOOO..',
      '..OOMMMAAAMO..',
      '.OMOMMMMMMMOO.',
      '..OOMMMMMMOO..',
      '...OOMMMMOO...'
    ],
    upperBlink: [
      '...OO.........',
      '..OAAO........',
      '..OOOOOOOOOO..',
      '..OMMODDDDDO..',
      '..OMMODAAADO..',
      '..OMMODDDDDO..',
      '..OOOOOOOOOO..',
      '..OOMMMAAAMO..',
      '.OMOMMMMMMMOO.',
      '..OOMMMMMMOO..',
      '...OOMMMMOO...'
    ],
    upperRunA: [
      '..OO..........',
      '..OAAO........',
      '..OOOOOOOOOO..',
      '..OMMODDDDDO..',
      '..OMMODADADO..',
      '..OMMODDDDDO..',
      '..OOOOOOOOOO..',
      '.OMOMMMAAAMOO.',
      '..OOMMMMMMMOM.',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    upperRunB: [
      '...OO.........',
      '..OAAO........',
      '..OOOOOOOOOO..',
      '..OMMODDDDDO..',
      '..OMMODADADO..',
      '..OMMODDDDDO..',
      '..OOOOOOOOOO..',
      '..OOMMMAAAMOM.',
      '.OMOMMMMMMMO..',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    upperJump: [
      '..OO..........',
      '..OAAO........',
      '..OOOOOOOOOO..',
      '..OMMODDDDDO..',
      '..OMMODADADO..',
      '..OMMODDDDDOO.',
      '..OOOOOOOOOOM.',
      '.OMOMMMAAAMOO.',
      '..OOMMMMMMOO..',
      '...OOMMMMOO...',
      '...OOMMMMOO...'
    ],
    legKey: 'D',
    bootKey: 'M',
    palette: {
      O: 0x050814,
      M: 0x94a3b8,
      D: 0x0f172a
    }
  },

  // 9. WIZARD — 8-Bit Quantum Alchemist (hat tip leaning back, glowing eyes facing right)
  wizard: {
    id: 'wizard',
    upperNormal: [
      '...OOOO.......',
      '..OPPPPPO.....',
      '...OPPPPPPO...',
      '..OOPPAAAAOO..',
      '.OOPPPPPPPPOO.',
      '..OODDDYDDYO..',
      '...OOOOOOOO...',
      '..OOPPPAAAPO..',
      '.OPOPPPPPPPPO.',
      '..OOPPPPPPPO..',
      '...OOPPPPOO...'
    ],
    upperBlink: [
      '...OOOO.......',
      '..OPPPPPO.....',
      '...OPPPPPPO...',
      '..OOPPAAAAOO..',
      '.OOPPPPPPPPOO.',
      '..OODDDDDDDO..',
      '...OOOOOOOO...',
      '..OOPPPAAAPO..',
      '.OPOPPPPPPPPO.',
      '..OOPPPPPPPO..',
      '...OOPPPPOO...'
    ],
    upperRunA: [
      '..OOOO........',
      '..OPPPPPO.....',
      '...OPPPPPPO...',
      '..OOPPAAAAOO..',
      '.OOPPPPPPPPOO.',
      '..OODDDYDDYO..',
      '...OOOOOOOO...',
      '.OPOPPPAAAPOO.',
      '..OOPPPPPPPOP.',
      '...OOPPPPOO...',
      '...OOPPPPOO...'
    ],
    upperRunB: [
      '...OOOO.......',
      '..OPPPPPO.....',
      '...OPPPPPPO...',
      '..OOPPAAAAOO..',
      '.OOPPPPPPPPOO.',
      '..OODDDYDDYO..',
      '...OOOOOOOO...',
      '..OOPPPAAAPOP.',
      '.OPOPPPPPPPO..',
      '...OOPPPPOO...',
      '...OOPPPPOO...'
    ],
    upperJump: [
      '..OOOO........',
      '..OPPPPPO.....',
      '...OPPPPPPO...',
      '..OOPPAAAAOO..',
      '.OOPPPPPPPPOO.',
      '..OODDDYDDYOO.',
      '...OOOOOOOOOP.',
      '.OPOPPPAAAPOO.',
      '..OOPPPPPPPO..',
      '...OOPPPPOO...',
      '...OOPPPPOO...'
    ],
    legKey: 'D',
    bootKey: 'B',
    palette: {
      O: 0x050814,
      P: 0x7c3aed,
      D: 0x090d16,
      Y: 0xfef08a,
      B: 0x92400e
    }
  },

  // 10. NINJA — 8-Bit Shadow Shinobi (flowing headband trailing left, eyes facing right)
  ninja: {
    id: 'ninja',
    upperNormal: [
      '...OOOOOOO....',
      '..ONNNNNNNO...',
      '.OOAAAAAAAOO..',
      'OAAONNSSSSSO..',
      '..ONNSESSESO..',
      '...OOOOOOOO...',
      '..OONNNAAANO..',
      '.ONONNNNNNNOO.',
      '.ONONNNDDNNNO.',
      '..OONNNNNNNO..',
      '...OONNNNOO...'
    ],
    upperBlink: [
      '...OOOOOOO....',
      '..ONNNNNNNO...',
      '.OOAAAAAAAOO..',
      'OAAONNSSSSSO..',
      '..ONNSSSSSSO..',
      '...OOOOOOOO...',
      '..OONNNAAANO..',
      '.ONONNNNNNNOO.',
      '.ONONNNDDNNNO.',
      '..OONNNNNNNO..',
      '...OONNNNOO...'
    ],
    upperRunA: [
      '...OOOOOOO....',
      '..ONNNNNNNO...',
      'OOOAAAAAAAOO..',
      'OAAONNSSSSSO..',
      '..ONNSESSESO..',
      '...OOOOOOOO...',
      '.ONONNNAAANOO.',
      '..OONNNNNNNON.',
      '...OONNDDNNO..',
      '...OONNNNOO...',
      '...OONNNNOO...'
    ],
    upperRunB: [
      '...OOOOOOO....',
      '..ONNNNNNNO...',
      '.OOAAAAAAAOO..',
      '.OAONNSSSSSO..',
      '..ONNSESSESO..',
      '...OOOOOOOO...',
      '..OONNNAAANON.',
      '.ONONNNNNNNO..',
      '...OONNDDNNON.',
      '...OONNNNOO...',
      '...OONNNNOO...'
    ],
    upperJump: [
      '...OOOOOOO....',
      '..ONNNNNNNO...',
      'OOOAAAAAAAOO..',
      'OAAONNSSSSSO..',
      '..ONNSESSESOO.',
      '...OOOOOOOOON.',
      '.ONONNNAAANOO.',
      '..OONNNDDNNO..',
      '...OONNNNNNO..',
      '...OONNNNOO...',
      '...OONNNNOO...'
    ],
    legKey: 'N',
    bootKey: 'D',
    palette: {
      O: 0x050814,
      N: 0x1e293b,
      S: 0xfdba74,
      E: 0x050814,
      D: 0x475569
    }
  }
};

function selectCompositeFrame(
  spec: PixelSkinSpec,
  timeMs: number,
  state: HeroVisualState
): string[] {
  if (state.isAirborne || state.isDiving) {
    const jf =
      Math.floor((timeMs / 1000) * PIXEL_ANIM_CONFIG.jumpFps) % PIXEL_ANIM_CONFIG.jumpFrames;
    return [...spec.upperJump, ...buildLegs(LEGS_JUMP_FRAMES[jf], spec.legKey, spec.bootKey)];
  }

  if (state.isRunning) {
    const rf = Math.floor((timeMs / 1000) * PIXEL_ANIM_CONFIG.runFps) % PIXEL_ANIM_CONFIG.runFrames;
    const upper = rf < 3 ? spec.upperRunA : spec.upperRunB;
    return [...upper, ...buildLegs(LEGS_RUN_FRAMES[rf], spec.legKey, spec.bootKey)];
  }

  // 4-frame idle @ 10 fps (exact parity with hero.png; subtle blink on frame 2, constant 16-row height!)
  const idf =
    Math.floor((timeMs / 1000) * PIXEL_ANIM_CONFIG.idleFps) % PIXEL_ANIM_CONFIG.idleFrames;
  const idleLegs = [LEGS_IDLE_0, LEGS_IDLE_1, LEGS_IDLE_2, LEGS_IDLE_3][idf];
  const upper = idf === 2 ? spec.upperBlink : spec.upperNormal;
  return [...upper, ...buildLegs(idleLegs, spec.legKey, spec.bootKey)];
}

/**
 * Renders any of the 10 grounded pixel-art skins with:
 * - Exact `hero.png` animation cadence (4-frame idle @ 10fps, 6-frame run @ 30fps, 3-frame jump @ 3fps)
 * - Constant 16-row height (zero vertical squashing when running!)
 * - Crisp asymmetric 3/4-profile that flips cleanly left <-> right via `facingDir`
 * - Feet planted flush on the platform (`y + 32` upright, `y - 32` inverted), zero floating bubble
 */
export function drawPixelArtHero(
  g: Phaser.GameObjects.Graphics,
  skin: PixelHeroSkinId,
  x: number,
  y: number,
  timeMs: number,
  state: HeroVisualState,
  isGhost = false
): void {
  const spec = PIXEL_SKIN_SPECS[skin];
  const a = state.alpha;
  const dir = state.facingDir;

  const sprite = selectCompositeFrame(spec, timeMs, state);
  const rows = sprite.length; // Always 16
  const cols = sprite[0].length; // Always 14

  const pxW = 3.5 * state.scaleX;
  const pxH = 3.5 * state.scaleY;
  const footEdgeOffset = 32 * state.scaleY;
  const originX = x - (cols * pxW) / 2;
  // Lock bottom row (row 15) flush with the platform surface (y + 32)
  const originY = state.upsideDown === 1 ? y + footEdgeOffset - rows * pxH : y - footEdgeOffset;

  const accentColor = state.isSuperQuanta ? 0xfbbf24 : state.envelopeColor;

  for (let r = 0; r < rows; r++) {
    const rowStr = sprite[r];
    const drawRow = state.upsideDown === -1 ? rows - 1 - r : r;
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c];
      if (ch === '.') continue;
      // Flip horizontally when facing left (dir === -1)
      const drawCol = dir === -1 ? cols - 1 - c : c;

      let color: number;
      if (isGhost) {
        color = ch === 'O' ? state.envelopeColor : ch === 'A' ? 0xf8fafc : state.accentColor;
      } else if (ch === 'A') {
        color = accentColor;
      } else {
        color = spec.palette[ch] ?? state.envelopeColor;
      }

      const cellAlpha = isGhost ? (ch === 'O' ? 0.7 * a : 0.44 * a) : a;
      g.fillStyle(color, cellAlpha);
      if (typeof g.fillRect === 'function') {
        g.fillRect(originX + drawCol * pxW, originY + drawRow * pxH, pxW + 0.3, pxH + 0.3);
      } else {
        g.fillCircle(originX + (drawCol + 0.5) * pxW, originY + (drawRow + 0.5) * pxH, pxW * 0.55);
      }
    }
  }

  // Dive plasma chevron below boots when actively diving
  if (state.isDiving && !isGhost) {
    const tipY = y + 36 * state.scaleY * state.upsideDown;
    const baseY = y + 28 * state.scaleY * state.upsideDown;
    g.fillStyle(state.accentColor, 0.92 * a);
    g.fillTriangle?.(x - 9 * state.scaleX, baseY, x, tipY, x + 9 * state.scaleX, baseY);
  }
}
