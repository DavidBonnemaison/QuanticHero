import Phaser from 'phaser';
import { soundManager } from '../../audio/SoundManager';
import { getStrings } from '../../i18n/strings';
import { push } from '../../shims/navigation';
import { useGameStore } from '../../store';
import { formatScore } from '../../tools/formatScore';
import { isGodMode } from '../../tools/godMode';
import { formatDuelSeconds } from '../../tools/levelCodec';
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
  private topHudButtons: Phaser.GameObjects.Text[] = [];
  private lastRow2Signature = '';

  constructor(private readonly ctx: GameSceneContext) {}

  private layoutTopHudButtons(camW: number): void {
    const isCompact = camW < 460;
    const fontSize = isCompact ? '12px' : '15px';
    const charWidth = isCompact ? 7.6 : 9.4;
    const gap = isCompact ? 6 : 12;
    const row1Y = isCompact ? 7 : 6;
    const row2Y = 29;
    const timerReserve = isCompact ? 102 : 136;
    const row1MaxRight = Math.max(200, camW - timerReserve);

    let cursorX = 40;
    let cursorY = row1Y;
    let wrappedToRow2 = false;

    for (const btn of this.topHudButtons) {
      if (!btn?.active) continue;
      if (typeof btn.setFontSize === 'function') {
        btn.setFontSize(fontSize);
      }
      const measuredW =
        typeof btn.width === 'number' && btn.width > 0
          ? btn.width
          : Math.ceil((btn.text?.length ?? 5) * charWidth);

      if (!wrappedToRow2 && cursorX > 40 && cursorX + measuredW > row1MaxRight) {
        wrappedToRow2 = true;
        cursorX = 40;
        cursorY = row2Y;
      }

      btn.setPosition(cursorX, cursorY);
      cursorX += Math.ceil(measuredW) + gap;
    }
  }

  private layoutRow2Indicators(camW: number, force = false): void {
    const ctx = this.ctx;
    const isCompact = camW < 460;
    const fontSize = isCompact ? '11px' : '14px';
    const charWidth = isCompact ? 6.8 : 8.6;
    const gap = isCompact ? 6 : 12;
    const row2Y = isCompact ? 30 : 29;
    const items = [
      ctx.duelBadgeText,
      ctx.ghostButton,
      ctx.phaseIndicatorText,
      ctx.dilationIndicatorText,
      ctx.timeLoopIndicatorText
    ];

    const sig = `${camW}|${items.map((el) => (el?.active && el.visible ? el.text : '')).join('|')}`;
    if (!force && sig === this.lastRow2Signature) return;
    this.lastRow2Signature = sig;

    let cursorX = 40;
    for (const el of items) {
      if (!el?.active || !el.visible || !el.text) continue;
      if (typeof el.setFontSize === 'function') {
        el.setFontSize(fontSize);
      }
      el.setPosition(cursorX, row2Y);
      const measuredW =
        typeof el.width === 'number' && el.width > 0
          ? el.width
          : Math.ceil(el.text.length * charWidth);
      cursorX += Math.ceil(measuredW) + gap;
    }
  }

  public createHUD(): void {
    const ctx = this.ctx;
    const camW = ctx.cameras.main.width;
    const camH = ctx.cameras.main.height;
    const hudHeight = 54;
    const isCompact = camW < 460;
    const topBtnFontSize = isCompact ? '12px' : '15px';
    const row2FontSize = isCompact ? '13px' : '15px';
    const getHudStrings = () => getStrings(useGameStore.getState().locale ?? 'en');
    const initialStrings = getHudStrings();
    this.topHudButtons = [];

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
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '24px',
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
      const rawId = String(ctx.levelData?.id ?? '');
      const isQuantumModeLevel = /^(?:chrono|schrodinger|accelerator)-/i.test(rawId);
      push(isQuantumModeLevel ? '/modes' : '/');
    });
    ctx.hudContainer.add(backButton);

    const restartButton = ctx.add.text(40, 6, initialStrings.hud.restart, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: topBtnFontSize,
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
    this.topHudButtons.push(restartButton);

    const getSoundLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().isMuted ? s.soundOff : s.soundOn;
    };
    const soundButton = ctx.add.text(100, 6, getSoundLabel(), {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: topBtnFontSize,
      color: '#00ffcc'
    });
    soundButton.setScrollFactor(0);
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleMute();
      soundButton.setText(getSoundLabel());
      this.layoutTopHudButtons(ctx.cameras.main.width);
    });
    ctx.hudContainer.add(soundButton);
    this.topHudButtons.push(soundButton);

    const getHapticLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().hapticsEnabled ? s.hapticsOn : s.hapticsOff;
    };
    const hapticButton = ctx.add.text(170, 6, getHapticLabel(), {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: topBtnFontSize,
      color: '#00ffcc'
    });
    hapticButton.setScrollFactor(0);
    hapticButton.setInteractive({ useHandCursor: true });
    hapticButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleHaptics();
      hapticButton.setText(getHapticLabel());
      this.layoutTopHudButtons(ctx.cameras.main.width);
    });
    ctx.hudContainer.add(hapticButton);
    this.topHudButtons.push(hapticButton);

    const getFxLabel = () => {
      const s = getHudStrings().hud;
      return useGameStore.getState().reducedEffects ? s.fxLo : s.fxHi;
    };
    const fxButton = ctx.add.text(240, 6, getFxLabel(), {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: topBtnFontSize,
      color: '#00ffcc'
    });
    fxButton.setScrollFactor(0);
    fxButton.setInteractive({ useHandCursor: true });
    fxButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleReducedEffects();
      fxButton.setText(getFxLabel());
      this.layoutTopHudButtons(ctx.cameras.main.width);
    });
    ctx.hudContainer.add(fxButton);
    this.topHudButtons.push(fxButton);

    const getSkinLabel = () => {
      const s = getHudStrings().hud;
      const skin = useGameStore.getState().heroSkin ?? 'pico';
      const labels: Record<string, string> = {
        pico: 'SKN:PIC',
        gameboy: s.skinGameboy,
        megabit: 'SKN:MEG',
        astronaut: 'SKN:AST',
        cybercat: 'SKN:CAT',
        hazmat: 'SKN:HAZ',
        samurai: 'SKN:SAM',
        bot: 'SKN:BOT',
        wizard: 'SKN:WIZ',
        ninja: 'SKN:NIN',
        neo: s.skinNeo,
        quantum: s.skinQuantum,
        classic: s.skinClassic
      };
      return labels[skin] ?? 'SKN:PIC';
    };
    const skinButton = ctx.add.text(300, 6, getSkinLabel(), {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: topBtnFontSize,
      color: '#38bdf8'
    });
    skinButton.setScrollFactor(0);
    skinButton.setInteractive({ useHandCursor: true });
    skinButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      useGameStore.getState().toggleHeroSkin();
      skinButton.setText(getSkinLabel());
      this.layoutTopHudButtons(ctx.cameras.main.width);
    });
    ctx.hudContainer.add(skinButton);
    this.topHudButtons.push(skinButton);

    const initialActiveDuel = useGameStore.getState().activeDuel;
    const currentMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    const ghostLabel = initialStrings.ghost[currentMode];
    ctx.ghostButton = ctx.add.text(40, 29, ghostLabel, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: row2FontSize,
      color: '#38bdf8'
    });
    ctx.ghostButton.setScrollFactor(0);
    ctx.ghostButton.setAlpha(currentMode !== 'off' ? 1 : 0.45);
    ctx.ghostButton.setVisible(!initialActiveDuel && (ctx.hasAnyGhost || ctx.swarmBuffer.size > 0));
    ctx.ghostButton.setInteractive({ useHandCursor: true });
    ctx.ghostButton.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      const hasBest = Boolean(ctx.personalTrajectory);
      useGameStore.getState().toggleGhost(hasBest, ctx.swarmBuffer.size > 0);
      ctx.applyGhostMode();
    });
    ctx.hudContainer.add(ctx.ghostButton);

    const getDuelBadgeLabel = () => {
      const duel = useGameStore.getState().activeDuel;
      if (!duel) return '';
      return getHudStrings().duel.rivalBadge(
        duel.challengerName,
        formatDuelSeconds(duel.challengerTimeMs)
      );
    };
    ctx.duelBadgeText = ctx.add.text(40, 29, getDuelBadgeLabel(), {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: row2FontSize,
      color: '#fbbf24'
    });
    ctx.duelBadgeText.setScrollFactor(0);
    ctx.duelBadgeText.setVisible(Boolean(initialActiveDuel));
    ctx.hudContainer.add(ctx.duelBadgeText);

    if (ctx.hasPhasePlatforms) {
      const phaseX = ctx.hasAnyGhost || initialActiveDuel ? 196 : 40;
      ctx.phaseIndicatorText = ctx.add.text(
        phaseX,
        29,
        initialStrings.hud.phase(ctx.currentPhase),
        {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: row2FontSize,
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

    const dilationX = ctx.hasAnyGhost || initialActiveDuel ? 196 : 40;
    ctx.dilationIndicatorText = ctx.add.text(dilationX, 29, initialStrings.hud.timeDilation, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: row2FontSize,
      color: '#22d3ee'
    });
    ctx.dilationIndicatorText.setVisible(false);
    ctx.hudContainer.add(ctx.dilationIndicatorText);

    if (ctx.levelData?.timeLoop) {
      const loopIndicatorX = ctx.hasAnyGhost || initialActiveDuel ? 196 : 40;
      const initSec = (ctx.levelData.timeLoop.cycleMs / 1000).toFixed(1);
      ctx.timeLoopIndicatorText = ctx.add.text(
        loopIndicatorX,
        29,
        initialStrings.hud.timeLoopStatus(0, ctx.levelData.timeLoop.maxEchoes, initSec),
        {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: row2FontSize,
          color: '#00e5ff'
        }
      );
      ctx.timeLoopIndicatorText.setScrollFactor(0);
      ctx.hudContainer.add(ctx.timeLoopIndicatorText);
    }

    if (isGodMode()) {
      const godBadge = ctx.add.text(380, 6, '[GOD]', {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: topBtnFontSize,
        color: '#fbbf24'
      });
      ctx.hudContainer.add(godBadge);
      this.topHudButtons.push(godBadge);
    }

    this.layoutTopHudButtons(camW);
    this.layoutRow2Indicators(camW, true);

    if (ctx.unsubHudStore) {
      ctx.unsubHudStore();
    }
    ctx.unsubHudStore = useGameStore.subscribe(() => {
      const s = getHudStrings();
      const duel = useGameStore.getState().activeDuel;
      if (soundButton.active) {
        soundButton.setText(getSoundLabel());
      }
      if (hapticButton.active) {
        hapticButton.setText(getHapticLabel());
      }
      if (fxButton.active) {
        fxButton.setText(getFxLabel());
      }
      if (skinButton.active) {
        skinButton.setText(getSkinLabel());
      }
      const w = ctx.cameras?.main?.width ?? 800;
      this.layoutTopHudButtons(w);
      if (ctx.duelBadgeText?.active) {
        ctx.duelBadgeText.setText(getDuelBadgeLabel());
        ctx.duelBadgeText.setVisible(Boolean(duel));
      }
      if (ctx.phaseIndicatorText?.active) {
        ctx.phaseIndicatorText.setText(s.hud.phase(ctx.currentPhase));
      }
      if (ctx.dilationIndicatorText?.active) {
        ctx.dilationIndicatorText.setText(s.hud.timeDilation);
      }
      if (ctx.condenseButtonLabel?.active) {
        ctx.condenseButtonLabel.setText(s.hud.condenseButton);
      }
      if (ctx.loopButtonLabel?.active) {
        ctx.loopButtonLabel.setText(s.hud.loopButton);
      }
      if (ctx.observeButtonLabel?.active) {
        ctx.observeButtonLabel.setText(s.hud.observeButton);
      }
      if (ctx.ghostButton?.active) {
        ctx.applyGhostMode();
      }
      this.layoutRow2Indicators(w, true);
    });

    const hideTopHud = Boolean(ctx.acceleratorMode);

    ctx.timerText = ctx.add.text(camW - 10, isCompact ? 5 : 3, '00:00:00', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: isCompact ? '18px' : '22px',
      color: '#ffffff'
    });
    ctx.timerText.setOrigin(1, 0);
    ctx.timerText.setVisible(!hideTopHud);
    ctx.hudContainer.add(ctx.timerText);

    ctx.splitDeltaText = ctx.add.text(camW - 10, 28, '--', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '18px',
      color: '#94a3b8'
    });
    ctx.splitDeltaText.setOrigin(1, 0);
    ctx.splitDeltaText.setVisible(
      !hideTopHud &&
        (Boolean(initialActiveDuel?.ghostTrajectory) || currentMode !== 'off') &&
        ctx.ghostFrames.length > 0
    );
    ctx.hudContainer.add(ctx.splitDeltaText);

    ctx.coherenceBarGraphics = ctx.add.graphics();
    ctx.coherenceBarGraphics.setVisible(!hideTopHud);
    ctx.hudContainer.add(ctx.coherenceBarGraphics);

    const coherenceTierX = camW < 440 ? camW - 76 : camW - 110;
    ctx.coherenceTierText = ctx.add.text(coherenceTierX, 28, 'x1', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: camW < 440 ? '16px' : '18px',
      color: '#38bdf8'
    });
    ctx.coherenceTierText.setOrigin(1, 0);
    ctx.coherenceTierText.setAlpha(0.45);
    ctx.coherenceTierText.setVisible(!hideTopHud);
    ctx.hudContainer.add(ctx.coherenceTierText);

    if (hideTopHud) {
      backButton.setVisible(false);
      restartButton.setVisible(false);
      soundButton.setVisible(false);
      hapticButton.setVisible(false);
      fxButton.setVisible(false);
      skinButton.setVisible(false);
      ctx.ghostButton.setVisible(false);
      ctx.duelBadgeText.setVisible(false);
      ctx.phaseIndicatorText?.setVisible(false);
      ctx.dilationIndicatorText?.setVisible(false);
      ctx.timeLoopIndicatorText?.setVisible(false);
    }

    const thumbRestartBg = ctx.add.rectangle(camW - 36, camH - 36, 48, 48, 0x0b0f19, 0.35);
    thumbRestartBg.setStrokeStyle(1.5, 0xfbbf24, 0.35);
    const thumbRestartLabel = ctx.add.text(camW - 36, camH - 36, '↻', {
      fontFamily: "'JetBrains Mono', monospace",
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

    const actionBtnW = 116;
    const actionBtnX = camW - Math.ceil(actionBtnW / 2) - 10;
    const condenseX = actionBtnX;
    const condenseY = camH - 96;
    const condenseBg = ctx.add.rectangle(condenseX, condenseY, actionBtnW, 42, 0x083344, 0.88);
    condenseBg.setStrokeStyle(2, 0x00e5ff, 0.95);
    const condenseLabel = ctx.add.text(condenseX, condenseY, initialStrings.hud.condenseButton, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      color: '#00e5ff'
    });
    condenseLabel.setOrigin(0.5);
    const condenseZone = ctx.add.zone(condenseX, condenseY, actionBtnW, 42);
    condenseZone.setInteractive({ useHandCursor: true });
    condenseZone.on('pointerdown', () => {
      ctx.uiPointerConsumed = true;
      if (!ctx.isLevelCompleted && !ctx.isTransitioningLevel) {
        ctx.tryCrystallizeBroglieTrail();
      }
    });
    const showCondense = Boolean(ctx.hasCondenseAbility);
    condenseBg.setVisible(showCondense);
    condenseLabel.setVisible(showCondense);
    condenseZone.setVisible(showCondense);
    ctx.condenseButtonBg = condenseBg;
    ctx.condenseButtonLabel = condenseLabel;
    ctx.condenseButtonZone = condenseZone;
    ctx.hudContainer.add(condenseBg);
    ctx.hudContainer.add(condenseLabel);
    ctx.hudContainer.add(condenseZone);

    if (ctx.levelData?.timeLoop) {
      const loopX = actionBtnX;
      const loopY = camH - 96;
      const loopBg = ctx.add.rectangle(loopX, loopY, actionBtnW, 42, 0x1e1035, 0.88);
      loopBg.setStrokeStyle(2, 0xa855f7, 0.95);
      loopBg.setScrollFactor?.(0);
      const loopLabel = ctx.add.text(loopX, loopY, initialStrings.hud.loopButton, {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '15px',
        color: '#00e5ff'
      });
      loopLabel.setOrigin(0.5);
      loopLabel.setScrollFactor?.(0);
      const loopZone = ctx.add.zone(loopX, loopY, actionBtnW, 42);
      loopZone.setScrollFactor?.(0);
      loopZone.setInteractive({ useHandCursor: true });
      loopZone.on(
        'pointerdown',
        (_p: unknown, _lx: unknown, _ly: unknown, ev?: { stopPropagation?: () => void }) => {
          ctx.uiPointerConsumed = true;
          ev?.stopPropagation?.();
          if (!ctx.isLevelCompleted && !ctx.isTransitioningLevel) {
            ctx.triggerTimeLoopRewind?.();
          }
        }
      );
      ctx.loopButtonBg = loopBg;
      ctx.loopButtonLabel = loopLabel;
      ctx.loopButtonZone = loopZone;
      ctx.hudContainer.add(loopBg);
      ctx.hudContainer.add(loopLabel);
      ctx.hudContainer.add(loopZone);
    }

    const hasWavefunctionMechanics = Boolean(
      (ctx.superposedPlatforms && ctx.superposedPlatforms.length > 0) ||
        (ctx.superposedSpikes && ctx.superposedSpikes.length > 0) ||
        (ctx.levelData?.observerBeams && ctx.levelData.observerBeams.length > 0)
    );
    if (hasWavefunctionMechanics) {
      const observeX = actionBtnX;
      const observeY = ctx.levelData?.timeLoop ? camH - 148 : camH - 96;
      const observeBg = ctx.add.rectangle(observeX, observeY, actionBtnW, 42, 0x1e1035, 0.88);
      observeBg.setStrokeStyle(2, 0xfbbf24, 0.95);
      observeBg.setScrollFactor?.(0);
      const observeLabel = ctx.add.text(observeX, observeY, initialStrings.hud.observeButton, {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '15px',
        color: '#fbbf24'
      });
      observeLabel.setOrigin(0.5);
      observeLabel.setScrollFactor?.(0);
      const observeZone = ctx.add.zone(observeX, observeY, actionBtnW, 42);
      observeZone.setScrollFactor?.(0);
      observeZone.setInteractive({ useHandCursor: true });
      observeZone.on(
        'pointerdown',
        (_p: unknown, _lx: unknown, _ly: unknown, ev?: { stopPropagation?: () => void }) => {
          ctx.uiPointerConsumed = true;
          ev?.stopPropagation?.();
          if (!ctx.isLevelCompleted && !ctx.isTransitioningLevel) {
            ctx.triggerActiveObservation?.();
          }
        }
      );
      ctx.observeButtonBg = observeBg;
      ctx.observeButtonLabel = observeLabel;
      ctx.observeButtonZone = observeZone;
      ctx.hudContainer.add(observeBg);
      ctx.hudContainer.add(observeLabel);
      ctx.hudContainer.add(observeZone);
    }

    if (ctx.betaPipCamera) {
      ctx.betaPipCamera.ignore?.(ctx.hudContainer);
      if (ctx.betaPipFrame) {
        ctx.hudContainer.add(ctx.betaPipFrame);
      }
      if (ctx.betaPipLabel) {
        ctx.hudContainer.add(ctx.betaPipLabel);
      }
    }

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
        fontFamily: "'JetBrains Mono', monospace",
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
    hudBar.clear();
    if (this.ctx.acceleratorMode) return;
    const hudHeight = 54;
    hudBar.fillStyle(0x0b0f19, 0.85);
    hudBar.fillRect(36, 0, Math.max(0, camW - 36), hudHeight);
    hudBar.fillStyle(0xe74c3c, 0.85);
    hudBar.fillRect(0, 0, 36, hudHeight);
    hudBar.lineStyle(1, 0x334155, 0.9);
    hudBar.lineBetween(0, hudHeight, camW, hudHeight);
  }

  public syncHudTransform(): void {
    const ctx = this.ctx;
    if (!ctx.cameras?.main) return;
    const z = ctx.cameras.main.zoom;
    if (z <= 0) return;
    const inv = 1 / z;
    const offsetX = (ctx.cameras.main.width / 2) * (1 - inv);
    const offsetY = (ctx.cameras.main.height / 2) * (1 - inv);
    if (ctx.hudContainer) {
      ctx.hudContainer.setScale(inv);
      ctx.hudContainer.setPosition(offsetX, offsetY);
    }
    if (ctx.levelCompleteOverlay?.active) {
      ctx.levelCompleteOverlay.setScale?.(inv);
      ctx.levelCompleteOverlay.setPosition?.(offsetX, offsetY);
    }
  }

  public repositionOnResize(camW: number, camH: number): void {
    const ctx = this.ctx;
    const isCompact = camW < 460;
    this.drawHudBar(camW);
    this.layoutTopHudButtons(camW);
    this.layoutRow2Indicators(camW, true);

    if (ctx.timerText?.active) {
      ctx.timerText.setPosition(camW - 10, isCompact ? 5 : 3);
      if (typeof ctx.timerText.setFontSize === 'function') {
        ctx.timerText.setFontSize(isCompact ? '18px' : '22px');
      }
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

    const actionBtnX = camW - 68;
    const condenseX = actionBtnX;
    const condenseY = camH - 96;
    if (ctx.condenseButtonBg?.active) {
      ctx.condenseButtonBg.setPosition(condenseX, condenseY);
    }
    if (ctx.condenseButtonLabel?.active) {
      ctx.condenseButtonLabel.setPosition(condenseX, condenseY);
    }
    if (ctx.condenseButtonZone?.active) {
      ctx.condenseButtonZone.setPosition(condenseX, condenseY);
    }

    const loopX = actionBtnX;
    const loopY = ctx.hasCondenseAbility ? camH - 148 : camH - 96;
    if (ctx.loopButtonBg?.active) {
      ctx.loopButtonBg.setPosition(loopX, loopY);
    }
    if (ctx.loopButtonLabel?.active) {
      ctx.loopButtonLabel.setPosition(loopX, loopY);
    }
    if (ctx.loopButtonZone?.active) {
      ctx.loopButtonZone.setPosition(loopX, loopY);
    }

    const observeX = actionBtnX;
    const observeY = ctx.levelData?.timeLoop
      ? ctx.hasCondenseAbility
        ? camH - 200
        : camH - 148
      : ctx.hasCondenseAbility
        ? camH - 148
        : camH - 96;
    if (ctx.observeButtonBg?.active) {
      ctx.observeButtonBg.setPosition(observeX, observeY);
    }
    if (ctx.observeButtonLabel?.active) {
      ctx.observeButtonLabel.setPosition(observeX, observeY);
    }
    if (ctx.observeButtonZone?.active) {
      ctx.observeButtonZone.setPosition(observeX, observeY);
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
    if (ctx.acceleratorMode) {
      if (ctx.coherenceBarGraphics?.active) {
        ctx.coherenceBarGraphics.clear();
      }
      return;
    }
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
      const barH = 6;
      const barY = 54 - barH;

      gfx.clear();
      gfx.fillStyle(0x1e293b, 0.8);
      gfx.fillRect(trackX, barY, trackW, barH);
      if (value > 0 && trackW > 0) {
        const fillW = Math.max(3, Math.round(trackW * value));
        gfx.fillStyle(colorNum, tier === 'HYPER' ? 1.0 : 0.92);
        gfx.fillRect(trackX, barY, fillW, barH);
        if (tier === 'x3' || tier === 'HYPER') {
          gfx.fillStyle(0xffffff, tier === 'HYPER' ? 0.5 : 0.28);
          gfx.fillRect(trackX, barY, fillW, 2);
        }
      }
    }

    if (ctx.coherenceTierText?.active) {
      const label = tier === 'HYPER' ? (camW < 440 ? 'HYPER' : '⚡ HYPER') : tier;
      ctx.coherenceTierText.setText(label);
      ctx.coherenceTierText.setColor(colorHex);
      ctx.coherenceTierText.setAlpha(value > 0 ? 1 : 0.45);
      if (tier !== 'HYPER') {
        ctx.coherenceTierText.setScale?.(1);
      }
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
    const showCondense = Boolean(ctx.hasCondenseAbility);
    if (ctx.condenseButtonBg?.active) {
      ctx.condenseButtonBg.setVisible(showCondense);
    }
    if (ctx.condenseButtonLabel?.active) {
      ctx.condenseButtonLabel.setVisible(showCondense);
    }
    if (ctx.condenseButtonZone?.active) {
      ctx.condenseButtonZone.setVisible(showCondense);
    }
    if (ctx.timeLoopIndicatorText?.active && ctx.timeLoopSystem?.isActive()) {
      const s = getStrings(useGameStore.getState().locale ?? 'en');
      const remMs = ctx.timeLoopSystem.getRemainingMs();
      const remSec = (remMs / 1000).toFixed(1);
      ctx.timeLoopIndicatorText.setText(
        s.hud.timeLoopStatus(
          ctx.timeLoopSystem.getEchoCount(),
          ctx.timeLoopSystem.getMaxEchoes(),
          remSec
        )
      );
      ctx.timeLoopIndicatorText.setColor(remMs <= 1000 ? '#f43f5e' : '#00e5ff');
    }
    this.layoutRow2Indicators(ctx.cameras?.main?.width ?? 800);
    this.updateCoherenceGauge();
    if (ctx.coherenceTierText?.active && ctx.lastCoherenceTier === 'HYPER') {
      const nowMs = ctx.time?.now ?? Date.now();
      const pulse = 1 + 0.12 * Math.sin(nowMs * 0.012);
      ctx.coherenceTierText.setScale?.(pulse);
    }
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
