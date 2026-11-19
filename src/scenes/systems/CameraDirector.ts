import Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import { computeLookAheadOffset } from '../../physics/stepHeroPhysics';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import type Hero from '../Hero';
import type { HudController } from './HudController';
import type { GameSceneContext } from './types';

/**
 * Directs camera framing, predictive Look-Ahead, dynamic multi-hero / entangled
 * zoom & reveal-at-X zoom-out, viewport resize handling, focus switching,
 * screen-shake, and camera flashes.
 */
export class CameraDirector {
  constructor(
    private readonly ctx: GameSceneContext,
    private readonly hudController: HudController
  ) {}

  public setupInitialFraming(initialHero: Hero): void {
    const ctx = this.ctx;
    const entanglement = ctx.levelData.entanglement;

    if (entanglement && ctx.betaHero) {
      if (entanglement.revealAtX !== undefined) {
        ctx.entanglementRevealed = false;
        ctx.cameras.main.setZoom(1);
        ctx.cameras.main.followOffset?.set?.(0, 0);
        ctx.cameras.main.centerOn(initialHero.x, initialHero.y);
        ctx.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
      } else {
        const cx = (initialHero.x + ctx.betaHero.x) / 2;
        const cy = (initialHero.y + ctx.betaHero.y) / 2;
        const dx = Math.abs(initialHero.x - ctx.betaHero.x);
        const dy = Math.abs(initialHero.y - ctx.betaHero.y);
        const initZoomX = ctx.cameras.main.width / (dx + 240);
        const initZoomY = ctx.cameras.main.height / (dy + 200);
        const initZoom = Phaser.Math.Clamp(Math.min(initZoomX, initZoomY), 0.28, 1.0);
        ctx.cameras.main.setZoom(initZoom);
        ctx.cameras.main.centerOn(cx, cy);
      }
    } else {
      ctx.cameras.main.setZoom(1);
      ctx.cameras.main.followOffset?.set?.(0, 0);
      ctx.cameras.main.centerOn(initialHero.x, initialHero.y);
      ctx.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
    }
  }

  public updateFraming(delta: number): void {
    const ctx = this.ctx;
    if (ctx.isEntangled && ctx.heroes.length >= 2) {
      const alpha = ctx.heroes.find((h) => !h.isBeta);
      const beta = ctx.heroes.find((h) => h.isBeta);
      if (alpha && beta && alpha.active && beta.active) {
        const cx = (alpha.x + beta.x) / 2;
        const cy = (alpha.y + beta.y) / 2;
        const dx = Math.abs(alpha.x - beta.x);
        const dy = Math.abs(alpha.y - beta.y);

        const viewW = ctx.cameras.main.width;
        const viewH = ctx.cameras.main.height;
        const requiredZoomX = viewW / (dx + 240);
        const requiredZoomY = viewH / (dy + 200);
        const targetZoom = Phaser.Math.Clamp(Math.min(requiredZoomX, requiredZoomY), 0.28, 1.0);

        const currentZoom = ctx.cameras.main.zoom;
        const newZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.08);
        ctx.cameras.main.setZoom(newZoom);
        ctx.syncHudTransform();

        const currentMid = ctx.cameras.main.midPoint;
        const newCamX = Phaser.Math.Linear(currentMid.x, cx, 0.1);
        const newCamY = Phaser.Math.Linear(currentMid.y, cy, 0.1);
        ctx.cameras.main.centerOn(newCamX, newCamY);
      }
    } else {
      const lookHero = ctx.heroes.find((h) => h.isFocused) || ctx.heroes[0];
      if (lookHero?.active && lookHero.body) {
        const targetOffset = computeLookAheadOffset(
          lookHero.body.velocity.x,
          lookHero.body.velocity.y
        );
        const lerpFactor = 1 - Math.exp(-8 * (delta / 1000));
        ctx.cameras.main.followOffset.x = Phaser.Math.Linear(
          ctx.cameras.main.followOffset.x,
          targetOffset.x,
          lerpFactor
        );
        ctx.cameras.main.followOffset.y = Phaser.Math.Linear(
          ctx.cameras.main.followOffset.y,
          targetOffset.y,
          lerpFactor
        );
      }
    }
  }

  public checkEntanglementReveal(): void {
    const ctx = this.ctx;
    const revealAtX = ctx.levelData.entanglement?.revealAtX;
    if (!ctx.isEntangled || revealAtX === undefined || ctx.entanglementRevealed) return;

    const alphaHero = ctx.heroes.find((h) => !h.isBeta && h.active);
    if (alphaHero && alphaHero.x >= revealAtX) {
      ctx.entanglementRevealed = true;
      const cam = ctx.cameras?.main as unknown as {
        zoomTo?: (zoom: number, duration?: number, ease?: string) => void;
        setZoom?: (zoom: number) => void;
        centerOn?: (x: number, y: number) => void;
        stopFollow?: () => void;
      };
      if (typeof cam?.zoomTo === 'function') {
        cam.zoomTo(0.45, 900, 'Sine.easeInOut');
      } else {
        cam?.setZoom?.(0.45);
      }
      if (ctx.betaHero) {
        cam?.stopFollow?.();
        cam?.centerOn?.((alphaHero.x + ctx.betaHero.x) / 2, (alphaHero.y + ctx.betaHero.y) / 2);
      }
      gameEvents.emit('entanglement:reveal', { revealAtX });
      ctx.showRetroToast(
        getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.entanglementRevealed
      );
    }
  }

  public handleResize(gameSize?: { width: number; height: number }): void {
    const ctx = this.ctx;
    if (!ctx.cameras?.main) return;

    const camW = gameSize?.width ?? ctx.cameras.main.width;
    const camH = gameSize?.height ?? ctx.cameras.main.height;
    if (!camW || !camH || camW <= 0 || camH <= 0) return;

    if (typeof ctx.cameras.main.setViewport === 'function') {
      ctx.cameras.main.setViewport(0, 0, camW, camH);
    } else {
      ctx.cameras.main.width = camW;
      ctx.cameras.main.height = camH;
    }

    if (ctx.levelData) {
      ctx.cameras.main.setBounds(0, 0, ctx.levelData.width, ctx.levelData.height);
    }

    if (ctx.isEntangled && ctx.heroes.length >= 2) {
      const alpha = ctx.heroes.find((h) => !h.isBeta);
      const beta = ctx.heroes.find((h) => h.isBeta);
      if (alpha?.active && beta?.active) {
        const cx = (alpha.x + beta.x) / 2;
        const cy = (alpha.y + beta.y) / 2;
        const dx = Math.abs(alpha.x - beta.x);
        const dy = Math.abs(alpha.y - beta.y);
        const zoomX = camW / (dx + 240);
        const zoomY = camH / (dy + 200);
        const targetZoom = Phaser.Math.Clamp(Math.min(zoomX, zoomY), 0.28, 1.0);
        ctx.cameras.main.setZoom(targetZoom);
        ctx.cameras.main.centerOn(cx, cy);
      }
    }

    this.hudController.repositionOnResize(camW, camH);

    ctx.bohrBackground?.resize(camW / 2, camH / 2);

    if (ctx.levelData && ctx.muralObjects.length >= 3) {
      const muralX = Math.min(ctx.levelData.width * 0.5, camW * 0.5);
      const muralY = Math.min(ctx.levelData.height * 0.45, camH * 0.44);
      const offsets = [-24, 38, 62];
      offsets.forEach((dy, idx) => {
        const obj = ctx.muralObjects[idx] as Phaser.GameObjects.Text | undefined;
        if (obj?.active && typeof obj.setPosition === 'function') {
          obj.setPosition(muralX, muralY + dy);
        }
      });
    }
  }

  public switchFocusTo(targetHero: Hero): void {
    const ctx = this.ctx;
    if (ctx.isEntangled || ctx.heroes.length <= 1) return;
    if (!targetHero || !targetHero.active) return;

    const prevHero = ctx.heroes.find((h) => h.isFocused) || ctx.heroes[0];
    if (targetHero === prevHero) return;

    for (const h of ctx.heroes) {
      h.setFocus(h === targetHero);
    }
    ctx.cameras.main.startFollow(targetHero, true, 0.1, 0.1);

    ctx.switchCount += 1;
    ctx.focusBulletTimeUntil = ctx.time.now + 180;
    if (prevHero?.active) {
      this.drawFocusSwitchArc(prevHero.x, prevHero.y, targetHero.x, targetHero.y);
      gameEvents.emit('hero:focus_switch', { fromId: prevHero.id, toId: targetHero.id });
    }
    ctx.updateEdgePips();
  }

  public cycleFocusNext(): void {
    const ctx = this.ctx;
    if (ctx.isEntangled || ctx.heroes.length <= 1) return;
    const currentIdx = ctx.heroes.findIndex((h) => h.isFocused);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % ctx.heroes.length : 0;
    this.switchFocusTo(ctx.heroes[nextIdx]);
  }

  public switchFocusByIndex(index: number): void {
    const ctx = this.ctx;
    if (ctx.isEntangled || ctx.heroes.length <= 1) return;
    if (index >= 0 && index < ctx.heroes.length) {
      this.switchFocusTo(ctx.heroes[index]);
    }
  }

  public flash(duration: number, r: number, g: number, b: number, force = false): void {
    this.ctx.cameras?.main?.flash?.(duration, r, g, b, force);
  }

  public shake(duration: number, intensity = 0.01): void {
    if (useGameStore.getState().reducedEffects) return;
    this.ctx.cameras?.main?.shake?.(duration, intensity);
  }

  private drawFocusSwitchArc(x1: number, y1: number, x2: number, y2: number): void {
    const ctx = this.ctx;
    if (!ctx.focusArcGraphics) return;
    const g = ctx.focusArcGraphics;
    g.clear();

    const isReduced = useGameStore.getState().reducedEffects;
    g.lineStyle(isReduced ? 2 : 3, 0x00e5ff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    if (!isReduced) {
      const midX = (x1 + x2) / 2 + (Math.random() * 28 - 14);
      const midY = (y1 + y2) / 2 + (Math.random() * 28 - 14);
      g.lineTo(midX, midY);
    }
    g.lineTo(x2, y2);
    g.strokePath();

    ctx.time.delayedCall(180, () => {
      if (ctx.focusArcGraphics) {
        ctx.focusArcGraphics.clear();
      }
    });
  }
}
