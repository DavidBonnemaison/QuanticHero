import Phaser from 'phaser';
import { useGameStore } from '../../store';
import { decompressTrajectory } from '../../tools/GhostRecorder';
import { gameEvents } from '../../tools/gameEvents';
import type Hero from '../Hero';
import type { GameSceneContext } from './types';

/**
 * Handles campaign set-pieces (Iron Core Collapse Z=26, Supernova Shockwave Z=27,
 * Oganesson Constellation & Periodic Table Silhouette Z=118) as well as reactive
 * platform/impact effects (cracked shatter, ephemeral cage, synth flexion, Pauli flash).
 */
export class SetPieceController {
  constructor(private readonly ctx: GameSceneContext) {}

  public shatterCrackedPlatform(plat: Phaser.GameObjects.Rectangle): void {
    const ctx = this.ctx;
    if (!plat.active) return;
    const body = plat.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.checkCollision.none = true;
      body.enable = false;
    }
    plat.setAlpha(0);
    plat.setVisible(false);
    gameEvents.emit('platform:cracked_break', { x: plat.x, y: plat.y });

    if (ctx.add?.circle && ctx.tweens?.add) {
      for (let i = 0; i < 6; i++) {
        const shard = ctx.add.circle(plat.x + (i - 2.5) * 10, plat.y, 4, 0xfbbf24, 0.95);
        shard.setDepth(21);
        ctx.tweens.add({
          targets: shard,
          x: shard.x + (i - 2.5) * 18,
          y: shard.y + 28 + (i % 2) * 16,
          alpha: 0,
          duration: 240,
          ease: 'Quad.easeOut',
          onComplete: () => shard.destroy()
        });
      }
    }
  }

  public vanishEphemeralPlatform(plat: Phaser.GameObjects.Rectangle): void {
    if (!plat.visible) return;
    const body = plat.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.checkCollision.none = true;
      body.enable = false;
    }
    plat.setAlpha(0);
    plat.setVisible(false);
    gameEvents.emit('platform:ephemeral_vanish', { x: plat.x, y: plat.y });
  }

  public restoreEphemeralPlatforms(): number {
    let restoredCount = 0;
    for (const ep of this.ctx.ephemeralPlatforms) {
      if (!ep.visible || ep.alpha === 0) {
        restoredCount++;
      }
      ep.setAlpha(1);
      ep.setVisible(true);
      const body = ep.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = false;
        body.enable = true;
        body.updateFromGameObject?.();
      }
    }
    if (restoredCount > 0) {
      gameEvents.emit('platform:ephemeral_restore', { count: restoredCount });
    }
    return restoredCount;
  }

  public triggerIronCoreCollapse(): void {
    const ctx = this.ctx;
    ctx.cameras?.main?.flash?.(150, 255, 255, 255, false);
    if (ctx.collapseTopSpikes && ctx.collapseBottomSpikes) {
      const midY = ctx.levelData.height / 2;
      if (ctx.tweens?.add) {
        ctx.tweens.add({
          targets: ctx.collapseTopSpikes,
          y: midY - 40,
          duration: 140,
          ease: 'Cubic.easeIn'
        });
        ctx.tweens.add({
          targets: ctx.collapseBottomSpikes,
          y: midY + 40,
          duration: 140,
          ease: 'Cubic.easeIn'
        });
      }
    }
    gameEvents.emit('wow:iron_collapse', { level: 26 });
  }

  public triggerSupernovaShockwave(): void {
    const ctx = this.ctx;
    const hero = ctx.heroes[0];
    const cx = hero ? hero.x : ctx.levelData.player.position.x;
    const cy = hero ? hero.y : ctx.levelData.player.position.y;

    if (ctx.add?.circle && ctx.tweens?.add) {
      const ring = ctx.add.circle(cx, cy, 24, 0x3b82f6, 0.35);
      ring.setStrokeStyle(4, 0xfbbf24, 0.95);
      ring.setDepth(30);
      ctx.tweens.add({
        targets: ring,
        scaleX: 28,
        scaleY: 28,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      const platChildren =
        (
          ctx.platforms as unknown as { getChildren?: () => Phaser.GameObjects.Rectangle[] }
        )?.getChildren?.() ?? [];
      for (const plat of platChildren) {
        if (!plat) continue;
        plat.setAlpha(0);
        plat.setScale(0.85, 0.85);
        ctx.tweens.add({
          targets: plat,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 380,
          ease: 'Back.easeOut'
        });
      }
    }
    if (ctx.shakeCamera) {
      ctx.shakeCamera(280, 0.014);
    } else if (!useGameStore.getState().reducedEffects) {
      ctx.cameras?.main?.shake?.(280, 0.014);
    }
    gameEvents.emit('wow:supernova_shockwave', { level: 27 });
  }

  public renderOganessonConstellation(): void {
    const ctx = this.ctx;
    if (!ctx.add?.graphics) return;
    if (ctx.constellationGraphics) {
      ctx.constellationGraphics.destroy();
    }
    const g = ctx.add.graphics();
    g.setDepth(2);
    g.setScrollFactor(0.5);
    g.setAlpha(0.25);
    ctx.constellationGraphics = g;

    const scores = useGameStore.getState().scores;
    const colors = [0x00e5ff, 0xfbbf24, 0xec4899, 0x38bdf8, 0xa855f7];
    let colorIdx = 0;

    for (let z = 1; z < 118; z++) {
      const raw = scores[z]?.ghostTrajectory;
      if (!raw) continue;
      const frames = decompressTrajectory(raw);
      if (frames.length < 2) continue;

      g.lineStyle(2, colors[colorIdx % colors.length], 0.85);
      colorIdx++;
      g.beginPath();
      g.moveTo(frames[0].x, frames[0].y);
      for (let i = 1; i < frames.length; i += 2) {
        g.lineTo(frames[i].x, frames[i].y);
      }
      g.strokePath();
    }
  }

  public revealPeriodicTableSilhouette(): void {
    const ctx = this.ctx;
    if (ctx.cameras?.main) {
      const cam = ctx.cameras.main as unknown as {
        zoomTo?: (zoom: number, duration?: number, ease?: string) => void;
        setZoom: (zoom: number) => void;
      };
      if (typeof cam.zoomTo === 'function') {
        cam.zoomTo(0.35, 1200, 'Sine.easeInOut');
      } else {
        cam.setZoom(0.35);
      }
    }

    if (ctx.add?.graphics) {
      if (ctx.periodicTableGraphics) {
        ctx.periodicTableGraphics.destroy();
      }
      const g = ctx.add.graphics();
      g.setDepth(3);
      g.setScrollFactor(0.2);
      ctx.periodicTableGraphics = g;

      const startX = 120;
      const startY = 80;
      const cellW = 28;
      const cellH = 28;
      const gap = 4;

      g.lineStyle(1.5, 0x38bdf8, 0.65);
      g.fillStyle(0x00e5ff, 0.16);

      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 18; col++) {
          const skipRow0 = row === 0 && col > 0 && col < 17;
          const skipRow12 = (row === 1 || row === 2) && col > 1 && col < 12;
          if (skipRow0 || skipRow12) continue;
          const x = startX + col * (cellW + gap);
          const y = startY + row * (cellH + gap);
          g.fillRect(x, y, cellW, cellH);
          g.strokeRect(x, y, cellW, cellH);
        }
      }
    }

    gameEvents.emit('wow:oganesson_constellation', { level: 118 });
  }

  public triggerSynthPlatformImpact(
    hero: Hero,
    plat: Phaser.GameObjects.Rectangle,
    isStatic: boolean
  ): void {
    const ctx = this.ctx;
    if (!plat.active) return;
    gameEvents.emit('synth:land', { x: hero.x, y: hero.y });

    if (isStatic && plat.getData('kind') !== 'wall') {
      const baseY = (plat.getData('baseY') as number | undefined) ?? plat.y;
      if (!plat.getData('synthTweenActive')) {
        plat.setData('synthTweenActive', true);
        plat.y = baseY;
        ctx.tweens.add({
          targets: plat,
          y: baseY + 3 * hero.upsideDown,
          duration: 80,
          yoyo: true,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (plat.active) {
              plat.y = baseY;
              plat.setData('synthTweenActive', false);
            }
          }
        });
      }
    }

    const halfW = plat.width / 2;
    const leftX = plat.x - halfW;
    const rightX = plat.x + halfW;
    const impactX = Phaser.Math.Clamp(hero.x, leftX, rightX);
    const impactY = hero.upsideDown === 1 ? plat.y - plat.height / 2 : plat.y + plat.height / 2;

    const leftWave = ctx.add.rectangle(impactX, impactY, 6, 3, 0xffffff, 0.95);
    leftWave.setDepth(14);
    ctx.tweens.add({
      targets: leftWave,
      x: leftX,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => leftWave.destroy()
    });

    const rightWave = ctx.add.rectangle(impactX, impactY, 6, 3, 0xffffff, 0.95);
    rightWave.setDepth(14);
    ctx.tweens.add({
      targets: rightWave,
      x: rightX,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => rightWave.destroy()
    });
  }

  public drawPauliFlash(x1: number, y1: number, x2: number, y2: number): void {
    const ctx = this.ctx;
    if (!ctx.pauliGraphics) {
      ctx.pauliGraphics = ctx.add.graphics();
      ctx.pauliGraphics.setDepth(25);
    }
    const g = ctx.pauliGraphics;
    g.clear();
    g.lineStyle(3, 0xffeb3b, 1.0);
    const midX = (x1 + x2) / 2 + (Math.random() * 20 - 10);
    const midY = (y1 + y2) / 2 + (Math.random() * 20 - 10);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(midX, midY);
    g.lineTo(x2, y2);
    g.strokePath();

    ctx.time.delayedCall(150, () => {
      g.clear();
    });
  }
}
