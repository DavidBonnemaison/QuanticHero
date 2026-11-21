import Phaser from 'phaser';
import type Hero from '../scenes/Hero';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';

export interface VortexParticle {
  angle: number;
  radius: number;
  speed: number;
  angularSpeed: number;
  size: number;
  color: number;
  alpha: number;
}

interface DiveStreakEffect {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
}

interface WaveDashShockwave {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
}

export class QuantumEffectsManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private vortexParticles: VortexParticle[] = [];
  private diveStreaks: DiveStreakEffect[] = [];
  private waveDashRings: WaveDashShockwave[] = [];
  private maxParticles = 24;
  private reducedParticles = 6;

  private isReducedEffects = false;
  private isAutoThrottleActive = false;
  private lowFpsCounter = 0;
  private normalFpsCounter = 0;
  private unsubStore: (() => void) | null = null;
  private unsubEvents: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create graphics pipeline with additive blending for quantum luminescence
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
    this.graphics.setBlendMode(Phaser.BlendModes.ADD);

    // Initial state from store
    this.isReducedEffects = useGameStore.getState().reducedEffects ?? false;
    this.unsubStore = useGameStore.subscribe((state) => {
      this.isReducedEffects = state.reducedEffects;
    });

    this.unsubEvents.push(
      gameEvents.on('hero:dive', ({ x, y }) => {
        this.diveStreaks.push({ x, y, elapsedMs: 0, durationMs: 180 });
      }),
      gameEvents.on('hero:wavedash', ({ x, y }) => {
        this.waveDashRings.push({ x, y, elapsedMs: 0, durationMs: 240 });
      })
    );

    this.initVortexParticles();
  }

  private initVortexParticles(): void {
    this.vortexParticles = [];
    const colors = [0x00e5ff, 0x80d8ff, 0xff00e5, 0xffeb3b, 0xffffff];

    for (let i = 0; i < this.maxParticles; i++) {
      this.vortexParticles.push({
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        radius: Phaser.Math.FloatBetween(15, 85),
        speed: Phaser.Math.FloatBetween(0.4, 1.2),
        angularSpeed: Phaser.Math.FloatBetween(0.03, 0.07),
        size: Phaser.Math.FloatBetween(1.5, 3.2),
        color: colors[i % colors.length],
        alpha: Phaser.Math.FloatBetween(0.4, 0.9)
      });
    }
  }

  public getIsReduced(): boolean {
    return this.isReducedEffects || this.isAutoThrottleActive;
  }

  public getIsAutoThrottled(): boolean {
    return this.isAutoThrottleActive;
  }

  public setReducedEffects(reduced: boolean): void {
    this.isReducedEffects = reduced;
  }

  /**
   * Monitor frame rate performance and automatically activate reduced effects
   * if FPS drops below 50 FPS for several consecutive frames.
   */
  private checkPerformance(): void {
    const fps = this.scene.game?.loop?.actualFps ?? 60;
    if (fps > 0 && fps < 50) {
      this.lowFpsCounter++;
      this.normalFpsCounter = 0;
      if (this.lowFpsCounter > 60 && !this.isAutoThrottleActive) {
        this.isAutoThrottleActive = true;
      }
    } else if (fps >= 56) {
      this.normalFpsCounter++;
      this.lowFpsCounter = 0;
      if (this.normalFpsCounter > 90 && this.isAutoThrottleActive) {
        this.isAutoThrottleActive = false;
      }
    }
  }

  /**
   * Main render loop called from Scene update
   */
  public update(
    time: number,
    delta: number,
    heroes: Hero[],
    portal?: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
    isTimeDilationActive = false,
    coherence = 0
  ): void {
    this.checkPerformance();
    this.graphics.clear();

    const isReduced = this.getIsReduced();

    // 1. Render de Broglie Probability Waves, Spectral Coherence Trail & Time Dilation Trail
    this.renderDeBroglieWaves(time, heroes, isReduced, isTimeDilationActive, coherence);

    // 2. Render Dive Energy Lines & Wave-Dash Landing Shockwaves
    this.renderDiveAndWaveDashVfx(delta, isReduced);

    // 3. Render Spacetime Distortion and Vortex Particles at portal
    if (portal?.active) {
      this.renderSpacetimeDistortion(time, delta, portal, isReduced);
    }
  }

  private renderDiveAndWaveDashVfx(delta: number, isReduced: boolean): void {
    const dtMs = Math.max(0, delta);

    for (let i = this.diveStreaks.length - 1; i >= 0; i--) {
      const fx = this.diveStreaks[i];
      fx.elapsedMs += dtMs;
      if (fx.elapsedMs >= fx.durationMs) {
        this.diveStreaks.splice(i, 1);
        continue;
      }
      const progress = fx.elapsedMs / fx.durationMs;
      const alpha = (1 - progress) * 0.85;
      const len = 34 + progress * 36;
      this.graphics.lineStyle(isReduced ? 2 : 3.5, 0x00e5ff, alpha);
      this.graphics.lineBetween(fx.x, fx.y - 12, fx.x, fx.y + len);
      if (!isReduced) {
        this.graphics.lineStyle(1.5, 0xffffff, alpha * 0.9);
        this.graphics.lineBetween(fx.x - 10, fx.y, fx.x - 10, fx.y + len * 0.7);
        this.graphics.lineBetween(fx.x + 10, fx.y, fx.x + 10, fx.y + len * 0.7);
      }
    }

    for (let i = this.waveDashRings.length - 1; i >= 0; i--) {
      const ring = this.waveDashRings[i];
      ring.elapsedMs += dtMs;
      if (ring.elapsedMs >= ring.durationMs) {
        this.waveDashRings.splice(i, 1);
        continue;
      }
      const progress = ring.elapsedMs / ring.durationMs;
      const alpha = (1 - progress) * 0.9;
      const radiusX = 18 + progress * 54;
      const radiusY = 8 + progress * 20;
      this.graphics.lineStyle(isReduced ? 2 : 3, 0x00ffcc, alpha);
      this.graphics.strokeEllipse(ring.x, ring.y + 16, radiusX * 2, radiusY * 2);
      if (!isReduced) {
        this.graphics.lineStyle(1.5, 0xfbbf24, alpha * 0.85);
        this.graphics.strokeCircle(ring.x, ring.y + 14, 14 + progress * 38);
      }
    }
  }

  /**
   * Render concentric de Broglie matter waves and spectral coherence trail when heroes move.
   */
  private renderDeBroglieWaves(
    time: number,
    heroes: Hero[],
    isReduced: boolean,
    isTimeDilationActive = false,
    coherence = 0
  ): void {
    const clampedCoherence = Math.max(0, Math.min(1, coherence));

    if (isReduced) {
      // Lightweight single-ring spectral indicator in FX:LO mode for x3 / HYPER
      if (clampedCoherence >= 0.55) {
        const ringColor = clampedCoherence >= 0.85 ? 0xfbbf24 : 0xc084fc;
        const ringAlpha = clampedCoherence >= 0.85 ? 0.55 : 0.35;
        for (const hero of heroes) {
          if (!hero || !hero.active) continue;
          this.graphics.lineStyle(2, ringColor, ringAlpha);
          this.graphics.strokeCircle(hero.x, hero.y, 22);
        }
      }
      return;
    }

    for (const hero of heroes) {
      if (!hero || !hero.active || !hero.body) continue;
      const vx = hero.body.velocity.x;
      const vy = hero.body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Render spectral luminous coherence trail behind moving hero (scales with coherence)
      if (clampedCoherence > 0.05 && speed >= 15) {
        const isHyper = clampedCoherence >= 0.85;
        const isX3 = clampedCoherence >= 0.55;
        const spectralPalette = isHyper
          ? [0xfbbf24, 0x00e5ff, 0xe879f9, 0x34d399]
          : isX3
            ? [0xc084fc, 0xe879f9, 0x00e5ff]
            : clampedCoherence >= 0.25
              ? [0x00ffcc, 0x00e5ff]
              : [0x38bdf8];
        const segments = isHyper
          ? 8
          : isX3
            ? 6
            : Math.max(2, Math.min(5, Math.round(2 + clampedCoherence * 4)));
        const baseAlpha = isHyper ? 0.5 : isX3 ? 0.36 : 0.16 + clampedCoherence * 0.22;

        for (let t = 1; t <= segments; t++) {
          const factor = 0.014 * t * (1 + clampedCoherence * 0.55);
          const trailX = hero.x - vx * factor;
          const trailY = hero.y - vy * factor;
          const color = spectralPalette[(t - 1) % spectralPalette.length];
          const segAlpha = (baseAlpha * (1 - (t - 1) / (segments + 1))) / (t === 1 ? 1 : 1.12);
          const radius = Math.max(3, 13 + clampedCoherence * 6 - t * 1.4);

          this.graphics.fillStyle(color, segAlpha);
          this.graphics.fillCircle(trailX, trailY, radius);
        }

        // Enhanced spectral halo in x3 / HYPER tiers
        if (isX3) {
          const pulse = Math.sin(time * (isHyper ? 0.014 : 0.009));
          const haloColor = isHyper ? 0xfbbf24 : 0xc084fc;
          const haloRadius = (isHyper ? 26 : 23) + pulse * 3;
          this.graphics.lineStyle(isHyper ? 2.5 : 1.8, haloColor, isHyper ? 0.65 : 0.42);
          this.graphics.strokeCircle(hero.x, hero.y, haloRadius);
          if (isHyper) {
            this.graphics.lineStyle(1.5, 0x00e5ff, 0.45);
            this.graphics.strokeCircle(hero.x, hero.y, haloRadius + 6 - pulse * 2);
          }
        }
      }

      // Render cyan afterglow trail under Time Dilation
      if (isTimeDilationActive && speed >= 10) {
        for (let t = 1; t <= 3; t++) {
          const trailX = hero.x - vx * 0.016 * t * 1.6;
          const trailY = hero.y - vy * 0.016 * t * 1.6;
          this.graphics.fillStyle(0x00ffff, 0.22 / t);
          this.graphics.fillCircle(trailX, trailY, 15 - t * 2.5);
        }
      }

      // Hero moving at normal gameplay speeds emits visible quantum de Broglie aura
      if (speed >= 15) {
        const baseColor = hero.isFocused ? 0x00e5ff : 0xbd00ff;
        const pulse = Math.sin(time * 0.007);
        const auraRadius = 18 + Math.min(speed / 15, 6) + pulse * 2;
        const alpha = Math.min(0.38, 0.2 + (speed / 300) * 0.18);

        // Core quantum aura
        this.graphics.lineStyle(1.5, baseColor, alpha);
        this.graphics.strokeCircle(hero.x, hero.y, auraRadius);

        // Motion propagation ripple when moving fast enough
        if (speed > 40) {
          const ripplePhase = (time * 0.04 + speed * 0.015) % 18;
          const rippleRadius = auraRadius + ripplePhase;
          const rippleAlpha = Math.max(0, (1 - ripplePhase / 18) * 0.28);
          if (rippleAlpha > 0.02) {
            this.graphics.lineStyle(1.0, baseColor, rippleAlpha);
            this.graphics.strokeCircle(hero.x, hero.y, rippleRadius);
          }
        }
      }
    }
  }

  /**
   * Render Spacetime Distortion Vortex & Inward Quantum Particle Inflow around Portal
   */
  private renderSpacetimeDistortion(
    time: number,
    delta: number,
    portal: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
    isReduced: boolean
  ): void {
    const portalCenterX = portal.x;
    const portalCenterY = portal.y;

    // 1. Spacetime curvature distortion rings (Kerr gravitational lensing)
    const distortionRings = isReduced ? 2 : 4;
    for (let r = 0; r < distortionRings; r++) {
      const angleOffset = time * 0.0018 * (r % 2 === 0 ? 1 : -1) + r * 1.2;
      const ringRadius = 24 + r * 16 + Math.sin(time * 0.003 + r) * 3;
      const ringAlpha = (0.35 - r * 0.06) * (isReduced ? 0.6 : 1);
      const ringColor = r % 2 === 0 ? 0x00e5ff : 0xe040fb;

      this.graphics.lineStyle(1.6, ringColor, ringAlpha);
      this.graphics.strokeEllipse(
        portalCenterX,
        portalCenterY,
        ringRadius * 1.4,
        ringRadius * 0.85
      );

      // Rotating accretion spiral hint
      if (!isReduced) {
        const spiralX = portalCenterX + Math.cos(angleOffset) * ringRadius;
        const spiralY = portalCenterY + Math.sin(angleOffset) * (ringRadius * 0.65);
        this.graphics.fillStyle(0xffffff, ringAlpha * 1.2);
        this.graphics.fillCircle(spiralX, spiralY, 2.2);
      }
    }

    // 2. Inward Spiraling Quantum Particles (Gravity well suction)
    const activeCount = isReduced ? this.reducedParticles : this.maxParticles;
    const stepMultiplier = Math.min(delta / 16.6, 2.5);

    for (let i = 0; i < activeCount; i++) {
      const p = this.vortexParticles[i];

      // Inward radial acceleration: particles accelerate as they near the singularity center
      const radialAccel = 1 + 25 / (p.radius + 6);
      p.radius -= p.speed * stepMultiplier * radialAccel;

      // Angular acceleration (Coriolis vortex effect)
      const angularAccel = 1 + 18 / (p.radius + 5);
      p.angle += p.angularSpeed * stepMultiplier * angularAccel;

      // Recycle particles when swallowed into portal horizon
      if (p.radius < 6) {
        p.radius = Phaser.Math.FloatBetween(65, 88);
        p.angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      }

      // Elliptical perspective projection around portal
      const px = portalCenterX + Math.cos(p.angle) * p.radius;
      const py = portalCenterY + Math.sin(p.angle) * (p.radius * 0.68);

      // Particle brightness increases as it accelerates near the center
      const proximityGlow = Math.min(1, 1 - p.radius / 90);
      const currentAlpha = p.alpha * (0.3 + proximityGlow * 0.7);

      this.graphics.fillStyle(p.color, currentAlpha);
      this.graphics.fillCircle(px, py, p.size * (0.8 + proximityGlow * 0.5));

      // Draw faint accretion streak connecting toward center
      if (!isReduced && p.radius < 45) {
        const streakX = portalCenterX + Math.cos(p.angle - 0.15) * (p.radius + 4);
        const streakY = portalCenterY + Math.sin(p.angle - 0.15) * ((p.radius + 4) * 0.68);
        this.graphics.lineStyle(1, p.color, currentAlpha * 0.4);
        this.graphics.lineBetween(px, py, streakX, streakY);
      }
    }
  }

  /**
   * Clean up graphics object and subscriptions
   */
  public destroy(): void {
    if (this.unsubStore) {
      this.unsubStore();
      this.unsubStore = null;
    }
    for (const unsub of this.unsubEvents) {
      unsub();
    }
    this.unsubEvents = [];
    if (this.graphics) {
      this.graphics.destroy();
    }
    this.vortexParticles = [];
    this.diveStreaks = [];
    this.waveDashRings = [];
  }
}

export default QuantumEffectsManager;
