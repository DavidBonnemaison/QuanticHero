import type Phaser from 'phaser';
import type { HeroSkin, PlatformPhase } from '../types';
import type Hero from './Hero';

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
 * Pure state-to-visuals mapper for the procedural Quantum Hero.
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
  const upsideDown: 1 | -1 = hero.upsideDown === -1 ? -1 : 1;
  const facingDir: 1 | -1 = hero.flipX ? -1 : 1;
  const isSuperQuanta = (hero.fusionStack ?? 1) >= 2;
  const hasTunnelCharge = (hero.tunnelCharges ?? 0) > 0;
  const hasPauliAura = Boolean(options.isPauliActive) || (hero.pauliGraceUntil ?? 0) > timeMs;

  // Base spectral palette expressing entanglement, active phase, and focus
  let coreColor = 0xe0f2fe;
  let envelopeColor = 0x00e5ff;
  let accentColor = 0x38bdf8;
  let alpha = 0.96;

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
  const leanRad = clamp(vx / 900, -0.32, 0.32) * upsideDown;

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
    isSuperQuanta,
    hasTunnelCharge,
    hasPauliAura,
    glowLayers: options.reducedEffects ? 1 : 2,
    waveSegments: options.reducedEffects ? 10 : 16
  };
}

/**
 * Procedural Quantum Hero renderer with instant live switching to/from
 * the Classic retro spritesheet (`hero.png` / `disabled.png`).
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
      // Restore classic spritesheet visibility/alpha immediately when switching from quantum
      for (const hero of heroes) {
        if (!hero?.active) continue;
        if (this.lastSkin === 'quantum' || hero.alpha === 0) {
          const restoredAlpha = hero.tunnelCharges > 0 ? 0.5 + 0.25 * Math.sin(timeMs * 0.008) : 1;
          hero.setAlpha?.(restoredAlpha);
        }
      }
      this.lastSkin = 'classic';
      return;
    }

    this.lastSkin = 'quantum';

    for (const hero of heroes) {
      if (!hero?.active) continue;
      // Keep hero.visible = true so pointer clicks & Arcade Physics stay 100% intact,
      // while hiding the underlying retro spritesheet via alpha = 0.
      if (hero.alpha !== 0) {
        hero.setAlpha?.(0);
      }

      const state = computeHeroVisualState(hero, timeMs, options);
      this.drawQuantumHero(g, hero.x, hero.y, timeMs, state, options.reducedEffects);
    }
  }

  private drawQuantumHero(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    timeMs: number,
    state: HeroVisualState,
    reducedEffects: boolean
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

    // 1. Soft luminous outer glow halo (1 layer in FX:LO, 2 layers in FX:HI)
    for (let layer = state.glowLayers; layer >= 1; layer--) {
      const radius = Math.max(baseRx, baseRy) + layer * 6;
      const glowAlpha = (layer === 1 ? 0.2 : 0.1) * state.alpha;
      g.fillStyle(state.envelopeColor, glowAlpha);
      g.fillCircle(x, y, radius);
    }

    // 2. Probability wave envelope deformed by squash & stretch and velocity lean
    g.fillStyle(state.envelopeColor, 0.34 * state.alpha);
    g.lineStyle(2.4, state.envelopeColor, 0.96 * state.alpha);
    g.beginPath();
    for (let i = 0; i <= state.waveSegments; i++) {
      const theta = (i / state.waveSegments) * Math.PI * 2;
      const harmonic = 1 + 0.09 * Math.sin(theta * 3 + t * 7.5);
      const lx = Math.cos(theta) * baseRx * harmonic;
      const ly = Math.sin(theta) * baseRy * harmonic;
      const { wx, wy } = toWorld(lx, ly);
      if (i === 0) {
        g.moveTo(wx, wy);
      } else {
        g.lineTo(wx, wy);
      }
    }
    g.closePath?.();
    g.fillPath?.();
    g.strokePath();

    // 3. Dive plasma spear tip
    if (state.isDiving) {
      const tip = toWorld(0, baseRy + 10);
      const leftWing = toWorld(-7 * state.scaleX, baseRy - 3);
      const rightWing = toWorld(7 * state.scaleX, baseRy - 3);
      g.fillStyle(state.accentColor, 0.9 * state.alpha);
      g.fillTriangle?.(leftWing.wx, leftWing.wy, tip.wx, tip.wy, rightWing.wx, rightWing.wy);
    }

    // 4. Glowing inner core nucleus
    const corePulse = 1 + 0.08 * Math.sin(t * 6);
    const coreRadius = 8.5 * Math.min(state.scaleX, state.scaleY) * corePulse;
    g.fillStyle(state.coreColor, 0.95 * state.alpha);
    g.fillCircle(x, y, coreRadius);

    // 5. Directional visor / eye spark (expresses facing direction & inverted gravity)
    const eyePos = toWorld(state.facingDir * 5.5 * state.scaleX, -4 * state.scaleY);
    g.fillStyle(0x050814, 0.9 * state.alpha);
    g.fillCircle(eyePos.wx, eyePos.wy, 3.2);
    g.fillStyle(0xffffff, 0.98 * state.alpha);
    g.fillCircle(eyePos.wx + state.facingDir * 0.8, eyePos.wy - 0.6 * state.upsideDown, 1.4);

    // Gravity crest indicator on top (flips cleanly when upsideDown === -1)
    const crestL = toWorld(-5 * state.scaleX, -baseRy + 2);
    const crestTip = toWorld(0, -baseRy - 4);
    const crestR = toWorld(5 * state.scaleX, -baseRy + 2);
    g.lineStyle(1.8, state.accentColor, 0.9 * state.alpha);
    g.beginPath();
    g.moveTo(crestL.wx, crestL.wy);
    g.lineTo(crestTip.wx, crestTip.wy);
    g.lineTo(crestR.wx, crestR.wy);
    g.strokePath();

    // 6. Super-Quanta golden orbital ring (fusionStack >= 2)
    if (state.isSuperQuanta) {
      const ringR = Math.max(baseRx, baseRy) + 7;
      g.lineStyle(2.6, 0xfbbf24, 0.95);
      g.strokeCircle(x, y, ringR);
      if (!reducedEffects) {
        const orbAngle = t * 4.5;
        g.fillStyle(0xfef08a, 0.98);
        g.fillCircle(x + Math.cos(orbAngle) * ringR, y + Math.sin(orbAngle) * ringR, 3.2);
        g.fillCircle(x - Math.cos(orbAngle) * ringR, y - Math.sin(orbAngle) * ringR, 3.2);
      }
    }

    // 7. Tunneling charge halo (tunnelCharges > 0)
    if (state.hasTunnelCharge) {
      const haloR = Math.max(baseRx, baseRy) + 11;
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

    // 8. Pauli repulsion aura
    if (state.hasPauliAura) {
      const pauliR = Math.max(baseRx, baseRy) + (reducedEffects ? 9 : 13);
      g.lineStyle(2.2, 0xf97316, 0.85);
      g.strokeCircle(x, y, pauliR);
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
