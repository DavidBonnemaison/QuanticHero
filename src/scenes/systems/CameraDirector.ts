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

  private static readonly MIN_DUAL_READABLE_ZOOM = 0.42;
  private static readonly BETA_PIP_WIDTH = 124;
  private static readonly BETA_PIP_HEIGHT = 96;
  private static readonly BETA_PIP_MARGIN_X = 10;
  private static readonly BETA_PIP_TOP_Y = 62;
  private static readonly BETA_PIP_ZOOM = 0.42;

  private getSingleHeroZoom(viewW: number): number {
    return Phaser.Math.Clamp(viewW / 620, 0.65, 1.0);
  }

  public destroyBetaPipCamera(): void {
    const ctx = this.ctx;
    if (ctx.betaPipCamera) {
      ctx.cameras?.remove?.(ctx.betaPipCamera);
      ctx.betaPipCamera = null;
    }
    if (ctx.betaPipFrame) {
      ctx.betaPipFrame.destroy();
      ctx.betaPipFrame = null;
    }
    if (ctx.betaPipLabel) {
      ctx.betaPipLabel.destroy();
      ctx.betaPipLabel = null;
    }
  }

  private ensureBetaPipCamera(beta: Hero, viewW: number): void {
    const ctx = this.ctx;
    const pipW = CameraDirector.BETA_PIP_WIDTH;
    const pipH = CameraDirector.BETA_PIP_HEIGHT;
    const pipX = Math.max(8, viewW - pipW - CameraDirector.BETA_PIP_MARGIN_X);
    const pipY = CameraDirector.BETA_PIP_TOP_Y;

    if (!ctx.betaPipCamera && typeof ctx.cameras?.add === 'function') {
      const pipCam = ctx.cameras.add(pipX, pipY, pipW, pipH);
      pipCam.setZoom?.(CameraDirector.BETA_PIP_ZOOM);
      if (ctx.levelData?.hue) {
        pipCam.setBackgroundColor?.(ctx.levelData.hue);
      }
      if (ctx.levelData) {
        pipCam.setBounds?.(0, 0, ctx.levelData.width, ctx.levelData.height);
      }
      ctx.betaPipCamera = pipCam;
    }

    if (ctx.betaPipCamera) {
      ctx.betaPipCamera.setViewport?.(pipX, pipY, pipW, pipH);
      ctx.betaPipCamera.setZoom?.(CameraDirector.BETA_PIP_ZOOM);
      if (ctx.hudContainer) {
        ctx.betaPipCamera.ignore?.(ctx.hudContainer);
      }
      if (ctx.levelCompleteOverlay) {
        ctx.betaPipCamera.ignore?.(ctx.levelCompleteOverlay);
      }
      ctx.betaPipCamera.centerOn?.(beta.x, beta.y);
    }

    if (!ctx.betaPipFrame && typeof ctx.add?.rectangle === 'function') {
      const frame = ctx.add.rectangle(pipX + pipW / 2, pipY + pipH / 2, pipW, pipH, 0x000000, 0);
      frame.setStrokeStyle?.(2, 0xec4899, 0.95);
      frame.setScrollFactor?.(0);
      frame.setDepth?.(105);
      ctx.betaPipFrame = frame;
      if (ctx.hudContainer) {
        ctx.hudContainer.add(frame);
      } else {
        ctx.betaPipCamera?.ignore?.(frame);
      }
    } else if (ctx.betaPipFrame?.active) {
      ctx.betaPipFrame.setPosition?.(pipX + pipW / 2, pipY + pipH / 2);
    }

    if (!ctx.betaPipLabel && typeof ctx.add?.text === 'function') {
      const label = ctx.add.text(pipX + 6, pipY + 4, 'β', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#ec4899',
        backgroundColor: '#0b0f19'
      });
      label.setScrollFactor?.(0);
      label.setDepth?.(106);
      ctx.betaPipLabel = label;
      if (ctx.hudContainer) {
        ctx.hudContainer.add(label);
      } else {
        ctx.betaPipCamera?.ignore?.(label);
      }
    } else if (ctx.betaPipLabel?.active) {
      ctx.betaPipLabel.setPosition?.(pipX + 6, pipY + 4);
    }
  }

  public setupInitialFraming(initialHero: Hero): void {
    const ctx = this.ctx;
    const entanglement = ctx.levelData.entanglement;

    if (entanglement && ctx.betaHero) {
      if (entanglement.revealAtX !== undefined) {
        ctx.entanglementRevealed = false;
        this.destroyBetaPipCamera();
        ctx.cameras.main.setZoom(1);
        ctx.cameras.main.followOffset?.set?.(0, 0);
        ctx.cameras.main.centerOn(initialHero.x, initialHero.y);
        ctx.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
      } else {
        const dx = Math.abs(initialHero.x - ctx.betaHero.x);
        const dy = Math.abs(initialHero.y - ctx.betaHero.y);
        const initZoomX = ctx.cameras.main.width / (dx + 240);
        const initZoomY = ctx.cameras.main.height / (dy + 200);
        const rawZoom = Math.min(initZoomX, initZoomY);

        if (rawZoom >= CameraDirector.MIN_DUAL_READABLE_ZOOM) {
          this.destroyBetaPipCamera();
          const cx = (initialHero.x + ctx.betaHero.x) / 2;
          const cy = (initialHero.y + ctx.betaHero.y) / 2;
          const initZoom = Phaser.Math.Clamp(rawZoom, CameraDirector.MIN_DUAL_READABLE_ZOOM, 1.0);
          ctx.cameras.main.setZoom(initZoom);
          ctx.cameras.main.centerOn(cx, cy);
        } else {
          // On narrow viewports (e.g. mobile portrait) when Alpha and Beta start far apart,
          // frame Alpha at a readable zoom and show Beta in a Picture-in-Picture camera.
          const singleZoom = this.getSingleHeroZoom(ctx.cameras.main.width);
          ctx.cameras.main.setZoom(singleZoom);
          ctx.cameras.main.centerOn(initialHero.x, initialHero.y);
          this.ensureBetaPipCamera(ctx.betaHero, ctx.cameras.main.width);
        }
      }
    } else {
      this.destroyBetaPipCamera();
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
        const hasPendingReveal =
          ctx.levelData.entanglement?.revealAtX !== undefined && !ctx.entanglementRevealed;
        if (hasPendingReveal) {
          this.destroyBetaPipCamera();
          return;
        }

        const viewW = ctx.cameras.main.width;
        const viewH = ctx.cameras.main.height;
        const currentZoom = ctx.cameras.main.zoom;
        const currentMid = ctx.cameras.main.midPoint;

        // If one hero has already docked in their portal, focus cleanly on the remaining hero
        if (alpha.enteredPortal && !beta.enteredPortal) {
          this.destroyBetaPipCamera();
          const targetZoom = this.getSingleHeroZoom(viewW);
          ctx.cameras.main.setZoom(Phaser.Math.Linear(currentZoom, targetZoom, 0.08));
          ctx.syncHudTransform();
          ctx.cameras.main.centerOn(
            Phaser.Math.Linear(currentMid.x, beta.x, 0.12),
            Phaser.Math.Linear(currentMid.y, beta.y, 0.12)
          );
          return;
        }
        if (beta.enteredPortal && !alpha.enteredPortal) {
          this.destroyBetaPipCamera();
          const targetZoom = this.getSingleHeroZoom(viewW);
          ctx.cameras.main.setZoom(Phaser.Math.Linear(currentZoom, targetZoom, 0.08));
          ctx.syncHudTransform();
          ctx.cameras.main.centerOn(
            Phaser.Math.Linear(currentMid.x, alpha.x, 0.12),
            Phaser.Math.Linear(currentMid.y, alpha.y, 0.12)
          );
          return;
        }

        const dx = Math.abs(alpha.x - beta.x);
        const dy = Math.abs(alpha.y - beta.y);
        const requiredZoomX = viewW / (dx + 240);
        const requiredZoomY = viewH / (dy + 200);
        const rawZoom = Math.min(requiredZoomX, requiredZoomY);

        let targetZoom: number;
        let targetX: number;
        let targetY: number;

        if (rawZoom >= CameraDirector.MIN_DUAL_READABLE_ZOOM) {
          this.destroyBetaPipCamera();
          targetZoom = Phaser.Math.Clamp(rawZoom, CameraDirector.MIN_DUAL_READABLE_ZOOM, 1.0);
          targetX = (alpha.x + beta.x) / 2;
          targetY = (alpha.y + beta.y) / 2;
        } else {
          // Keep Alpha clearly visible when both heroes cannot fit on a narrow screen,
          // and track Beta in the top-right Picture-in-Picture camera.
          targetZoom = this.getSingleHeroZoom(viewW);
          targetX = alpha.x;
          targetY = alpha.y;
          this.ensureBetaPipCamera(beta, viewW);
        }

        const newZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.08);
        ctx.cameras.main.setZoom(newZoom);
        ctx.syncHudTransform();

        const newCamX = Phaser.Math.Linear(currentMid.x, targetX, 0.12);
        const newCamY = Phaser.Math.Linear(currentMid.y, targetY, 0.12);
        ctx.cameras.main.centerOn(newCamX, newCamY);
      }
    } else {
      this.destroyBetaPipCamera();
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
        if (alpha.enteredPortal && !beta.enteredPortal) {
          this.destroyBetaPipCamera();
          ctx.cameras.main.setZoom(this.getSingleHeroZoom(camW));
          ctx.cameras.main.centerOn(beta.x, beta.y);
        } else if (beta.enteredPortal && !alpha.enteredPortal) {
          this.destroyBetaPipCamera();
          ctx.cameras.main.setZoom(this.getSingleHeroZoom(camW));
          ctx.cameras.main.centerOn(alpha.x, alpha.y);
        } else {
          const dx = Math.abs(alpha.x - beta.x);
          const dy = Math.abs(alpha.y - beta.y);
          const zoomX = camW / (dx + 240);
          const zoomY = camH / (dy + 200);
          const rawZoom = Math.min(zoomX, zoomY);
          if (rawZoom >= CameraDirector.MIN_DUAL_READABLE_ZOOM) {
            this.destroyBetaPipCamera();
            const targetZoom = Phaser.Math.Clamp(
              rawZoom,
              CameraDirector.MIN_DUAL_READABLE_ZOOM,
              1.0
            );
            ctx.cameras.main.setZoom(targetZoom);
            ctx.cameras.main.centerOn((alpha.x + beta.x) / 2, (alpha.y + beta.y) / 2);
          } else {
            ctx.cameras.main.setZoom(this.getSingleHeroZoom(camW));
            ctx.cameras.main.centerOn(alpha.x, alpha.y);
            this.ensureBetaPipCamera(beta, camW);
          }
        }
      }
    } else {
      this.destroyBetaPipCamera();
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
