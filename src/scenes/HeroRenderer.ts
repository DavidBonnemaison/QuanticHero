import type Phaser from 'phaser';
import type { HeroSkin, PlatformPhase } from '../types';
import type Hero from './Hero';
import { drawPixelArtHero, isPixelHeroSkin } from './PixelHeroSkins';

export interface HeroRenderOptions {
  skin: HeroSkin;
  reducedEffects: boolean;
  activePhase?: PlatformPhase;
  hasPhasePlatforms?: boolean;
  isPauliActive?: boolean;
}

export interface HeroVisualState {
  coreColor: number;
  envelopeColor: number;
  accentColor: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
  leanRad: number;
  facingDir: 1 | -1;
  upsideDown: 1 | -1;
  isDiving: boolean;
  isRunning: boolean;
  isAirborne: boolean;
  speedRatio: number;
  isSuperQuanta: boolean;
  hasTunnelCharge: boolean;
  hasPauliAura: boolean;
  glowLayers: number;
  waveSegments: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Pure state-to-visuals mapper for procedural hero skins (`gameboy`, `neo`, `quantum`).
 * Expresses all gameplay states visually without text.
 */
export function computeHeroVisualState(
  hero: Pick<
    Hero,
    | 'isFocused'
    | 'isEntangled'
    | 'isBeta'
    | 'fusionStack'
    | 'tunnelCharges'
    | 'pauliGraceUntil'
    | 'upsideDown'
    | 'isDiving'
    | 'flipX'
    | 'scaleX'
    | 'scaleY'
    | 'body'
  >,
  timeMs: number,
  options: Omit<HeroRenderOptions, 'skin'>
): HeroVisualState {
  const vx = hero.body?.velocity?.x ?? 0;
  const vy = hero.body?.velocity?.y ?? 0;
  const upsideDown: 1 | -1 = hero.upsideDown === -1 ? -1 : 1;
  const facingDir: 1 | -1 = hero.flipX ? -1 : 1;
  const isSuperQuanta = (hero.fusionStack ?? 1) >= 2;
  const hasTunnelCharge = (hero.tunnelCharges ?? 0) > 0;
  const hasPauliAura = Boolean(options.isPauliActive) || (hero.pauliGraceUntil ?? 0) > timeMs;
  const speedRatio = clamp(Math.abs(vx) / 280, 0, 1.35);
  const isRunning = Math.abs(vx) > 22;
  const touchingDown = Boolean(hero.body?.touching?.down || hero.body?.blocked?.down);
  const touchingUp = Boolean(hero.body?.touching?.up || hero.body?.blocked?.up);
  const isGrounded = upsideDown === 1 ? touchingDown : touchingUp;
  const isAirborne = !isGrounded && Math.abs(vy) > 18;

  // Base spectral palette expressing entanglement, active phase, and focus
  let coreColor = 0xe0f2fe;
  let envelopeColor = 0x00e5ff;
  let accentColor = 0x38bdf8;
  let alpha = 0.98;

  if (hero.isEntangled) {
    if (hero.isBeta) {
      envelopeColor = 0xec4899;
      accentColor = 0xf472b6;
      coreColor = 0xfce7f3;
    } else {
      envelopeColor = 0x00e5ff;
      accentColor = 0x7dd3fc;
      coreColor = 0xe0f2fe;
    }
  } else if (options.hasPhasePlatforms && options.activePhase) {
    if (options.activePhase === 'magenta') {
      envelopeColor = 0xff00e5;
      accentColor = 0xf472b6;
      coreColor = 0xfdf4ff;
    } else {
      envelopeColor = 0x00e5ff;
      accentColor = 0x67e8f9;
      coreColor = 0xe0f2fe;
    }
  }

  if (!hero.isFocused && !hero.isEntangled) {
    envelopeColor = 0x38bdf8;
    accentColor = 0x94a3b8;
    coreColor = 0xcbd5e1;
    alpha = 0.56;
  }

  if (isSuperQuanta) {
    accentColor = 0xfbbf24;
    coreColor = 0xfef3c7;
  }

  if (hasTunnelCharge) {
    alpha *= 0.68 + 0.22 * Math.sin(timeMs * 0.01);
  }

  const rawScaleX = Math.abs(hero.scaleX || 1);
  const rawScaleY = Math.abs(hero.scaleY || 1);
  const diveStretchX = hero.isDiving ? 0.8 : 1;
  const diveStretchY = hero.isDiving ? 1.24 : 1;

  // Directional lean proportional to horizontal velocity (inverted when gravity is flipped)
  const leanRad = clamp(vx / 900, -0.3, 0.3) * upsideDown;

  return {
    coreColor,
    envelopeColor,
    accentColor,
    alpha,
    scaleX: rawScaleX * diveStretchX,
    scaleY: rawScaleY * diveStretchY,
    leanRad,
    facingDir,
    upsideDown,
    isDiving: Boolean(hero.isDiving),
    isRunning,
    isAirborne,
    speedRatio,
    isSuperQuanta,
    hasTunnelCharge,
    hasPauliAura,
    glowLayers: options.reducedEffects ? 1 : 2,
    waveSegments: options.reducedEffects ? 10 : 16
  };
}

/**
 * Shared power-up & state status rings (Super-Quanta, Tunnel, Pauli) drawn across all procedural skins.
 */
function drawPowerupAuras(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  t: number,
  state: HeroVisualState,
  reducedEffects: boolean
): void {
  const maxS = Math.max(state.scaleX, state.scaleY);

  // Super-Quanta golden orbital ring (fusionStack >= 2)
  if (state.isSuperQuanta) {
    const ringR = 26 * maxS;
    g.lineStyle(2.8, 0xfbbf24, 0.96);
    g.strokeCircle(x, y, ringR);
    if (!reducedEffects) {
      const orbAngle = t * 4.5;
      g.fillStyle(0xfef08a, 0.98);
      g.fillCircle(x + Math.cos(orbAngle) * ringR, y + Math.sin(orbAngle) * ringR, 3.2);
      g.fillCircle(x - Math.cos(orbAngle) * ringR, y - Math.sin(orbAngle) * ringR, 3.2);
    }
  }

  // Tunneling charge halo (tunnelCharges > 0)
  if (state.hasTunnelCharge) {
    const haloR = 29 * maxS;
    const rot = t * 3.2;
    g.lineStyle(2.2, 0xfacc15, 0.88);
    if (typeof g.arc === 'function') {
      g.beginPath();
      g.arc(x, y, haloR, rot, rot + Math.PI * 0.65, false);
      g.strokePath();
      g.beginPath();
      g.arc(x, y, haloR, rot + Math.PI, rot + Math.PI * 1.65, false);
      g.strokePath();
    } else {
      g.strokeCircle(x, y, haloR);
    }
  }

  // Pauli repulsion aura
  if (state.hasPauliAura) {
    const pauliR = (reducedEffects ? 27 : 31) * maxS;
    g.lineStyle(2.4, 0xf97316, 0.88);
    g.strokeCircle(x, y, pauliR);
  }
}

/**
 * Draws a closed neo-brutalist polygon with thick crisp dark outline.
 */
function drawBrutalistPoly(
  g: Phaser.GameObjects.Graphics,
  points: Array<{ wx: number; wy: number }>,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeAlpha: number,
  strokeWidth: number
): void {
  if (points.length < 3) return;
  g.fillStyle(fillColor, fillAlpha);
  g.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  g.beginPath();
  g.moveTo(points[0].wx, points[0].wy);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].wx, points[i].wy);
  }
  g.closePath?.();
  g.fillPath?.();
  g.strokePath();
}

// 14x16 crisp GameBoy DMG pixel-art sprite frames:
// '.' = transparent, 'O' = dark pixel outline, 'D' = shadow shade, 'M' = mid body, 'L' = bright highlight, 'A' = phase/neon accent, 'E' = eye
const GB_SPRITE_IDLE = [
  '.....OOOO.....',
  '....OAAAOO....',
  '...OLLLLLLO...',
  '..OLLLOOLLLO..',
  '..OLLOOELLLO..',
  '..OLMOOMELMO..',
  '..OMMMMMMMMO..',
  '...OOOOOOOO...',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMOMO.',
  '.ODOMDDDDMODO.',
  '..OOMMMMMMOO..',
  '...OODDDDOO...',
  '...OOM..MOO...',
  '...OOD..DOO...',
  '...OOO..OOO...'
];

const GB_SPRITE_RUN_A = [
  '.....OOOO.....',
  '....OAAAOO....',
  '...OLLLLLLO...',
  '..OLLLOOLLLO..',
  '..OLLOOELLLO..',
  '..OLMOOMELMO..',
  '..OMMMMMMMMO..',
  '...OOOOOOOO...',
  '..OOMMAAMMOO..',
  '.OMOMMMMMMOMO.',
  '..OOMDDDDMODO.',
  '...OMMMMMMOO..',
  '..OODDDDOO....',
  '.OOM....MOO...',
  '.OOO....OOO...',
  '..............'
];

const GB_SPRITE_RUN_B = [
  '..............',
  '.....OOOO.....',
  '....OAAAOO....',
  '...OLLLLLLO...',
  '..OLLLOOLLLO..',
  '..OLLOOELLLO..',
  '..OLMOOMELMO..',
  '..OMMMMMMMMO..',
  '...OOOOOOOO...',
  '..OOMMAAMMOO..',
  '.ODOMMMMMMOMO.',
  '..OOMDDDDMOO..',
  '...OODDDDOO...',
  '....OOMMOO....',
  '...OOD..DOO...',
  '...OOO..OOO...'
];

const GB_SPRITE_JUMP = [
  '.....OOOO.....',
  '....OAAAOO....',
  '...OLLLLLLO...',
  '..OLLLOOLLLO..',
  '..OLLOOELLLO..',
  '.OOLMOOMELMOO.',
  '.OMOMMMMMMOMO.',
  '..OOOOOOOOOO..',
  '...OMMAAMMO...',
  '...OMMMMMMO...',
  '...OMDDDDMO...',
  '..OODDDDOO....',
  '..OOM..OOM....',
  '..OOO..OOO....',
  '..............',
  '..............'
];

/**
 * Skin 1: GameBoy DMG / Pocket pixel-art hero (`gameboy`).
 * Crisp integer pixel blocks with classic 4-shade GameBoy LCD charm + active quantum state accents.
 */
export function drawGameboyHeroShape(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
  state: HeroVisualState,
  reducedEffects: boolean,
  isGhost = false
): void {
  const t = timeMs * 0.001;
  const a = state.alpha;
  const dir = state.facingDir;
  const pxW = 2.6 * state.scaleX;
  const pxH = 2.6 * state.scaleY;

  const sprite =
    state.isAirborne || state.isDiving
      ? GB_SPRITE_JUMP
      : state.isRunning
        ? Math.floor(timeMs / 110) % 2 === 0
          ? GB_SPRITE_RUN_A
          : GB_SPRITE_RUN_B
        : GB_SPRITE_IDLE;

  const rows = sprite.length;
  const cols = sprite[0].length;
  const originX = x - (cols * pxW) / 2;
  const originY = y - (rows * pxH) / 2;

  // Classic GameBoy DMG 4-shade LCD palette (tinted for ghosts)
  const palette: Record<string, number> = isGhost
    ? {
        O: state.envelopeColor,
        D: state.envelopeColor,
        M: state.accentColor,
        L: 0xf8fafc,
        A: state.coreColor,
        E: 0x050814
      }
    : {
        O: 0x0f380f, // DMG darkest green-black outline
        D: 0x306230, // DMG dark shade
        M: 0x8bac0f, // DMG mid green
        L: 0x9bbc0f, // DMG bright LCD green
        A: state.envelopeColor, // Dynamic phase / quantum accent band & antenna
        E: 0x0f380f // Crisp pixel eye
      };

  // Subtle LCD glow halo behind character in FX:HI
  if (!isGhost && !reducedEffects) {
    g.fillStyle(state.envelopeColor, 0.14 * a);
    g.fillCircle(x, y, 24 * Math.max(state.scaleX, state.scaleY));
  }

  for (let r = 0; r < rows; r++) {
    const rowStr = sprite[r];
    const drawRow = state.upsideDown === -1 ? rows - 1 - r : r;
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c];
      if (ch === '.') continue;
      const drawCol = dir === -1 ? cols - 1 - c : c;
      const color = palette[ch];
      if (color === undefined) continue;
      const cellAlpha = isGhost ? (ch === 'O' ? 0.72 * a : 0.48 * a) : a;
      g.fillStyle(color, cellAlpha);
      if (typeof g.fillRect === 'function') {
        g.fillRect(originX + drawCol * pxW, originY + drawRow * pxH, pxW + 0.35, pxH + 0.35);
      } else {
        g.fillCircle(originX + (drawCol + 0.5) * pxW, originY + (drawRow + 0.5) * pxH, pxW * 0.6);
      }
    }
  }

  // Dive pixel chevron beneath feet
  if (state.isDiving && !isGhost) {
    const tipY = y + 26 * state.scaleY * state.upsideDown;
    const baseY = y + 18 * state.scaleY * state.upsideDown;
    g.fillStyle(state.accentColor, 0.9 * a);
    g.fillTriangle?.(x - 8 * state.scaleX, baseY, x, tipY, x + 8 * state.scaleX, baseY);
  }

  if (!isGhost) {
    drawPowerupAuras(g, x, y, t, state, reducedEffects);
  }
}

/**
 * Skin 2: Anthropomorphic Neo-Brutalist humanoid (`neo`).
 */
export function drawNeoHeroShape(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
  state: HeroVisualState,
  reducedEffects: boolean,
  isGhost = false
): void {
  const t = timeMs * 0.001;
  const sx = state.scaleX;
  const sy = state.scaleY;
  const dir = state.facingDir;
  const cosL = Math.cos(state.leanRad);
  const sinL = Math.sin(state.leanRad);
  const a = state.alpha;

  const stridePhase = t * (state.isRunning ? 15 : 4.2);
  const bobY = state.isAirborne
    ? 0
    : state.isRunning
      ? -Math.abs(Math.sin(stridePhase)) * 2.2
      : Math.sin(t * 4.2) * 1.1;

  const toWorld = (lx: number, ly: number): { wx: number; wy: number } => {
    const px = lx * sx;
    const py = (ly + bobY) * sy * state.upsideDown;
    return {
      wx: x + px * cosL - py * sinL,
      wy: y + px * sinL + py * cosL
    };
  };

  const rectPts = (cx: number, cy: number, w: number, h: number) => {
    const hw = w / 2;
    const hh = h / 2;
    return [
      toWorld(cx - hw, cy - hh),
      toWorld(cx + hw, cy - hh),
      toWorld(cx + hw, cy + hh),
      toWorld(cx - hw, cy + hh)
    ];
  };

  const outlineColor = isGhost ? state.envelopeColor : 0x050814;
  const outlineWidth = isGhost ? 1.8 : 2.6;
  const bodyDark = isGhost ? state.envelopeColor : 0x0f172a;
  const bodyFillAlpha = isGhost ? 0.38 * a : 0.96 * a;

  if (!isGhost) {
    for (let layer = state.glowLayers; layer >= 1; layer--) {
      const radius = (layer === 1 ? 22 : 28) * Math.max(sx, sy);
      const glowAlpha = (layer === 1 ? 0.16 : 0.08) * a;
      g.fillStyle(state.envelopeColor, glowAlpha);
      g.fillCircle(x, y, radius);
    }
  }

  // Trailing energy scarf
  const scarfWave = Math.sin(t * 11) * (state.isRunning || state.isAirborne ? 3.2 : 1.2);
  const scarfLen = 10 + state.speedRatio * 7;
  const scarfPts = [
    toWorld(-dir * 5, -2),
    toWorld(-dir * (5 + scarfLen), -3 + scarfWave),
    toWorld(-dir * (3 + scarfLen * 0.85), 5 + scarfWave * 0.8),
    toWorld(-dir * 4, 5)
  ];
  drawBrutalistPoly(g, scarfPts, state.accentColor, (isGhost ? 0.45 : 0.9) * a, outlineColor, a, 2);

  // Articulated legs & chunky boots
  const legSwing = state.isDiving
    ? 0
    : state.isAirborne
      ? 4.2
      : state.isRunning
        ? Math.sin(stridePhase) * 6.5
        : 0;
  const backLegLift = state.isAirborne
    ? -3
    : state.isRunning
      ? Math.max(0, -Math.cos(stridePhase)) * 3.2
      : 0;
  const frontLegLift = state.isAirborne
    ? -1.5
    : state.isRunning
      ? Math.max(0, Math.cos(stridePhase)) * 3.2
      : 0;

  drawBrutalistPoly(
    g,
    rectPts(-dir * 4 - legSwing, 17 - backLegLift, 7, 10),
    isGhost ? state.envelopeColor : 0x1e293b,
    bodyFillAlpha,
    outlineColor,
    a,
    outlineWidth
  );
  drawBrutalistPoly(
    g,
    rectPts(dir * 4 + legSwing, 17 - frontLegLift, 7.5, 10),
    state.envelopeColor,
    (isGhost ? 0.52 : 0.96) * a,
    outlineColor,
    a,
    outlineWidth
  );

  // Torso + hard shadow + chest reactor
  if (!isGhost) {
    const shadowPts = rectPts(2.5, 5.5, 17, 15);
    g.fillStyle(0x020617, 0.55 * a);
    g.beginPath();
    g.moveTo(shadowPts[0].wx, shadowPts[0].wy);
    for (let i = 1; i < shadowPts.length; i++) g.lineTo(shadowPts[i].wx, shadowPts[i].wy);
    g.closePath?.();
    g.fillPath?.();
  }
  drawBrutalistPoly(
    g,
    rectPts(0, 4, 17, 15),
    bodyDark,
    bodyFillAlpha,
    outlineColor,
    a,
    outlineWidth
  );
  const corePulse = 1 + 0.08 * Math.sin(t * 6.5);
  drawBrutalistPoly(
    g,
    rectPts(dir * 2, 4, 7 * corePulse, 6 * corePulse),
    state.coreColor,
    (isGhost ? 0.7 : 0.98) * a,
    state.envelopeColor,
    a,
    1.6
  );

  // Front arm
  const armSwing = -legSwing * 0.65;
  drawBrutalistPoly(
    g,
    rectPts(dir * 7 + armSwing * 0.5, 5 + (state.isAirborne ? -3 : 0), 5.5, 9),
    state.envelopeColor,
    (isGhost ? 0.45 : 0.94) * a,
    outlineColor,
    a,
    2.2
  );

  // Helmet + visor + glowing eyes + antenna
  const headPts = [
    toWorld(-10, -17),
    toWorld(10, -17),
    toWorld(12, -13),
    toWorld(12, -3),
    toWorld(9, -1),
    toWorld(-9, -1),
    toWorld(-12, -3),
    toWorld(-12, -13)
  ];
  drawBrutalistPoly(
    g,
    headPts,
    state.envelopeColor,
    (isGhost ? 0.5 : 0.98) * a,
    outlineColor,
    a,
    outlineWidth
  );
  drawBrutalistPoly(
    g,
    rectPts(dir * 2.5, -9.5, 14, state.isDiving ? 5 : 7),
    0x050814,
    (isGhost ? 0.65 : 0.95) * a,
    state.accentColor,
    0.75 * a,
    1.4
  );
  const eyeLeft = toWorld(dir * 0.5, -9.5);
  const eyeRight = toWorld(dir * 6.2, -9.5);
  g.fillStyle(state.coreColor, 0.98 * a);
  g.fillCircle(eyeLeft.wx, eyeLeft.wy, 1.9);
  g.fillCircle(eyeRight.wx, eyeRight.wy, 1.9);

  const crestBase = toWorld(-dir * 1, -17);
  const crestTip = toWorld(-dir * 3, -23);
  g.lineStyle(2.4, state.accentColor, 0.95 * a);
  g.beginPath();
  g.moveTo(crestBase.wx, crestBase.wy);
  g.lineTo(crestTip.wx, crestTip.wy);
  g.strokePath();
  g.fillStyle(state.coreColor, 0.98 * a);
  g.fillCircle(crestTip.wx, crestTip.wy, 2.4);

  if (state.isDiving) {
    const tip = toWorld(0, 29);
    const leftWing = toWorld(-9, 17);
    const rightWing = toWorld(9, 17);
    g.fillStyle(state.accentColor, 0.9 * a);
    g.fillTriangle?.(leftWing.wx, leftWing.wy, tip.wx, tip.wy, rightWing.wx, rightWing.wy);
  }

  if (!isGhost) {
    drawPowerupAuras(g, x, y, t, state, reducedEffects);
  }
}

/**
 * Skin 3: Luminous Quantum Orb / Wave Envelope (`quantum`).
 */
export function drawQuantumHeroShape(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
  state: HeroVisualState,
  reducedEffects: boolean,
  isGhost = false
): void {
  const t = timeMs * 0.001;
  const baseRx = 16 * state.scaleX;
  const baseRy = 18 * state.scaleY;
  const cosL = Math.cos(state.leanRad);
  const sinL = Math.sin(state.leanRad);

  const toWorld = (lx: number, ly: number): { wx: number; wy: number } => {
    const fy = ly * state.upsideDown;
    return {
      wx: x + lx * cosL - fy * sinL,
      wy: y + lx * sinL + fy * cosL
    };
  };

  if (!isGhost) {
    for (let layer = state.glowLayers; layer >= 1; layer--) {
      const radius = Math.max(baseRx, baseRy) + layer * 6;
      const glowAlpha = (layer === 1 ? 0.2 : 0.1) * state.alpha;
      g.fillStyle(state.envelopeColor, glowAlpha);
      g.fillCircle(x, y, radius);
    }
  }

  g.fillStyle(state.envelopeColor, 0.34 * state.alpha);
  g.lineStyle(2.4, state.envelopeColor, 0.96 * state.alpha);
  g.beginPath();
  for (let i = 0; i <= state.waveSegments; i++) {
    const theta = (i / state.waveSegments) * Math.PI * 2;
    const harmonic = 1 + 0.09 * Math.sin(theta * 3 + t * 7.5);
    const lx = Math.cos(theta) * baseRx * harmonic;
    const ly = Math.sin(theta) * baseRy * harmonic;
    const { wx, wy } = toWorld(lx, ly);
    if (i === 0) g.moveTo(wx, wy);
    else g.lineTo(wx, wy);
  }
  g.closePath?.();
  g.fillPath?.();
  g.strokePath();

  if (state.isDiving) {
    const tip = toWorld(0, baseRy + 10);
    const leftWing = toWorld(-7 * state.scaleX, baseRy - 3);
    const rightWing = toWorld(7 * state.scaleX, baseRy - 3);
    g.fillStyle(state.accentColor, 0.9 * state.alpha);
    g.fillTriangle?.(leftWing.wx, leftWing.wy, tip.wx, tip.wy, rightWing.wx, rightWing.wy);
  }

  const corePulse = 1 + 0.08 * Math.sin(t * 6);
  const coreRadius = 8.5 * Math.min(state.scaleX, state.scaleY) * corePulse;
  g.fillStyle(state.coreColor, 0.95 * state.alpha);
  g.fillCircle(x, y, coreRadius);

  const eyePos = toWorld(state.facingDir * 5.5 * state.scaleX, -4 * state.scaleY);
  g.fillStyle(0x050814, 0.9 * state.alpha);
  g.fillCircle(eyePos.wx, eyePos.wy, 3.2);
  g.fillStyle(0xffffff, 0.98 * state.alpha);
  g.fillCircle(eyePos.wx + state.facingDir * 0.8, eyePos.wy - 0.6 * state.upsideDown, 1.4);

  const crestL = toWorld(-5 * state.scaleX, -baseRy + 2);
  const crestTip = toWorld(0, -baseRy - 4);
  const crestR = toWorld(5 * state.scaleX, -baseRy + 2);
  g.lineStyle(1.8, state.accentColor, 0.9 * state.alpha);
  g.beginPath();
  g.moveTo(crestL.wx, crestL.wy);
  g.lineTo(crestTip.wx, crestTip.wy);
  g.lineTo(crestR.wx, crestR.wy);
  g.strokePath();

  if (!isGhost) {
    drawPowerupAuras(g, x, y, t, state, reducedEffects);
  }
}

/**
 * Dispatches procedural rendering for any non-classic skin (`gameboy`, `neo`, `quantum`).
 */
export function drawProceduralHeroForSkin(
  g: Phaser.GameObjects.Graphics,
  skin: Exclude<HeroSkin, 'classic'>,
  x: number,
  y: number,
  timeMs: number,
  state: HeroVisualState,
  reducedEffects: boolean,
  isGhost = false
): void {
  if (isPixelHeroSkin(skin)) {
    drawPixelArtHero(g, skin, x, y, timeMs, state, isGhost);
    if (!isGhost) {
      drawPowerupAuras(g, x, y, timeMs * 0.001, state, reducedEffects);
    }
  } else if (skin === 'neo') {
    drawNeoHeroShape(g, x, y, timeMs, state, reducedEffects, isGhost);
  } else {
    drawQuantumHeroShape(g, x, y, timeMs, state, reducedEffects, isGhost);
  }
}

/**
 * Multi-skin procedural Hero renderer (`gameboy` / `neo` / `quantum`) with instant live switching
 * to/from the Classic retro spritesheet (`hero.png` / `disabled.png`).
 * Never modifies Hero Arcade Physics bodies, hitboxes, or `stepHeroPhysics.ts`.
 */
export class HeroRenderer {
  private graphics: Phaser.GameObjects.Graphics | null;
  private lastSkin: HeroSkin | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = typeof scene.add?.graphics === 'function' ? scene.add.graphics() : null;
    this.graphics?.setDepth?.(18);
  }

  public render(timeMs: number, heroes: Hero[], options: HeroRenderOptions): void {
    const g = this.graphics;
    if (!g) return;

    g.clear();

    if (options.skin === 'classic') {
      // Restore classic spritesheet visibility/alpha immediately when switching from a procedural skin
      for (const hero of heroes) {
        if (!hero?.active) continue;
        if (this.lastSkin !== 'classic' || hero.alpha === 0) {
          const restoredAlpha = hero.tunnelCharges > 0 ? 0.5 + 0.25 * Math.sin(timeMs * 0.008) : 1;
          hero.setAlpha?.(restoredAlpha);
        }
      }
      this.lastSkin = 'classic';
      return;
    }

    this.lastSkin = options.skin;

    for (const hero of heroes) {
      if (!hero?.active) continue;
      // Keep hero.visible = true so pointer clicks & Arcade Physics stay 100% intact,
      // while hiding the underlying retro spritesheet via alpha = 0.
      if (hero.alpha !== 0) {
        hero.setAlpha?.(0);
      }

      const state = computeHeroVisualState(hero, timeMs, options);
      drawProceduralHeroForSkin(
        g,
        options.skin,
        hero.x,
        hero.y,
        timeMs,
        state,
        options.reducedEffects,
        false
      );
    }
  }

  public destroy(): void {
    if (this.graphics) {
      try {
        this.graphics.destroy();
      } catch {
        // safe
      }
      this.graphics = null;
    }
  }
}

export default HeroRenderer;
