import type Phaser from 'phaser';
import type { ParticleType } from '../types';

export const PORTAL_TEXTURE_KEY = 'portal';
export const SPIKE_TEXTURE_KEY = 'spike';
export const PARTICLE_TEXTURE_SIZE = 64;
export const PORTAL_TEXTURE_SIZE = 128;
export const SPIKE_TEXTURE_WIDTH = 64;
export const SPIKE_TEXTURE_HEIGHT = 32;

export interface ParticleVisualSpec {
  type: ParticleType;
  textureKey: string;
  shapeId:
    | 'double_rings'
    | 'kinetic_chevrons'
    | 'orbital_arrow_up'
    | 'orbital_arrow_down'
    | 'wave_barrier'
    | 'opposite_spins'
    | 'relativistic_hourglass'
    | 'crystallized_sinusoid';
  symbol: string;
  colorHex: string;
  colorInt: number;
  accentInt: number;
  darkText?: boolean;
}

export const PARTICLE_VISUAL_SPECS: Record<ParticleType, ParticleVisualSpec> = {
  duplicate: {
    type: 'duplicate',
    textureKey: 'particle-duplicate',
    shapeId: 'double_rings',
    symbol: '◎',
    colorHex: '#38bdf8',
    colorInt: 0x38bdf8,
    accentInt: 0xe0f2fe
  },
  speed: {
    type: 'speed',
    textureKey: 'particle-speed',
    shapeId: 'kinetic_chevrons',
    symbol: '>>',
    colorHex: '#f43f5e',
    colorInt: 0xf43f5e,
    accentInt: 0xffe4e6
  },
  lowGravity: {
    type: 'lowGravity',
    textureKey: 'particle-lowGravity',
    shapeId: 'orbital_arrow_up',
    symbol: '↑',
    colorHex: '#10b981',
    colorInt: 0x10b981,
    accentInt: 0xd1fae5
  },
  antiGravity: {
    type: 'antiGravity',
    textureKey: 'particle-antiGravity',
    shapeId: 'orbital_arrow_down',
    symbol: '↓',
    colorHex: '#06b6d4',
    colorInt: 0x06b6d4,
    accentInt: 0xcffafe,
    darkText: true
  },
  tunnel: {
    type: 'tunnel',
    textureKey: 'particle-tunnel',
    shapeId: 'wave_barrier',
    symbol: '~|~',
    colorHex: '#eab308',
    colorInt: 0xeab308,
    accentInt: 0xfef9c3,
    darkText: true
  },
  pauli: {
    type: 'pauli',
    textureKey: 'particle-pauli',
    shapeId: 'opposite_spins',
    symbol: '↑↓',
    colorHex: '#f97316',
    colorInt: 0xf97316,
    accentInt: 0xffedd5
  },
  timeDilation: {
    type: 'timeDilation',
    textureKey: 'particle-timeDilation',
    shapeId: 'relativistic_hourglass',
    symbol: '⌛',
    colorHex: '#a855f7',
    colorInt: 0xa855f7,
    accentInt: 0xf3e8ff
  },
  condense: {
    type: 'condense',
    textureKey: 'particle-condense',
    shapeId: 'crystallized_sinusoid',
    symbol: '◇',
    colorHex: '#14b8a6',
    colorInt: 0x14b8a6,
    accentInt: 0xccfbf1,
    darkText: true
  }
};

export const PARTICLE_TEXTURE_KEYS: Record<ParticleType, string> = {
  duplicate: PARTICLE_VISUAL_SPECS.duplicate.textureKey,
  speed: PARTICLE_VISUAL_SPECS.speed.textureKey,
  lowGravity: PARTICLE_VISUAL_SPECS.lowGravity.textureKey,
  antiGravity: PARTICLE_VISUAL_SPECS.antiGravity.textureKey,
  tunnel: PARTICLE_VISUAL_SPECS.tunnel.textureKey,
  pauli: PARTICLE_VISUAL_SPECS.pauli.textureKey,
  timeDilation: PARTICLE_VISUAL_SPECS.timeDilation.textureKey,
  condense: PARTICLE_VISUAL_SPECS.condense.textureKey
};

export const ALL_PARTICLE_TYPES: readonly ParticleType[] = [
  'duplicate',
  'speed',
  'lowGravity',
  'antiGravity',
  'tunnel',
  'pauli',
  'timeDilation',
  'condense'
];

function createOffscreenGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  if (scene.make && typeof scene.make.graphics === 'function') {
    return scene.make.graphics({ x: 0, y: 0 }, false);
  }
  return scene.add.graphics();
}

function drawPortalTexture(g: Phaser.GameObjects.Graphics): void {
  const cx = PORTAL_TEXTURE_SIZE / 2;
  const cy = PORTAL_TEXTURE_SIZE / 2;

  // Outer luminous accretion halo
  g.fillStyle(0x38bdf8, 0.16);
  g.fillCircle(cx, cy, 58);

  // Outer rotating accretion ring (segmented arcs for clear rotational cue)
  g.lineStyle(5, 0x38bdf8, 0.92);
  g.beginPath();
  g.arc(cx, cy, 48, 0.15, Math.PI * 0.85, false);
  g.strokePath();

  g.beginPath();
  g.arc(cx, cy, 48, Math.PI + 0.15, Math.PI * 1.85, false);
  g.strokePath();

  // Secondary inner spectral ring
  g.lineStyle(2.5, 0xe0f2fe, 0.9);
  g.strokeCircle(cx, cy, 37);

  // Accent orbital nodes on the accretion ring
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx + 48, cy, 4);
  g.fillCircle(cx - 48, cy, 4);

  // Dark singularity event horizon core
  g.fillStyle(0x050814, 0.95);
  g.fillCircle(cx, cy, 28);

  // Crisp inner horizon rim
  g.lineStyle(2, 0x7dd3fc, 0.85);
  g.strokeCircle(cx, cy, 28);

  // Central pinpoint gleam
  g.fillStyle(0xffffff, 0.65);
  g.fillCircle(cx, cy, 4.5);
}

function drawSpikeTexture(g: Phaser.GameObjects.Graphics): void {
  const w = SPIKE_TEXTURE_WIDTH;
  const h = SPIKE_TEXTURE_HEIGHT;
  const half = w / 2;

  // Base plasma glow strip
  g.fillStyle(0xff2a55, 0.35);
  g.fillRect(0, h - 5, w, 5);

  // Two crisp neon plasma teeth
  for (let i = 0; i < 2; i++) {
    const x0 = i * half;
    const xMid = x0 + half / 2;
    const x1 = x0 + half;

    g.fillStyle(0xff2a55, 0.96);
    g.fillTriangle(x0 + 1, h - 1, xMid, 2, x1 - 1, h - 1);

    // Bright inner plasma core ridge
    g.fillStyle(0xfef08a, 0.72);
    g.fillTriangle(x0 + half * 0.32, h - 2, xMid, 8, x1 - half * 0.32, h - 2);

    g.lineStyle(2, 0xffaa00, 0.98);
    g.strokeTriangle(x0 + 1, h - 1, xMid, 2, x1 - 1, h - 1);
  }
}

function drawParticleBadgeFrame(g: Phaser.GameObjects.Graphics, spec: ParticleVisualSpec): void {
  const cx = PARTICLE_TEXTURE_SIZE / 2;
  const cy = PARTICLE_TEXTURE_SIZE / 2;

  // Soft outer aura
  g.fillStyle(spec.colorInt, 0.22);
  g.fillCircle(cx, cy, 30);

  // High-contrast dark backing disc so glyph pops on any level hue
  g.fillStyle(0x070d1f, 0.9);
  g.fillCircle(cx, cy, 25);

  // Colored outer ring
  g.lineStyle(3, spec.colorInt, 0.98);
  g.strokeCircle(cx, cy, 25);
}

function drawParticleGlyph(g: Phaser.GameObjects.Graphics, spec: ParticleVisualSpec): void {
  const cx = PARTICLE_TEXTURE_SIZE / 2;
  const cy = PARTICLE_TEXTURE_SIZE / 2;

  drawParticleBadgeFrame(g, spec);

  switch (spec.type) {
    case 'duplicate': {
      // Interlaced double rings
      g.lineStyle(3.2, 0xffffff, 0.98);
      g.strokeCircle(cx - 7, cy, 10.5);
      g.lineStyle(3.2, spec.accentInt, 0.98);
      g.strokeCircle(cx + 7, cy, 10.5);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(cx - 7, cy, 2.5);
      g.fillCircle(cx + 7, cy, 2.5);
      break;
    }
    case 'speed': {
      // Kinetic chevrons >>
      g.lineStyle(4, 0xffffff, 0.98);
      for (const offset of [-7, 5]) {
        g.beginPath();
        g.moveTo(cx + offset - 6, cy - 11);
        g.lineTo(cx + offset + 5, cy);
        g.lineTo(cx + offset - 6, cy + 11);
        g.strokePath();
      }
      break;
    }
    case 'lowGravity': {
      // Ascending orbital arrow
      g.lineStyle(3.5, 0xffffff, 0.98);
      g.lineBetween(cx, cy + 11, cx, cy - 11);
      g.beginPath();
      g.moveTo(cx - 9, cy - 3);
      g.lineTo(cx, cy - 12);
      g.lineTo(cx + 9, cy - 3);
      g.strokePath();
      // Orbital arc beneath
      g.lineStyle(2.5, spec.accentInt, 0.9);
      g.beginPath();
      g.arc(cx, cy + 16, 13, Math.PI * 1.18, Math.PI * 1.82, false);
      g.strokePath();
      break;
    }
    case 'antiGravity': {
      // Inverted orbital arrow
      g.lineStyle(3.5, 0xffffff, 0.98);
      g.lineBetween(cx, cy - 11, cx, cy + 11);
      g.beginPath();
      g.moveTo(cx - 9, cy + 3);
      g.lineTo(cx, cy + 12);
      g.lineTo(cx + 9, cy + 3);
      g.strokePath();
      // Inverted orbital arc above
      g.lineStyle(2.5, spec.accentInt, 0.9);
      g.beginPath();
      g.arc(cx, cy - 16, 13, Math.PI * 0.18, Math.PI * 0.82, false);
      g.strokePath();
      break;
    }
    case 'tunnel': {
      // Wave passing through a vertical barrier
      g.fillStyle(spec.colorInt, 0.95);
      g.fillRect(cx - 2.5, cy - 15, 5, 30);
      g.lineStyle(3.2, 0xffffff, 0.98);
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const px = cx - 16 + t * 32;
        const py = cy + Math.sin(t * Math.PI * 2) * 8;
        if (i === 0) {
          g.moveTo(px, py);
        } else {
          g.lineTo(px, py);
        }
      }
      g.strokePath();
      break;
    }
    case 'pauli': {
      // Opposite spin arrows ↑↓ repelling
      g.lineStyle(3.2, 0xffffff, 0.98);
      // Left arrow up (↑)
      const lx = cx - 8;
      g.lineBetween(lx, cy + 11, lx, cy - 11);
      g.beginPath();
      g.moveTo(lx - 5, cy - 5);
      g.lineTo(lx, cy - 11);
      g.lineTo(lx + 5, cy - 5);
      g.strokePath();
      // Right arrow down (↓)
      const rx = cx + 8;
      g.lineBetween(rx, cy - 11, rx, cy + 11);
      g.beginPath();
      g.moveTo(rx - 5, cy + 5);
      g.lineTo(rx, cy + 11);
      g.lineTo(rx + 5, cy + 5);
      g.strokePath();
      // Central repulsion spark ticks
      g.lineStyle(2, spec.accentInt, 0.95);
      g.lineBetween(cx, cy - 4, cx, cy + 4);
      break;
    }
    case 'timeDilation': {
      // Relativistic hourglass / clock
      g.lineStyle(3, 0xffffff, 0.98);
      // Top & bottom caps
      g.lineBetween(cx - 11, cy - 13, cx + 11, cy - 13);
      g.lineBetween(cx - 11, cy + 13, cx + 11, cy + 13);
      // Hourglass X-frame
      g.beginPath();
      g.moveTo(cx - 9, cy - 13);
      g.lineTo(cx + 9, cy + 13);
      g.moveTo(cx + 9, cy - 13);
      g.lineTo(cx - 9, cy + 13);
      g.strokePath();
      // Relativistic sand core
      g.fillStyle(spec.accentInt, 0.9);
      g.fillTriangle(cx - 5, cy + 11, cx, cy + 3, cx + 5, cy + 11);
      break;
    }
    case 'condense': {
      // Crystallized sinusoid (faceted diamond peaks)
      g.lineStyle(3.2, 0xffffff, 0.98);
      g.beginPath();
      g.moveTo(cx - 16, cy);
      g.lineTo(cx - 8, cy - 10);
      g.lineTo(cx, cy);
      g.lineTo(cx + 8, cy + 10);
      g.lineTo(cx + 16, cy);
      g.strokePath();
      // Crystal facet nodes at peaks
      g.fillStyle(spec.accentInt, 0.98);
      g.fillCircle(cx - 8, cy - 10, 3);
      g.fillCircle(cx, cy, 3);
      g.fillCircle(cx + 8, cy + 10, 3);
      break;
    }
  }
}

/**
 * Procedurally generates and registers all vector/canvas textures at startup:
 * - 'portal': multi-layer luminous singularity ring
 * - 'spike': crisp neon/plasma spike
 * - 8 colorblind-accessible particle glyph textures ('particle-<type>')
 */
export function generateProceduralTextures(scene: Phaser.Scene): string[] {
  const registered: string[] = [];

  const ensureTexture = (
    key: string,
    width: number,
    height: number,
    drawer: (g: Phaser.GameObjects.Graphics) => void
  ) => {
    if (!scene.textures?.exists(key)) {
      const g = createOffscreenGraphics(scene);
      drawer(g);
      g.generateTexture(key, width, height);
      g.destroy();
    }
    registered.push(key);
  };

  ensureTexture(PORTAL_TEXTURE_KEY, PORTAL_TEXTURE_SIZE, PORTAL_TEXTURE_SIZE, drawPortalTexture);
  ensureTexture(SPIKE_TEXTURE_KEY, SPIKE_TEXTURE_WIDTH, SPIKE_TEXTURE_HEIGHT, drawSpikeTexture);

  for (const type of ALL_PARTICLE_TYPES) {
    const spec = PARTICLE_VISUAL_SPECS[type];
    ensureTexture(spec.textureKey, PARTICLE_TEXTURE_SIZE, PARTICLE_TEXTURE_SIZE, (g) => {
      drawParticleGlyph(g, spec);
    });
  }

  return registered;
}

export interface PortalSingularityRenderOptions {
  primaryColor: number;
  accentColor: number;
  isLocked: boolean;
  reducedEffects: boolean;
}

/**
 * Draws the dynamic multi-layer singularity ring around an exit portal.
 * Opens and brightens with spectral accretion arcs when all gates/plates are unlocked,
 * or displays a sealed containment ring when gates remain closed.
 */
export function drawPortalSingularity(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
  options: PortalSingularityRenderOptions
): void {
  const t = timeMs * 0.001;
  const { primaryColor, accentColor, isLocked, reducedEffects } = options;

  const ringColor = isLocked ? 0xf59e0b : primaryColor;
  const pulse = isLocked ? 0.94 + Math.sin(t * 2.5) * 0.04 : 1 + Math.sin(t * 4.2) * 0.08;
  const outerRadius = (isLocked ? 30 : 36) * pulse;
  const innerRadius = (isLocked ? 18 : 22) * pulse;

  // Outer spectral aura (simplified in FX:LO)
  if (!reducedEffects) {
    g.fillStyle(ringColor, isLocked ? 0.08 : 0.16);
    g.fillCircle(x, y, outerRadius + 10);
  }

  // Rotating accretion arcs
  const rotSpeed = isLocked ? 0.65 : 2.1;
  const rot = t * rotSpeed;
  g.lineStyle(isLocked ? 2.5 : 3.5, ringColor, isLocked ? 0.72 : 0.95);
  if (typeof g.arc === 'function') {
    g.beginPath();
    g.arc(x, y, outerRadius, rot, rot + Math.PI * 0.72, false);
    g.strokePath();

    g.beginPath();
    g.arc(x, y, outerRadius, rot + Math.PI, rot + Math.PI * 1.72, false);
    g.strokePath();
  } else {
    g.strokeCircle?.(x, y, outerRadius);
  }

  // Counter-rotating inner spectral ring
  if (!reducedEffects) {
    const innerRot = -t * (isLocked ? 0.5 : 2.8);
    g.lineStyle(2, accentColor, isLocked ? 0.4 : 0.88);
    if (typeof g.arc === 'function') {
      g.beginPath();
      g.arc(x, y, innerRadius + 6, innerRot, innerRot + Math.PI * 1.15, false);
      g.strokePath();
    } else {
      g.strokeCircle?.(x, y, innerRadius + 6);
    }
  }

  // Dark singularity core
  g.fillStyle(0x050814, 0.94);
  g.fillCircle(x, y, innerRadius * 0.78);

  if (isLocked) {
    // Sealed hexagonal containment bars when gates remain closed
    g.lineStyle(2, 0xef4444, 0.88);
    g.strokeCircle(x, y, innerRadius * 0.82);
    g.lineBetween(x - 10, y - 10, x + 10, y + 10);
    g.lineBetween(x + 10, y - 10, x - 10, y + 10);
  } else {
    // Open bright core gleam
    g.lineStyle(2, accentColor, 0.92);
    g.strokeCircle(x, y, innerRadius * 0.82);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(x, y, 4.5 * pulse);
  }
}
