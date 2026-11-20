import Phaser from 'phaser';
import { soundManager } from '../../audio/SoundManager';
import { getStrings } from '../../i18n/strings';
import { push } from '../../shims/navigation';
import { useGameStore } from '../../store';
import { formatScore } from '../../tools/formatScore';
import { isGodMode } from '../../tools/godMode';
import type { IsotopeMedal } from '../../types';
import {
  showLevelCompleteOverlay as renderLevelCompleteOverlay,
  showLevelTitle as renderLevelTitle,
  showRetroToast as renderRetroToast
} from './HudOverlayRenderer';
import type { GameSceneContext } from './types';

/**
 * Manages the in-canvas HUD: creation, dirty-checked timer & indicators,
 * interactive buttons (RST/SND/HAP/FX/GHOST), clickable phase badge,
 * clone edge pips, thumb-ribbon feedback, resize anchoring, and overlays.
 */
export class HudController {
  constructor(private readonly ctx: GameSceneContext) {}

  public createHUD(): void {
    const ctx = this.ctx;
    const camW = ctx.cameras.main.width;
    const camH = ctx.cameras.main.height;
    const hudHeight = 54;
    const getHudStrings = () => getStrings(useGameStore.getState().locale ?? 'en');
    const initialStrings = getHudStrings();

    ctx.hudContainer = ctx.add.container(0, 0);
    ctx.hudContainer.setScrollFactor(0);
    ctx.hudContainer.setDepth(100);

    ctx.thumbRibbonGraphics = ctx.add.graphics();
    ctx.hudContainer.add(ctx.thumbRibbonGraphics);

    const hudBar = ctx.add.graphics();
    ctx.hudBarGraphics = hudBar;
    this.drawHudBar(camW);
    ctx.hudContainer.add(hudBar);

    const backButton = ctx.add.text(18, hudHeight / 2, '◄', {
      fontFamily: 'VT323',
      fontSize: '26px',
      color: '#ffffff'
    });
    backButton.setOrigin(0.5);
    backButton.setScrollFactor(0);
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      soundManager.stopBgm();
      useGameStore.getState().setSharedLevel(null);
      try {
        ctx.game.destroy(true);
      } catch {
        // safe
      }
      window.game = null;
      push('/');
    });
    ctx.hudContainer.add(backButton);

    const restartButton = ctx.add.text(44, 5, initialStrings.hud.restart, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#fbbf24'
    });
    restartButton.setScrollFactor(0);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      if (!ctx.isLevelCompleted && !ctx.isTransitioningLevel) {
        ctx.quickRespawn();
      }
    });
    ctx.hudContainer.add(restartButton);

    const getSoundLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().isMuted ? s.soundOff : s.soundOn;
    };
    const soundButton = ctx.add.text(92, 5, getSoundLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    soundButton.setScrollFactor(0);
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleMute();
      soundButton.setText(getSoundLabel());
    });
    ctx.hudContainer.add(soundButton);

    const getHapticLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().hapticsEnabled ? s.hapticsOn : s.hapticsOff;
    };
    const hapticButton = ctx.add.text(154, 5, getHapticLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    hapticButton.setScrollFactor(0);
    hapticButton.setInteractive({ useHandCursor: true });
    hapticButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleHaptics();
      hapticButton.setText(getHapticLabel());
    });
    ctx.hudContainer.add(hapticButton);

    const getFxLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().reducedEffects ? s.fxLo : s.fxHi;
    };
    const fxButton = ctx.add.text(216, 5, getFxLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    fxButton.setScrollFactor(0);
    fxButton.setInteractive({ useHandCursor: true });
    fxButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleReducedEffects();
      fxButton.setText(getFxLabel());
    });
    ctx.hudContainer.add(fxButton);

    const currentMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    const ghostLabel = initialStrings.ghost[currentMode];
    ctx.ghostButton = ctx.add.text(44, 29, ghostLabel, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#38bdf8'
    });
    ctx.ghostButton.setScrollFactor(0);
    ctx.ghostButton.setAlpha(currentMode !== 'off' ? 1 : 0.45);
    ctx.ghostButton.setVisible(ctx.hasAnyGhost || ctx.swarmBuffer.size > 0);
    ctx.ghostButton.setInteractive({ useHandCursor: true });
    ctx.ghostButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      const hasBest = Boolean(ctx.personalTrajectory);
      useGameStore.getState().toggleGhost(hasBest, ctx.swarmBuffer.size > 0);
      ctx.applyGhostMode();
    });
    ctx.hudContainer.add(ctx.ghostButton);

    if (ctx.hasPhasePlatforms) {
      const phaseX = ctx.hasAnyGhost ? 186 : 44;
      ctx.phaseIndicatorText = ctx.add.text(
        phaseX,
        29,
        initialStrings.hud.phase(ctx.currentPhase),
        {
          fontFamily: 'VT323',
          fontSize: '18px',
          color: ctx.currentPhase === 'cyan' ? '#00ffff' : '#ec4899'
        }
      );
      ctx.phaseIndicatorText.setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-8, -8, 120, 36),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains
      });
      ctx.phaseIndicatorText.on('pointerdown', () => {
        ctx.uiPointerConsumed = true;
        ctx.togglePhasePlatforms();
      });
      ctx.hudContainer.add(ctx.phaseIndicatorText);
    }

    const dilationX = ctx.hasAnyGhost ? 186 : 44;
    ctx.dilationIndicatorText = ctx.add.text(dilationX, 29, initialStrings.hud.timeDilation, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#22d3ee'
    });
    ctx.dilationIndicatorText.setVisible(false);
    ctx.hudContainer.add(ctx.dilationIndicatorText);

    if (isGodMode()) {
      const godBadge = ctx.add.text(274, 5, '[GOD]', {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#fbbf24'
      });
      ctx.hudContainer.add(godBadge);
    }

    if (ctx.unsubHudStore) {
      ctx.unsubHudStore();
    }
    ctx.unsubHudStore = useGameStore.subscribe(() => {
      const s = getHudStrings();
      if (soundButton.active) {
        soundButton.setText(getSoundLabel());
      }
      if (hapticButton.active) {
        hapticButton.setText(getHapticLabel());
      }
      if (fxButton.active) {
        fxButton.setText(getFxLabel());
      }
      if (ctx.phaseIndicatorText?.active) {
        ctx.phaseIndicatorText.setText(s.hud.phase(ctx.currentPhase));
      }
      if (ctx.dilationIndicatorText?.active) {
        ctx.dilationIndicatorText.setText(s.hud.timeDilation);
      }
      if (ctx.ghostButton?.active) {
        ctx.applyGhostMode();
      }
    });

    ctx.timerText = ctx.add.text(camW - 10, 3, '00:00:00', {
      fontFamily: 'VT323',
      fontSize: '22px',
      color: '#ffffff'
    });
    ctx.timerText.setOrigin(1, 0);
    ctx.hudContainer.add(ctx.timerText);

    ctx.splitDeltaText = ctx.add.text(camW - 10, 28, '--', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#94a3b8'
    });
    ctx.splitDeltaText.setOrigin(1, 0);
    ctx.splitDeltaText.setVisible(currentMode !== 'off' && ctx.ghostFrames.length > 0);
    ctx.hudContainer.add(ctx.splitDeltaText);

    ctx.coherenceBarGraphics = ctx.add.graphics();
    ctx.hudContainer.add(ctx.coherenceBarGraphics);

    const coherenceTierX = camW < 440 ? camW - 76 : camW - 110;
    ctx.coherenceTierText = ctx.add.text(coherenceTierX, 28, 'x1', {
      fontFamily: 'VT323',
      fontSize: camW < 440 ? '16px' : '18px',
      color: '#38bdf8'
    });
    ctx.coherenceTierText.setOrigin(1, 0);
    ctx.coherenceTierText.setAlpha(0.45);
    ctx.hudContainer.add(ctx.coherenceTierText);

    const thumbRestartBg = ctx.add.rectangle(camW - 36, camH - 36, 48, 48, 0x0b0f19, 0.35);
    thumbRestartBg.setStrokeStyle(1.5, 0xfbbf24, 0.35);
    const thumbRestartLabel = ctx.add.text(camW - 36, camH - 36, '↻', {
      fontFamily: 'VT323',
      fontSize: '28px',
      color: '#fbbf24'
    });
    thumbRestartLabel.setOrigin(0.5);
    thumbRestartLabel.setAlpha(0.35);
    const thumbRestartZone = ctx.add.zone(camW - 36, camH - 36, 48, 48);
    thumbRestartZone.setInteractive({ useHandCursor: true });
    thumbRestartZone.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      if (!ctx.isLevelCompleted && !ctx.isTransitioningLevel) {
        ctx.quickRespawn();
      }
    });
    ctx.thumbRestartBg = thumbRestartBg;
    ctx.thumbRestartLabel = thumbRestartLabel;
    ctx.thumbRestartZone = thumbRestartZone;
    ctx.hudContainer.add(thumbRestartBg);
    ctx.hudContainer.add(thumbRestartLabel);
    ctx.hudContainer.add(thumbRestartZone);

    this.updateCoherenceGauge(true);
    this.updateEdgePips();
    this.syncHudTransform();
  }

  public updateEdgePips(): void {
    const ctx = this.ctx;
    for (const pip of ctx.edgePips) {
      pip.bg.destroy();
      pip.label.destroy();
      pip.hitArea.destroy();
    }
    ctx.edgePips = [];

    if (!ctx.hudContainer || ctx.isEntangled || ctx.heroes.length <= 1) {
      return;
    }

    const camH = ctx.cameras.main.height;
    const pipY = camH - 70;
    const subscripts = ['ψ₁', 'ψ₂', 'ψ₃'];

    ctx.heroes.slice(0, 3).forEach((hero, index) => {
      const pipX = 40 + index * 70;
      const isFocused = hero.isFocused;
      const bg = ctx.add.rectangle(
        pipX,
        pipY,
        64,
        64,
        isFocused ? 0x083344 : 0x0b0f19,
        isFocused ? 0.85 : 0.45
      );
      bg.setStrokeStyle(2, isFocused ? 0x00e5ff : 0x64748b, isFocused ? 0.95 : 0.5);

      const label = ctx.add.text(pipX, pipY, subscripts[index] ?? `ψ${index + 1}`, {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: isFocused ? '#00e5ff' : '#94a3b8'
      });
      label.setOrigin(0.5);

      const hitArea = ctx.add.zone(pipX, pipY, 64, 64);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        ctx.uiPointerConsumed = true;
        ctx.switchFocusTo(hero);
      });

      ctx.hudContainer?.add(bg);
      ctx.hudContainer?.add(label);
      ctx.hudContainer?.add(hitArea);
      ctx.edgePips.push({ bg, label, hitArea });
    });
  }

  public drawHudBar(camW: number): void {
    const hudBar = this.ctx.hudBarGraphics;
    if (!hudBar || !hudBar.active) return;
    const hudHeight = 54;
    hudBar.clear();
    hudBar.fillStyle(0x0b0f19, 0.85);
    hudBar.fillRect(36, 0, Math.max(0, camW - 36), hudHeight);
    hudBar.fillStyle(0xe74c3c, 0.85);
    hudBar.fillRect(0, 0, 36, hudHeight);
    hudBar.lineStyle(1, 0x334155, 0.9);
    hudBar.lineBetween(0, hudHeight, camW, hudHeight);
  }

  public syncHudTransform(): void {
    const ctx = this.ctx;
    if (!ctx.hudContainer || !ctx.cameras?.main) return;
    const z = ctx.cameras.main.zoom;
    if (z <= 0) return;
    const inv = 1 / z;
    ctx.hudContainer.setScale(inv);
    ctx.hudContainer.setPosition(
      (ctx.cameras.main.width / 2) * (1 - inv),
      (ctx.cameras.main.height / 2) * (1 - inv)
    );
  }

  public repositionOnResize(camW: number, camH: number): void {
    const ctx = this.ctx;
    this.drawHudBar(camW);

    if (ctx.timerText?.active) {
      ctx.timerText.setPosition(camW - 10, 3);
    }
    if (ctx.splitDeltaText?.active) {
      ctx.splitDeltaText.setPosition(camW - 10, 28);
    }
    if (ctx.coherenceTierText?.active) {
      ctx.coherenceTierText.setPosition(camW < 440 ? camW - 76 : camW - 110, 28);
      if (typeof ctx.coherenceTierText.setFontSize === 'function') {
        ctx.coherenceTierText.setFontSize(camW < 440 ? '16px' : '18px');
      }
    }
    this.updateCoherenceGauge(true, camW);

    const thumbX = camW - 36;
    const thumbY = camH - 36;
    if (ctx.thumbRestartBg?.active) {
      ctx.thumbRestartBg.setPosition(thumbX, thumbY);
    }
    if (ctx.thumbRestartLabel?.active) {
      ctx.thumbRestartLabel.setPosition(thumbX, thumbY);
    }
    if (ctx.thumbRestartZone?.active) {
      ctx.thumbRestartZone.setPosition(thumbX, thumbY);
    }

    const pipY = camH - 70;
    ctx.edgePips.forEach((pip, index) => {
      const pipX = 40 + index * 70;
      if (pip.bg.active) pip.bg.setPosition(pipX, pipY);
      if (pip.label.active) pip.label.setPosition(pipX, pipY);
      if (pip.hitArea.active) pip.hitArea.setPosition(pipX, pipY);
    });

    this.syncHudTransform();
  }

  public updateCoherenceGauge(force = false, widthOverride?: number): void {
    const ctx = this.ctx;
    const value = ctx.coherenceSystem?.getValue?.() ?? 0;
    const tier = ctx.coherenceSystem?.getTier?.() ?? 'x1';

    if (
      !force &&
      Math.abs(value - (ctx.lastCoherenceValue ?? -1)) < 0.005 &&
      tier === ctx.lastCoherenceTier
    ) {
      return;
    }

    ctx.lastCoherenceValue = value;
    ctx.lastCoherenceTier = tier;

    const colorHex =
      tier === 'HYPER'
        ? '#fbbf24'
        : tier === 'x3'
          ? '#c084fc'
          : tier === 'x2'
            ? '#00ffcc'
            : '#38bdf8';
    const colorNum =
      tier === 'HYPER' ? 0xfbbf24 : tier === 'x3' ? 0xc084fc : tier === 'x2' ? 0x00ffcc : 0x38bdf8;

    const camW = widthOverride ?? ctx.cameras?.main?.width ?? 800;
    const gfx = ctx.coherenceBarGraphics;
    if (gfx?.active) {
      const trackX = 36;
      const trackW = Math.max(0, camW - trackX);
      const barY = 51;
      const barH = 3;

      gfx.clear();
      gfx.fillStyle(0x1e293b, 0.75);
      gfx.fillRect(trackX, barY, trackW, barH);
      if (value > 0 && trackW > 0) {
        gfx.fillStyle(colorNum, tier === 'HYPER' ? 0.98 : 0.88);
        gfx.fillRect(trackX, barY, Math.max(2, Math.round(trackW * value)), barH);
      }
    }

    if (ctx.coherenceTierText?.active) {
      const label = tier === 'HYPER' ? (camW < 440 ? 'HYPER' : '⚡ HYPER') : tier;
      ctx.coherenceTierText.setText(label);
      ctx.coherenceTierText.setColor(colorHex);
      ctx.coherenceTierText.setAlpha(value > 0 ? 1 : 0.45);
    }
  }

  public updateTimerAndIndicators(): void {
    const ctx = this.ctx;
    if (ctx.timerText) {
      const nextTimerStr = formatScore(ctx.dilatedElapsedMs);
      if (nextTimerStr !== ctx.lastTimerString) {
        ctx.lastTimerString = nextTimerStr;
        ctx.timerText.setText(nextTimerStr);
      }
      const nextTimerColor = ctx.isTimeDilationActive ? '#22d3ee' : '#ffffff';
      if (nextTimerColor !== ctx.lastTimerColor) {
        ctx.lastTimerColor = nextTimerColor;
        ctx.timerText.setColor(nextTimerColor);
      }
    }
    if (ctx.dilationIndicatorText?.active) {
      ctx.dilationIndicatorText.setVisible(ctx.isTimeDilationActive);
    }
    this.updateCoherenceGauge();
  }

  public updateThumbRibbon(): void {
    const ctx = this.ctx;
    if (!ctx.thumbRibbonGraphics) return;
    ctx.thumbRibbonGraphics.clear();
    if (ctx.touchController.isPointerDown && !useGameStore.getState().reducedEffects) {
      const ax = ctx.touchController.anchorX;
      const ay = ctx.touchController.anchorY;
      const px = ctx.touchController.pointerX;
      const py = ctx.touchController.pointerY;
      ctx.thumbRibbonGraphics.lineStyle(2, 0x00e5ff, 0.22);
      ctx.thumbRibbonGraphics.beginPath();
      ctx.thumbRibbonGraphics.moveTo(ax, ay);
      ctx.thumbRibbonGraphics.lineTo(px, py);
      ctx.thumbRibbonGraphics.strokePath();
      ctx.thumbRibbonGraphics.fillStyle(0x00e5ff, 0.22);
      ctx.thumbRibbonGraphics.fillCircle(ax, ay, 4);
      ctx.thumbRibbonGraphics.strokeCircle(px, py, 7);
    }
  }

  public showLevelTitle(): void {
    renderLevelTitle(this.ctx);
  }

  public showRetroToast(message: string): void {
    renderRetroToast(this.ctx, message);
  }

  public showLevelCompleteOverlay(
    elapsedMs: number,
    bestMs: number,
    prevBestMs: number,
    nextLevelNumber: number | null,
    medal: IsotopeMedal = 'bronze'
  ): void {
    renderLevelCompleteOverlay(this.ctx, elapsedMs, bestMs, prevBestMs, nextLevelNumber, medal);
  }
}
