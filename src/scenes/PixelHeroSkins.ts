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

interface PixelSkinSpec {
  id: PixelHeroSkinId;
  idleA: readonly string[];
  idleB: readonly string[];
  runA: readonly string[];
  runB: readonly string[];
  jump: readonly string[];
  /** Palette mapping single-char keys to 0xRRGGBB; 'A' uses dynamic phase/accent color if omitted */
  palette: Record<string, number>;
}

// ============================================================================
// 1. PICO — Evolved PICO-8 Lab Scientist (direct spiritual successor to hero.png)
// ============================================================================
const PICO_IDLE_A = [
  '....OOOOOO....',
  '...OHHHHHHO...',
  '..OSSSSSSSSO..',
  '..OSSESSEESO..',
  '..OSSSSSSSSO..',
  '...OOOOOOOO...',
  '..OOWWWWWWO...',
  '.OWWWAWAAWWO..',
  '.OSWWAAAAWWSO.',
  '..OOWWWWWWO...',
  '...OODDDDOO...',
  '...OOD..DOO...',
  '...OOD..DOO...',
  '...OOB..BOO...',
  '..OOOB..BOOO..',
  '..OOOO..OOOO..'
];
const PICO_IDLE_B = [
  '..............',
  '....OOOOOO....',
  '...OHHHHHHO...',
  '..OSSSSSSSSO..',
  '..OSSSSSSSSO..',
  '...OOOOOOOO...',
  '..OOWWWWWWO...',
  '.OWWWAWAAWWO..',
  '.OSWWAAAAWWSO.',
  '..OOWWWWWWO...',
  '...OODDDDOO...',
  '...OOD..DOO...',
  '...OOD..DOO...',
  '...OOB..BOO...',
  '..OOOB..BOOO..',
  '..OOOO..OOOO..'
];
const PICO_RUN_A = [
  '....OOOOOO....',
  '...OHHHHHHO...',
  '..OSSSSSSSSO..',
  '..OSSESSEESO..',
  '..OSSSSSSSSO..',
  '...OOOOOOOO...',
  '..OOWWWWWWO...',
  '.OSWWAAAAWWO..',
  '..OOWWWWWWSO..',
  '...OODDDDOO...',
  '..OOD....DOO..',
  '.OOB......BOO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............'
];
const PICO_RUN_B = [
  '..............',
  '....OOOOOO....',
  '...OHHHHHHO...',
  '..OSSSSSSSSO..',
  '..OSSESSEESO..',
  '..OSSSSSSSSO..',
  '...OOOOOOOO...',
  '..OOWWWWWWO...',
  '.OWWWAAAAWWSO.',
  '..OOWWWWWWO...',
  '...OODDDDOO...',
  '....OODDOO....',
  '...OOB..BOO...',
  '...OOO..OOO...',
  '..............',
  '..............'
];
const PICO_JUMP = [
  '....OOOOOO....',
  '...OHHHHHHO...',
  '..OSSSSSSSSO..',
  '..OSSESSEESO..',
  '.OOSSSSSSSSOO.',
  '.OSOOOOOOOOSSO',
  '..OOWWWWWWO...',
  '...OWAAAAWO...',
  '...OOWWWWOO...',
  '...OODDDDOO...',
  '..OOD....DOO..',
  '..OOB....BOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 2. GAMEBOY — Classic DMG 4-Shade LCD Pixel Hero (feet planted, zero bubble)
// ============================================================================
const GB_IDLE_A = [
  '....OOOOOO....',
  '...OLLLLLLO...',
  '..OLAAAAAALO..',
  '..OLLELLELLO..',
  '..OLLLLLLLLO..',
  '...OOOOOOOO...',
  '..OOMMMMMMOO..',
  '.OMOMDDDDMOMO.',
  '.ODOMDAADMODO.',
  '..OOMMMMMMOO..',
  '...OODDDDOO...',
  '...OOD..DOO...',
  '...OOM..MOO...',
  '...OOD..DOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const GB_IDLE_B = [
  '..............',
  '....OOOOOO....',
  '...OLLLLLLO...',
  '..OLAAAAAALO..',
  '..OLLELLELLO..',
  '..OLLLLLLLLO..',
  '...OOOOOOOO...',
  '..OOMMMMMMOO..',
  '.OMOMDDDDMOMO.',
  '.ODOMDAADMODO.',
  '..OOMMMMMMOO..',
  '...OODDDDOO...',
  '...OOM..MOO...',
  '...OOD..DOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const GB_RUN_A = [
  '....OOOOOO....',
  '...OLLLLLLO...',
  '..OLAAAAAALO..',
  '..OLLELLELLO..',
  '..OLLLLLLLLO..',
  '...OOOOOOOO...',
  '..OOMMMMMMOO..',
  '.OMOMDAADMOO..',
  '..OOMMMMMMOMO.',
  '...OODDDDOO...',
  '..OOM....MOO..',
  '.OOD......DOO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............'
];
const GB_RUN_B = [
  '..............',
  '....OOOOOO....',
  '...OLLLLLLO...',
  '..OLAAAAAALO..',
  '..OLLELLELLO..',
  '..OLLLLLLLLO..',
  '...OOOOOOOO...',
  '..OOMMMMMMOO..',
  '.ODOMDAADMOMO.',
  '..OOMMMMMMOO..',
  '...OODDDDOO...',
  '....OOMMOO....',
  '...OOD..DOO...',
  '...OOO..OOO...',
  '..............',
  '..............'
];
const GB_JUMP = [
  '....OOOOOO....',
  '...OLLLLLLO...',
  '..OLAAAAAALO..',
  '..OLLELLELLO..',
  '.OOLLLLLLLLOO.',
  '.OMOOOOOOOOMO.',
  '..OOMMMMMMOO..',
  '...OMDAADMO...',
  '...OOMMMMOO...',
  '...OODDDDOO...',
  '..OOM....MOO..',
  '..OOD....DOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 3. MEGABIT — 8-Bit NES Blue Bomber / Jumper
// ============================================================================
const MEGA_IDLE_A = [
  '....OOOOOO....',
  '...OBBAABBO...',
  '..OBBBBBBBBO..',
  '..OBSSSSSSBO..',
  '..OBSESSEBBO..',
  '..OBSSSSSSBO..',
  '...OOOOOOOO...',
  '..OOBBAABBOO..',
  '.OBOBBBBBBOAO.',
  '.OAOBBBBBBOAO.',
  '..OOBBBBBBOO..',
  '...OOB..BOO...',
  '...OOB..BOO...',
  '..OOBA..ABOO..',
  '..OOBB..BBOO..',
  '..OOOO..OOOO..'
];
const MEGA_IDLE_B = [
  '..............',
  '....OOOOOO....',
  '...OBBAABBO...',
  '..OBBBBBBBBO..',
  '..OBSSSSSSBO..',
  '..OBSESSEBBO..',
  '..OBSSSSSSBO..',
  '...OOOOOOOO...',
  '..OOBBAABBOO..',
  '.OBOBBBBBBOAO.',
  '..OOBBBBBBOO..',
  '...OOB..BOO...',
  '...OOB..BOO...',
  '..OOBA..ABOO..',
  '..OOBB..BBOO..',
  '..OOOO..OOOO..'
];
const MEGA_RUN_A = [
  '....OOOOOO....',
  '...OBBAABBO...',
  '..OBBBBBBBBO..',
  '..OBSESSEBBO..',
  '..OBSSSSSSBO..',
  '...OOOOOOOO...',
  '..OOBBAABBOO..',
  '.OBOBBBBBBOAO.',
  '..OOBBBBBBOO..',
  '..OOB....BOO..',
  '.OOBA....ABOO.',
  '.OOOO....OOOO.',
  '..............',
  '..............',
  '..............',
  '..............'
];
const MEGA_RUN_B = [
  '..............',
  '....OOOOOO....',
  '...OBBAABBO...',
  '..OBBBBBBBBO..',
  '..OBSESSEBBO..',
  '..OBSSSSSSBO..',
  '...OOOOOOOO...',
  '..OOBBAABBOO..',
  '.OAOBBBBBBOAO.',
  '..OOBBBBBBOO..',
  '....OOBBOO....',
  '...OOBAABOO...',
  '...OOB..BOO...',
  '...OOO..OOO...',
  '..............',
  '..............'
];
const MEGA_JUMP = [
  '....OOOOOO....',
  '...OBBAABBO...',
  '..OBBBBBBBBO..',
  '..OBSESSEBBO..',
  '.OOBSSSSSSBOO.',
  '.OAOOOOOOOOAO.',
  '..OOBBAABBOO..',
  '...OBBBBBBO...',
  '..OOB....BOO..',
  '..OOBA..ABOO..',
  '..OOOO..OOOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 4. ASTRONAUT — Retro Cosmonaut / Quantum Space Diver
// ============================================================================
const ASTRO_IDLE_A = [
  '...OOOOOOOO...',
  '..OWWWWWWWWO..',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '..OWWWWWWWWO..',
  '...OOOOOOOO...',
  '.ODOWWAAWWOWO.',
  '.ODOWWWWWWOWO.',
  '.ODOWDDDDWOWO.',
  '..OOWWWWWWO...',
  '...OOW..WOO...',
  '...OOW..WOO...',
  '..OODD..DDOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..'
];
const ASTRO_IDLE_B = [
  '..............',
  '...OOOOOOOO...',
  '..OWWWWWWWWO..',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '..OWWWWWWWWO..',
  '...OOOOOOOO...',
  '.ODOWWAAWWOWO.',
  '.ODOWWWWWWOWO.',
  '.ODOWDDDDWOWO.',
  '..OOWWWWWWO...',
  '...OOW..WOO...',
  '...OOW..WOO...',
  '..OODD..DDOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..'
];
const ASTRO_RUN_A = [
  '...OOOOOOOO...',
  '..OWWWWWWWWO..',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '..OWWWWWWWWO..',
  '...OOOOOOOO...',
  '.ODOWWAAWWOWO.',
  '.ODOWWWWWWO...',
  '..OOWDDDDWO...',
  '..OOW....WOO..',
  '.OODD....DDOO.',
  '.OOOO....OOOO.',
  '..............',
  '..............',
  '..............',
  '..............'
];
const ASTRO_RUN_B = [
  '..............',
  '...OOOOOOOO...',
  '..OWWWWWWWWO..',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '..OWWWWWWWWO..',
  '...OOOOOOOO...',
  '.ODOWWAAWWOWO.',
  '.ODOWWWWWWOWO.',
  '..OOWDDDDWO...',
  '....OOWWOO....',
  '...OOD..DOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............'
];
const ASTRO_JUMP = [
  '...OOOOOOOO...',
  '..OWWWWWWWWO..',
  '.OWOGGGGGGOYO.',
  '.OWOGGGGGGOYO.',
  '..OWWWWWWWWO..',
  '.OOAOOOOOOAOO.',
  '.ODOWWWWWWOWO.',
  '..OOWDDDDWO...',
  '..OOW....WOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 5. CYBERCAT — Schrödinger's 8-Bit Pixel Cat
// ============================================================================
const CAT_IDLE_A = [
  '..OO......OO..',
  '.OFOO....OOFO.',
  '.OFPFOOOOFPO..',
  '.OFFFFFFFFFFO.',
  '.OFFEAFFEAFPO.',
  '.OFFFWWWWFFFO.',
  '..OFFFFFFFFO..',
  '...OOAAAAOO...',
  '.OO.OFFFFO.OO.',
  'OFO.OFFFFO....',
  '.OO.OFFFFO....',
  '....OF..FO....',
  '....OF..FO....',
  '...OOW..WOO...',
  '...OOW..WOO...',
  '...OOO..OOO...'
];
const CAT_IDLE_B = [
  '..............',
  '..OO......OO..',
  '.OFOO....OOFO.',
  '.OFPFOOOOFPO..',
  '.OFFFFFFFFFFO.',
  '.OFFEAFFEAFPO.',
  '.OFFFWWWWFFFO.',
  '..OFFFFFFFFO..',
  '...OOAAAAOO...',
  '.OO.OFFFFO....',
  'OFO.OFFFFO....',
  '....OF..FO....',
  '....OF..FO....',
  '...OOW..WOO...',
  '...OOW..WOO...',
  '...OOO..OOO...'
];
const CAT_RUN_A = [
  '..OO......OO..',
  '.OFOO....OOFO.',
  '.OFPFOOOOFPO..',
  '.OFFEAFFEAFPO.',
  '.OFFFWWWWFFFO.',
  '..OFFFFFFFFO..',
  '...OOAAAAOO...',
  'OO..OFFFFO....',
  '.OO.OFFFFO....',
  '...OF....FO...',
  '..OOW....WOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............',
  '..............'
];
const CAT_RUN_B = [
  '..............',
  '..OO......OO..',
  '.OFOO....OOFO.',
  '.OFPFOOOOFPO..',
  '.OFFEAFFEAFPO.',
  '.OFFFWWWWFFFO.',
  '..OFFFFFFFFO..',
  '...OOAAAAOO...',
  '.OO.OFFFFO....',
  '....OFFFFO....',
  '....OOFFOO....',
  '...OOW..WOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............'
];
const CAT_JUMP = [
  '..OO......OO..',
  '.OFOO....OOFO.',
  '.OFPFOOOOFPO..',
  '.OFFEAFFEAFPO.',
  '.OFFFWWWWFFFO.',
  '..OFFFFFFFFO..',
  '..OOOAAAAOOO..',
  '.OFOOFFFFOOFO.',
  '....OFFFFO....',
  '...OF....FO...',
  '...OOW..WOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 6. HAZMAT — Reactor Hazmat Suit Tech
// ============================================================================
const HAZ_IDLE_A = [
  '...OOOOOOOO...',
  '..OYYYYYYYYO..',
  '.OYOODDDDOOYO.',
  '.OYODADDADOYO.',
  '.OYOODDDDOOYO.',
  '..OYYYYYYYYO..',
  '...OOOOOOOO...',
  '..OYYDDDDYYO..',
  '.OYOYAAAAYOYO.',
  '.ODOYYYYYYODO.',
  '..OOYYYYYYOO..',
  '...OOY..YOO...',
  '...OOY..YOO...',
  '..OODD..DDOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..'
];
const HAZ_IDLE_B = [
  '..............',
  '...OOOOOOOO...',
  '..OYYYYYYYYO..',
  '.OYOODDDDOOYO.',
  '.OYODADDADOYO.',
  '.OYOODDDDOOYO.',
  '..OYYYYYYYYO..',
  '...OOOOOOOO...',
  '..OYYDDDDYYO..',
  '.OYOYAAAAYOYO.',
  '..OOYYYYYYOO..',
  '...OOY..YOO...',
  '...OOY..YOO...',
  '..OODD..DDOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..'
];
const HAZ_RUN_A = [
  '...OOOOOOOO...',
  '..OYYYYYYYYO..',
  '.OYODADDADOYO.',
  '..OYYYYYYYYO..',
  '...OOOOOOOO...',
  '..OYYDDDDYYO..',
  '.OYOYAAAAYOYO.',
  '..OOYYYYYYOO..',
  '..OOY....YOO..',
  '.OODD....DDOO.',
  '.OOOO....OOOO.',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];
const HAZ_RUN_B = [
  '..............',
  '...OOOOOOOO...',
  '..OYYYYYYYYO..',
  '.OYODADDADOYO.',
  '..OYYYYYYYYO..',
  '...OOOOOOOO...',
  '..OYYDDDDYYO..',
  '.ODOYAAAAYODO.',
  '..OOYYYYYYOO..',
  '....OOYYOO....',
  '...OOD..DOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............',
  '..............'
];
const HAZ_JUMP = [
  '...OOOOOOOO...',
  '..OYYYYYYYYO..',
  '.OYODADDADOYO.',
  '..OYYYYYYYYO..',
  '.OOYOOOOOOYOO.',
  '.OYOYAAAAYOYO.',
  '..OOYYYYYYOO..',
  '..OOY....YOO..',
  '..OODD..DDOO..',
  '..OOOO..OOOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 7. SAMURAI — Neon Cyber-Ronin with Kasa Hat
// ============================================================================
const SAM_IDLE_A = [
  '.....OOOO.....',
  '...OOHHHHOO...',
  '.OOHHHHHHHHOO.',
  'OOHHHHHHHHHHOO',
  '.OOODDDDDDOOO.',
  '..OODADDADOO..',
  '...OOOOOOOO...',
  '..OODDAADDOO..',
  '.ORODDDDDDORO.',
  '.ORODDRRDDRRO.',
  '..OODDDDDDOO..',
  '...OOD..DOO...',
  '...OOD..DOO...',
  '...OOR..ROO...',
  '..OOOR..ROOO..',
  '..OOOO..OOOO..'
];
const SAM_IDLE_B = [
  '..............',
  '.....OOOO.....',
  '...OOHHHHOO...',
  '.OOHHHHHHHHOO.',
  'OOHHHHHHHHHHOO',
  '.OOODDDDDDOOO.',
  '..OODADDADOO..',
  '...OOOOOOOO...',
  '..OODDAADDOO..',
  '.ORODDDDDDORO.',
  '..OODDDDDDOO..',
  '...OOD..DOO...',
  '...OOD..DOO...',
  '...OOR..ROO...',
  '..OOOR..ROOO..',
  '..OOOO..OOOO..'
];
const SAM_RUN_A = [
  '.....OOOO.....',
  '...OOHHHHOO...',
  '.OOHHHHHHHHOO.',
  'OOHHHHHHHHHHOO',
  '..OODADDADOO..',
  '...OOOOOOOO...',
  '..OODDAADDOO..',
  '.ORODDDDDDO...',
  '..OODDDDDDORO.',
  '..OOD....DOO..',
  '.OOR......ROO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............',
  '..............'
];
const SAM_RUN_B = [
  '..............',
  '.....OOOO.....',
  '...OOHHHHOO...',
  '.OOHHHHHHHHOO.',
  'OOHHHHHHHHHHOO',
  '..OODADDADOO..',
  '...OOOOOOOO...',
  '..OODDAADDOO..',
  '.ORODDDDDDORO.',
  '..OODDDDDDOO..',
  '....OODDOO....',
  '...OOR..ROO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............'
];
const SAM_JUMP = [
  '.....OOOO.....',
  '...OOHHHHOO...',
  '.OOHHHHHHHHOO.',
  'OOHHHHHHHHHHOO',
  '..OODADDADOO..',
  '..OODDAADDOO..',
  '.ORODDDDDDORO.',
  '..OODDDDDDOO..',
  '..OOD....DOO..',
  '..OOR....ROO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 8. BOT — Retro CRT Arcade Bot
// ============================================================================
const BOT_IDLE_A = [
  '......OO......',
  '.....OAAO.....',
  '..OOOOOOOOOO..',
  '.OMMMMMMMMMMO.',
  '.OMODDDDDDOMO.',
  '.OMODADDADOMO.',
  '.OMODDDDDDOMO.',
  '.OMMMMMMMMMMO.',
  '..OOOOOOOOOO..',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMOMO.',
  '..OOMMMMMMOO..',
  '...OOD..DOO...',
  '...OOM..MOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const BOT_IDLE_B = [
  '..............',
  '......OO......',
  '.....OAAO.....',
  '..OOOOOOOOOO..',
  '.OMMMMMMMMMMO.',
  '.OMODDDDDDOMO.',
  '.OMODAAADOMO..',
  '.OMODDDDDDOMO.',
  '.OMMMMMMMMMMO.',
  '..OOOOOOOOOO..',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMOMO.',
  '...OOD..DOO...',
  '...OOM..MOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const BOT_RUN_A = [
  '......OO......',
  '.....OAAO.....',
  '..OOOOOOOOOO..',
  '.OMODADDADOMO.',
  '.OMODDDDDDOMO.',
  '..OOOOOOOOOO..',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMO...',
  '..OOMMMMMMOMO.',
  '..OOD....DOO..',
  '.OOM......MOO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............',
  '..............'
];
const BOT_RUN_B = [
  '..............',
  '......OO......',
  '.....OAAO.....',
  '..OOOOOOOOOO..',
  '.OMODADDADOMO.',
  '.OMODDDDDDOMO.',
  '..OOOOOOOOOO..',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMOMO.',
  '....OODDOO....',
  '...OOM..MOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............',
  '..............'
];
const BOT_JUMP = [
  '......OO......',
  '.....OAAO.....',
  '..OOOOOOOOOO..',
  '.OMODADDADOMO.',
  '.OMODDDDDDOMO.',
  '..OOOOOOOOOO..',
  '.OMOMMAAMMOMO.',
  '..OOMMMMMMOO..',
  '..OOD....DOO..',
  '..OOM....MOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 9. WIZARD — Classic 8-Bit Quantum Alchemist (FF1 Black Mage vibe)
// ============================================================================
const WIZ_IDLE_A = [
  '.....OOOO.....',
  '....OPPPPO....',
  '...OPPPPPPO...',
  '..OOPAAAAOO...',
  '.OOPPPPPPPPOO.',
  '..OODDDDDDOO..',
  '..OODYDDYDOO..',
  '..OODDDDDDOO..',
  '...OOOOOOOO...',
  '..OOPPPPPPOO..',
  '.OPOPPAAPPOPO.',
  '.OPOPPPPPPOPO.',
  '..OOPPPPPPOO..',
  '...OOD..DOO...',
  '..OOOB..BOOO..',
  '..OOOO..OOOO..'
];
const WIZ_IDLE_B = [
  '..............',
  '.....OOOO.....',
  '....OPPPPO....',
  '...OPPPPPPO...',
  '..OOPAAAAOO...',
  '.OOPPPPPPPPOO.',
  '..OODDDDDDOO..',
  '..OODYDDYDOO..',
  '...OOOOOOOO...',
  '..OOPPPPPPOO..',
  '.OPOPPAAPPOPO.',
  '..OOPPPPPPOO..',
  '...OOD..DOO...',
  '...OOD..DOO...',
  '..OOOB..BOOO..',
  '..OOOO..OOOO..'
];
const WIZ_RUN_A = [
  '.....OOOO.....',
  '...OPPPPPPO...',
  '.OOPPPPPPPPOO.',
  '..OODYDDYDOO..',
  '...OOOOOOOO...',
  '..OOPPPPPPOO..',
  '.OPOPPAAPPO...',
  '..OOPPPPPPOPO.',
  '..OOD....DOO..',
  '.OOB......BOO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];
const WIZ_RUN_B = [
  '..............',
  '.....OOOO.....',
  '...OPPPPPPO...',
  '.OOPPPPPPPPOO.',
  '..OODYDDYDOO..',
  '...OOOOOOOO...',
  '..OOPPPPPPOO..',
  '.OPOPPAAPPOPO.',
  '....OODDOO....',
  '...OOB..BOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];
const WIZ_JUMP = [
  '.....OOOO.....',
  '...OPPPPPPO...',
  '.OOPPPPPPPPOO.',
  '..OODYDDYDOO..',
  '...OOOOOOOO...',
  '.OPOPPPPPPOPO.',
  '..OOPPAAPPOO..',
  '..OOD....DOO..',
  '..OOB....BOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

// ============================================================================
// 10. NINJA — 8-Bit Shadow Shinobi
// ============================================================================
const NIN_IDLE_A = [
  '....OOOOOO....',
  '...ONNNNNNO...',
  '.OOAAAAAAAOO..',
  'OAAONNNNNNO...',
  '..ONSSSSSSNO..',
  '..ONSESSESNO..',
  '...OOOOOOOO...',
  '..OONNAANNOO..',
  '.ONONNNNNNONO.',
  '.ONONNDDNNONO.',
  '..OONNNNNNOO..',
  '...OON..NOO...',
  '...OON..NOO...',
  '...OOD..DOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const NIN_IDLE_B = [
  '..............',
  '....OOOOOO....',
  '...ONNNNNNO...',
  '..OAAAAAAAOO..',
  '.OAONNNNNNO...',
  '..ONSSSSSSNO..',
  '..ONSESSESNO..',
  '...OOOOOOOO...',
  '..OONNAANNOO..',
  '.ONONNNNNNONO.',
  '..OONNNNNNOO..',
  '...OON..NOO...',
  '...OON..NOO...',
  '...OOD..DOO...',
  '..OOOD..DOOO..',
  '..OOOO..OOOO..'
];
const NIN_RUN_A = [
  '....OOOOOO....',
  '...ONNNNNNO...',
  'OOOAAAAAAAOO..',
  '..ONSESSESNO..',
  '...OOOOOOOO...',
  '..OONNAANNOO..',
  '.ONONNNNNNO...',
  '..OONNNNNNONO.',
  '..OON....NOO..',
  '.OOD......DOO.',
  '.OOO......OOO.',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];
const NIN_RUN_B = [
  '..............',
  '....OOOOOO....',
  '...ONNNNNNO...',
  '.OOAAAAAAAOO..',
  '..ONSESSESNO..',
  '...OOOOOOOO...',
  '..OONNAANNOO..',
  '.ONONNNNNNONO.',
  '....OONNOO....',
  '...OOD..DOO...',
  '...OOO..OOO...',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];
const NIN_JUMP = [
  '....OOOOOO....',
  '...ONNNNNNO...',
  'OOOAAAAAAAOO..',
  '..ONSESSESNO..',
  '...OOOOOOOO...',
  '.ONONNAANNONO.',
  '..OONNNNNNOO..',
  '..OON....NOO..',
  '..OOD....DOO..',
  '..OOO....OOO..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............'
];

export const PIXEL_SKIN_SPECS: Record<PixelHeroSkinId, PixelSkinSpec> = {
  pico: {
    id: 'pico',
    idleA: PICO_IDLE_A,
    idleB: PICO_IDLE_B,
    runA: PICO_RUN_A,
    runB: PICO_RUN_B,
    jump: PICO_JUMP,
    palette: {
      O: 0x050814,
      H: 0x7c2d12, // warm brown hair
      S: 0xfdba74, // peach face
      E: 0x050814, // crisp eyes
      W: 0xf8fafc, // white lab coat
      D: 0x334155, // dark slate pants
      B: 0xf59e0b // sturdy amber boots
    }
  },
  gameboy: {
    id: 'gameboy',
    idleA: GB_IDLE_A,
    idleB: GB_IDLE_B,
    runA: GB_RUN_A,
    runB: GB_RUN_B,
    jump: GB_JUMP,
    palette: {
      O: 0x0f380f, // DMG darkest
      D: 0x306230, // DMG dark
      M: 0x8bac0f, // DMG mid
      L: 0x9bbc0f, // DMG light
      E: 0x0f380f
    }
  },
  megabit: {
    id: 'megabit',
    idleA: MEGA_IDLE_A,
    idleB: MEGA_IDLE_B,
    runA: MEGA_RUN_A,
    runB: MEGA_RUN_B,
    jump: MEGA_JUMP,
    palette: {
      O: 0x050814,
      B: 0x2563eb, // NES royal blue armor
      S: 0xfed7aa, // face
      E: 0x050814
    }
  },
  astronaut: {
    id: 'astronaut',
    idleA: ASTRO_IDLE_A,
    idleB: ASTRO_IDLE_B,
    runA: ASTRO_RUN_A,
    runB: ASTRO_RUN_B,
    jump: ASTRO_JUMP,
    palette: {
      O: 0x050814,
      W: 0xe2e8f0, // space suit white
      G: 0xfbbf24, // golden visor
      Y: 0x94a3b8, // rim
      D: 0x475569 // backpack & moon boots
    }
  },
  cybercat: {
    id: 'cybercat',
    idleA: CAT_IDLE_A,
    idleB: CAT_IDLE_B,
    runA: CAT_RUN_A,
    runB: CAT_RUN_B,
    jump: CAT_JUMP,
    palette: {
      O: 0x050814,
      F: 0x334155, // sleek slate fur
      P: 0xf472b6, // pink inner ears
      W: 0xf8fafc, // muzzle & paws
      E: 0x050814
    }
  },
  hazmat: {
    id: 'hazmat',
    idleA: HAZ_IDLE_A,
    idleB: HAZ_IDLE_B,
    runA: HAZ_RUN_A,
    runB: HAZ_RUN_B,
    jump: HAZ_JUMP,
    palette: {
      O: 0x050814,
      Y: 0xfacc15, // bright hazard yellow
      D: 0x1e293b // respirator & heavy boots
    }
  },
  samurai: {
    id: 'samurai',
    idleA: SAM_IDLE_A,
    idleB: SAM_IDLE_B,
    runA: SAM_RUN_A,
    runB: SAM_RUN_B,
    jump: SAM_JUMP,
    palette: {
      O: 0x050814,
      H: 0xd97706, // cyber kasa hat
      D: 0x1e293b, // dark ronin armor
      R: 0xe11d48 // crimson trim & sandals
    }
  },
  bot: {
    id: 'bot',
    idleA: BOT_IDLE_A,
    idleB: BOT_IDLE_B,
    runA: BOT_RUN_A,
    runB: BOT_RUN_B,
    jump: BOT_JUMP,
    palette: {
      O: 0x050814,
      M: 0x94a3b8, // brushed metal chassis
      D: 0x0f172a // CRT screen glass
    }
  },
  wizard: {
    id: 'wizard',
    idleA: WIZ_IDLE_A,
    idleB: WIZ_IDLE_B,
    runA: WIZ_RUN_A,
    runB: WIZ_RUN_B,
    jump: WIZ_JUMP,
    palette: {
      O: 0x050814,
      P: 0x7c3aed, // arcane violet hat & robe
      D: 0x090d16, // shadowed face
      Y: 0xfef08a, // glowing mage eyes
      B: 0x92400e // leather boots
    }
  },
  ninja: {
    id: 'ninja',
    idleA: NIN_IDLE_A,
    idleB: NIN_IDLE_B,
    runA: NIN_RUN_A,
    runB: NIN_RUN_B,
    jump: NIN_JUMP,
    palette: {
      O: 0x050814,
      N: 0x1e293b, // midnight shinobi suit
      S: 0xfdba74, // eyes strip
      E: 0x050814,
      D: 0x475569 // shinobi wraps
    }
  }
};

/**
 * Renders any of the 10 grounded pixel-art skins with feet planted flush on the platform
 * (`y + 32` when upright, `y - 32` when gravity-inverted), zero floating bubble halo,
 * and authentic 2-frame old-school standby / run animations.
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

  // Snappy low-frame-rate old-school animation (2-frame idle every 560 ms, 2-frame run every 120 ms)
  const sprite =
    state.isAirborne || state.isDiving
      ? spec.jump
      : state.isRunning
        ? Math.floor(timeMs / 120) % 2 === 0
          ? spec.runA
          : spec.runB
        : Math.floor(timeMs / 560) % 2 === 0
          ? spec.idleA
          : spec.idleB;

  const rows = sprite.length;
  const cols = sprite[0].length;
  // Find the lowest occupied row so feet are ALWAYS planted flush on the platform surface (y + 32)
  let lastOccupiedRow = rows - 1;
  for (let r = rows - 1; r >= 0; r--) {
    if (sprite[r].indexOf('O') !== -1 || /[^.]/.test(sprite[r])) {
      lastOccupiedRow = r;
      break;
    }
  }

  const pxW = 3.5 * state.scaleX;
  const pxH = 3.5 * state.scaleY;
  const footEdgeOffset = 32 * state.scaleY;
  const originX = x - (cols * pxW) / 2;
  const originY =
    state.upsideDown === 1
      ? y + footEdgeOffset - (lastOccupiedRow + 1) * pxH
      : y - footEdgeOffset - (rows - 1 - lastOccupiedRow) * pxH;

  // Dynamic accent color ('A') reacts to phase, entanglement, or Super-Quanta
  const accentColor = state.isSuperQuanta ? 0xfbbf24 : state.envelopeColor;

  for (let r = 0; r < rows; r++) {
    const rowStr = sprite[r];
    const drawRow = state.upsideDown === -1 ? rows - 1 - r : r;
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c];
      if (ch === '.') continue;
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
