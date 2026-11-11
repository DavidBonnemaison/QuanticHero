import Phaser from 'phaser';
import type Hero from '../scenes/Hero';
import { useGameStore } from '../store';

export interface VortexParticle {
  angle: number;
  radius: number;
  speed: number;
  angularSpeed: number;
  size: number;
  color: number;
  alpha: number;
}

export class QuantumEffectsManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private vortexParticles: VortexParticle[] = [];
  private maxParticles = 24;
  private reducedParticles = 6;

  private isReducedEffects = false;
  private isAutoThrottleActive = false;
  private lowFpsCounter = 0;
  private normalFpsCounter = 0;
  private unsubStore: (() => void) | null = null;

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
    portal?: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite
  ): void {
    this.checkPerformance();
    this.graphics.clear();

    const isReduced = this.getIsReduced();

    // 1. Render de Broglie Probability Waves around moving heroes
    this.renderDeBroglieWaves(time, heroes, isReduced);

    // 2. Render Spacetime Distortion and Vortex Particles at portal
    if (portal?.active) {
      this.renderSpacetimeDistortion(time, delta, portal, isReduced);
    }
  }

  /**
   * Render concentric de Broglie matter waves when heroes move,
   * with constructive/destructive quantum interference patterns when multiple clones interact.
   */
  private renderDeBroglieWaves(time: number, heroes: Hero[], isReduced: boolean): void {
    const movingHeroes: Hero[] = [];
    const maxRadius = isReduced ? 50 : 75;
    const ringCount = isReduced ? 2 : 4;

    for (const hero of heroes) {
      if (!hero || !hero.active || !hero.body) continue;
      const vx = hero.body.velocity.x;
      const vy = hero.body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Hero moving faster than threshold emits probability waves
      if (speed > 15) {
        movingHeroes.push(hero);
        const baseColor = hero.isFocused ? 0x00e5ff : 0xbd00ff;

        for (let i = 0; i < ringCount; i++) {
          // Dynamic radius pulsing with wave propagation
          const wavePhase = (time * 0.06 + i * (maxRadius / ringCount)) % maxRadius;
          const currentRadius = 10 + wavePhase;
          const radiusRatio = wavePhase / maxRadius;

          // Sinusoidal probability wave amplitude
          const waveOscillation = Math.sin(time * 0.007 - currentRadius * 0.12);
          const alpha = Math.max(0, (1 - radiusRatio) * 0.45 * (0.6 + 0.4 * waveOscillation));

          if (alpha > 0.02) {
            this.graphics.lineStyle(1.8 * (1 - radiusRatio * 0.5), baseColor, alpha);
            this.graphics.strokeCircle(hero.x, hero.y, currentRadius);
          }
        }
      }
    }

    // Interference Patterns between quantum clones
    if (!isReduced && movingHeroes.length >= 2) {
      for (let i = 0; i < movingHeroes.length; i++) {
        for (let j = i + 1; j < movingHeroes.length; j++) {
          const h1 = movingHeroes[i];
          const h2 = movingHeroes[j];

          const dx = h2.x - h1.x;
          const dy = h2.y - h1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Interaction zone when wave fields overlap
          if (dist > 10 && dist < maxRadius * 2) {
            const midX = (h1.x + h2.x) / 2;
            const midY = (h1.y + h2.y) / 2;

            // de Broglie optical path difference interference: I = cos^2(pi * d / lambda)
            const lambda = 36;
            const pathDiff = (dist % lambda) / lambda;
            const interferenceFactor = Math.cos(Math.PI * pathDiff) ** 2;

            // Constructive interference (bright white/cyan fringe)
            if (interferenceFactor > 0.55) {
              const fringeAlpha = (interferenceFactor - 0.5) * 1.6 * (1 - dist / (maxRadius * 2));
              this.graphics.lineStyle(2.5, 0xffffff, Math.min(0.9, fringeAlpha));
              this.graphics.strokeCircle(midX, midY, 14 + interferenceFactor * 12);

              // Cross-tint bridge connecting the clones
              this.graphics.lineStyle(1.2, 0x00ffff, fringeAlpha * 0.7);
              this.graphics.lineBetween(h1.x, h1.y, h2.x, h2.y);
            } else {
              // Destructive interference (darker faded purple attenuation)
              const nodeAlpha = (0.5 - interferenceFactor) * 0.4;
              this.graphics.lineStyle(1, 0x4a148c, nodeAlpha);
              this.graphics.strokeCircle(midX, midY, 8);
            }
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
    if (this.graphics) {
      this.graphics.destroy();
    }
    this.vortexParticles = [];
  }
}

export default QuantumEffectsManager;
