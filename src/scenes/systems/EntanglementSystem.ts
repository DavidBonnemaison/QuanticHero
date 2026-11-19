import type Phaser from 'phaser';
import { PHYSICS } from '../../physics/constants';
import {
  findHookedTetherPylon,
  getScreenWrapAxes,
  isParticleSweptByTether,
  resolveTetherPylonConstraint
} from '../../physics/entanglementTether';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import type { ParticleType } from '../../types';
import type Hero from '../Hero';
import type { GameSceneContext } from './types';

/**
 * Handles quantum entanglement gameplay: synchronized dual/single portal arrivals
 * (with Bell Sync detection), physical tether pulley & lasso particle sweep,
 * animated laser beam rendering, magnetic tether pylons, and boundary checks.
 */
export class EntanglementSystem {
  constructor(private readonly ctx: GameSceneContext) {}

  public handleEntangledPortalArrival(
    hero: Hero,
    portal: Phaser.Physics.Arcade.Sprite,
    isBetaPortal: boolean
  ): void {
    const ctx = this.ctx;
    if (hero.enteredPortal || ctx.isLevelCompleted) return;

    const entanglement = ctx.levelData.entanglement;
    const isDual = entanglement?.portalMode === 'dual' || Boolean(entanglement?.betaDoor);

    if (isDual) {
      if (hero.isBeta && !isBetaPortal) return;
      if (!hero.isBeta && isBetaPortal) return;
    }

    hero.enteredPortal = true;
    if (hero.body) {
      (hero.body as Phaser.Physics.Arcade.Body).enable = false;
      hero.setVelocity(0, 0);
    }
    hero.setPosition(portal.x + 48, portal.y + 96);
    hero.setAlpha(0.7);

    const nowMs = ctx.time?.now ?? Date.now();
    if (hero.isBeta) {
      ctx.betaEnteredPortal = true;
      ctx.betaArrivalTimeMs = nowMs;
    } else {
      ctx.alphaEnteredPortal = true;
      ctx.alphaArrivalTimeMs = nowMs;
    }

    gameEvents.emit('hero:portal_docked', { isBeta: hero.isBeta });

    if (ctx.alphaArrivalTimeMs !== null && ctx.betaArrivalTimeMs !== null) {
      const deltaMs = Math.abs(ctx.alphaArrivalTimeMs - ctx.betaArrivalTimeMs);
      if (deltaMs <= 50) {
        const levelNum = Number(ctx.levelData.id);
        gameEvents.emit('bell:violation', { level: levelNum, deltaMs });
        if (!Number.isNaN(levelNum) && levelNum > 0) {
          useGameStore.getState().unlockBellSync(levelNum);
        }
        ctx.cameras?.main?.flash?.(400, 255, 215, 0, false);
        ctx.showRetroToast("BELL SYNC ! (ISOTOPE D'OR)");
      }
    }

    if (ctx.alphaEnteredPortal && ctx.betaEnteredPortal) {
      ctx.time.delayedCall(120, () => {
        ctx.completeLevel();
      });
    }
  }

  public updateEntanglementFrame(time: number): boolean {
    const ctx = this.ctx;
    if (!ctx.isEntangled) return false;

    const wrapAxes = getScreenWrapAxes(ctx.levelData.screenWrap);
    for (const h of ctx.heroes) {
      if (h.active && !h.enteredPortal) {
        const outY = !wrapAxes.vertical && (h.y > ctx.levelData.height + 60 || h.y < -60);
        const outX = !wrapAxes.horizontal && (h.x < -60 || h.x > ctx.levelData.width + 60);
        if (outY || outX) {
          ctx.killHero(h);
          return true;
        }
      }
    }
    this.updateEntanglementTether(time);
    this.drawEntanglementBeam(time);
    return false;
  }

  public updateEntanglementTether(_time: number): void {
    const ctx = this.ctx;
    if (!ctx.isEntangled) return;
    const alpha = ctx.heroes.find((h) => !h.isBeta && h.active);
    const beta = ctx.heroes.find((h) => h.isBeta && h.active);
    if (!alpha || !beta) return;

    const tetherEnabled = ctx.levelData.entanglement?.tetherPhysical !== false;

    const pylons = ctx.levelData.tetherPylons;
    if (pylons && pylons.length > 0) {
      if (!ctx.hookedTetherPylon) {
        const found = findHookedTetherPylon(alpha, beta, pylons);
        if (found) {
          ctx.hookedTetherPylon = found;
          gameEvents.emit('tether:pylon_hook', { x: found.x, y: found.y });
        }
      }

      if (ctx.hookedTetherPylon) {
        const maxLen =
          ctx.hookedTetherPylon.maxLength ??
          ctx.levelData.entanglement?.tetherMaxLength ??
          PHYSICS.TETHER_DEFAULT_MAX_LENGTH;
        const betaBody = beta.body as Phaser.Physics.Arcade.Body | null;
        const betaVel = betaBody?.velocity ?? { x: 0, y: 0 };
        const constraint = resolveTetherPylonConstraint(
          alpha,
          beta,
          betaVel,
          ctx.hookedTetherPylon,
          maxLen
        );
        if (constraint.constrained) {
          beta.x = constraint.betaPos.x;
          beta.y = constraint.betaPos.y;
          if (betaBody) {
            beta.setVelocity(constraint.betaVel.x, constraint.betaVel.y);
          }
        }
      }
    }

    if (tetherEnabled && ctx.particles?.getChildren) {
      for (const child of ctx.particles.getChildren()) {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (!sprite.active) continue;
        const swept = ctx.hookedTetherPylon
          ? isParticleSweptByTether(sprite, alpha, ctx.hookedTetherPylon) ||
            isParticleSweptByTether(sprite, ctx.hookedTetherPylon, beta)
          : isParticleSweptByTether(sprite, alpha, beta);
        if (swept) {
          const sx = sprite.x;
          const sy = sprite.y;
          const pType = sprite.getData('type') as ParticleType;
          ctx.collectParticle(alpha, sprite);
          this.spawnTetherSweepSparks(sx, sy, alpha, beta);
          gameEvents.emit('tether:collect', { x: sx, y: sy, type: pType });
        }
      }
    }
  }

  public drawTetherPylons(): void {
    const ctx = this.ctx;
    if (!ctx.tetherPylonGraphics || !ctx.levelData.tetherPylons) return;
    const g = ctx.tetherPylonGraphics;
    g.clear();
    for (const pylon of ctx.levelData.tetherPylons) {
      g.fillStyle(0x0f172a, 0.9);
      g.fillCircle(pylon.x, pylon.y, pylon.radius);
      g.lineStyle(2.5, 0x22d3ee, 0.95);
      g.strokeCircle(pylon.x, pylon.y, pylon.radius);
      g.fillStyle(0xec4899, 0.9);
      g.fillCircle(pylon.x, pylon.y, Math.max(4, pylon.radius * 0.35));
    }
  }

  public drawEntanglementBeam(time: number): void {
    const ctx = this.ctx;
    if (!ctx.entanglementGraphics) return;
    ctx.entanglementGraphics.clear();

    const alpha = ctx.heroes.find((h) => !h.isBeta);
    const beta = ctx.heroes.find((h) => h.isBeta);
    if (!alpha || !beta || !alpha.active || !beta.active) return;

    if (ctx.hookedTetherPylon) {
      this.drawBeamSegment(
        alpha.x,
        alpha.y,
        ctx.hookedTetherPylon.x,
        ctx.hookedTetherPylon.y,
        time
      );
      this.drawBeamSegment(ctx.hookedTetherPylon.x, ctx.hookedTetherPylon.y, beta.x, beta.y, time);
      ctx.entanglementGraphics.lineStyle(2.5, 0x00e5ff, 0.9);
      ctx.entanglementGraphics.strokeCircle(
        ctx.hookedTetherPylon.x,
        ctx.hookedTetherPylon.y,
        ctx.hookedTetherPylon.radius + 4
      );
    } else {
      this.drawBeamSegment(alpha.x, alpha.y, beta.x, beta.y, time);
    }
  }

  private drawBeamSegment(ax: number, ay: number, bx: number, by: number, time: number): void {
    const g = this.ctx.entanglementGraphics;
    if (!g) return;
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) return;

    const nx = -dy / dist;
    const ny = dx / dist;

    const isReduced = useGameStore.getState().reducedEffects;
    if (isReduced) {
      const pulse = 0.5 + 0.3 * Math.sin(time * 0.006);
      g.lineStyle(3, 0x00ffff, pulse);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();

      g.lineStyle(1.5, 0xec4899, pulse * 0.8);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
      return;
    }

    const steps = Math.max(24, Math.min(80, Math.floor(dist / 12)));
    const waveSpeed = time * 0.009;
    const waveFreq = 0.035;
    const baseAmp = 8 + 4 * Math.sin(time * 0.004);

    g.lineStyle(5, 0xec4899, 0.4);
    g.beginPath();
    g.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset = Math.sin(t * dist * waveFreq - waveSpeed) * baseAmp * env;
      g.lineTo(ax + dx * t + nx * offset, ay + dy * t + ny * offset);
    }
    g.strokePath();

    g.lineStyle(3, 0x00e5ff, 0.7);
    g.beginPath();
    g.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset =
        Math.sin(t * dist * waveFreq - waveSpeed + Math.PI / 4) * (baseAmp * 0.75) * env;
      g.lineTo(ax + dx * t + nx * offset, ay + dy * t + ny * offset);
    }
    g.strokePath();

    g.lineStyle(1.5, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset = Math.sin(t * dist * waveFreq - waveSpeed) * (baseAmp * 0.5) * env;
      g.lineTo(ax + dx * t + nx * offset, ay + dy * t + ny * offset);
    }
    g.strokePath();
  }

  private spawnTetherSweepSparks(
    px: number,
    py: number,
    alpha: { x: number; y: number },
    beta: { x: number; y: number }
  ): void {
    const ctx = this.ctx;
    if (!ctx.add?.circle || !ctx.tweens?.add) return;
    const targets = [
      { x: alpha.x, y: alpha.y, color: 0x00e5ff },
      { x: beta.x, y: beta.y, color: 0xec4899 }
    ];
    for (const target of targets) {
      for (let i = 0; i < 4; i++) {
        const spark = ctx.add.circle(px, py, 3, target.color, 0.95);
        spark.setDepth(23);
        ctx.tweens.add({
          targets: spark,
          x: target.x,
          y: target.y,
          alpha: 0,
          scale: 0.3,
          duration: 180 + i * 35,
          ease: 'Quad.easeOut',
          onComplete: () => spark.destroy()
        });
      }
    }
  }
}
