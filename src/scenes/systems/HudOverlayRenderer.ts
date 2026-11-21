import { soundManager } from '../../audio/SoundManager';
import { getNextChronoLoopLevel } from '../../data/chronoLoopLevels';
import { getNarrativeForLevel } from '../../data/cosmicNarrative';
import { getLevelMetadata } from '../../data/levels';
import { getNextSchrodingerLevel } from '../../data/schrodingerLevels';
import { getStrings } from '../../i18n/strings';
import { getMedalDisplayInfo } from '../../services/MedalService';
import { shareReplayCard } from '../../services/ReplayCardGenerator';
import { push } from '../../shims/navigation';
import { useGameStore } from '../../store';
import { formatScore } from '../../tools/formatScore';
import {
  DEFAULT_CHALLENGER_NAME,
  buildDuelFromLastRun,
  encodeDuelToUrl,
  formatDuelSeconds
} from '../../tools/levelCodec';
import type { IsotopeMedal } from '../../types';
import type { GameSceneContext } from './types';

/**
 * Renders HUD overlays: level entry title banner, diegetic retro toasts,
 * and the in-canvas Element Synthesized end-of-level summary overlay.
 */
export function showLevelTitle(ctx: GameSceneContext): void {
  if (ctx.lastShownLevelId === ctx.levelData.id) {
    return;
  }
  ctx.lastShownLevelId = ctx.levelData.id;

  const camW = ctx.cameras.main.width;
  const rawId = String(ctx.levelData.id ?? '');
  const titleText = rawId.startsWith('daily:')
    ? `DAILY — ${ctx.levelData.symbol} ${ctx.levelData.atom}`
    : `${ctx.levelData.id} - ${ctx.levelData.atom}`;

  const title = ctx.add.text(camW / 2, ctx.cameras.main.height / 2, titleText, {
    fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
    fontSize: camW < 480 ? '30px' : '46px',
    color: ctx.levelData.antiHue,
    align: 'center',
    wordWrap: { width: Math.max(240, camW - 32) }
  });
  title.setOrigin(0.5);
  title.setScrollFactor(0);
  title.setDepth(90);

  ctx.tweens.add({
    targets: title,
    alpha: 0,
    delay: 1500,
    duration: 700,
    onComplete: () => title.destroy()
  });
}

const activeToastMap = new WeakMap<GameSceneContext, { destroy: () => void }>();

export function showRetroToast(ctx: GameSceneContext, message: string): void {
  if (!message) return;

  const prev = activeToastMap.get(ctx);
  if (prev) {
    try {
      prev.destroy();
    } catch {
      // Ignore already-destroyed game objects
    }
    activeToastMap.delete(ctx);
  }

  const camW = ctx.cameras?.main?.width || 800;
  const startX = camW / 2;
  const startY = 88;
  const accentHex = ctx.levelData?.antiHue || '#38bdf8';
  const accentColor = Number.parseInt(accentHex.replace('#', ''), 16) || 0x38bdf8;

  const toast = ctx.add.text(startX, startY, message, {
    fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
    fontSize: '36px',
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#050814',
    strokeThickness: 5,
    align: 'center'
  });
  toast.setOrigin(0.5);
  toast.setScrollFactor?.(0);
  toast.setAlpha(1);
  toast.setDepth(121);

  const pillWidth = Math.min(camW - 32, Math.max(220, message.length * 18 + 44));
  const pill =
    typeof ctx.add.rectangle === 'function'
      ? ctx.add.rectangle(startX, startY, pillWidth, 48, 0x050814, 0.85)
      : null;
  if (pill) {
    pill.setOrigin?.(0.5);
    pill.setScrollFactor?.(0);
    pill.setStrokeStyle?.(2, accentColor, 0.95);
    pill.setDepth?.(120);
  }

  const cleanup = () => {
    if (toast?.active !== false) toast.destroy?.();
    if (pill && pill.active !== false) pill.destroy?.();
    if (activeToastMap.get(ctx) === handle) {
      activeToastMap.delete(ctx);
    }
  };
  const handle = { destroy: cleanup };
  activeToastMap.set(ctx, handle);

  const targets = pill ? [pill, toast] : [toast];
  ctx.tweens.add({
    targets,
    y: startY - 12,
    alpha: 0,
    delay: 1600,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: cleanup
  });
}

export function showLevelCompleteOverlay(
  ctx: GameSceneContext,
  elapsedMs: number,
  bestMs: number,
  prevBestMs: number,
  nextLevelNumber: number | null,
  medal: IsotopeMedal = 'bronze'
): void {
  if (!ctx.add?.container || !ctx.cameras?.main) return;

  const store = useGameStore.getState();
  const locale = store.locale ?? 'en';
  const t = getStrings(locale);
  const activeDuel = store.activeDuel;
  const camW = ctx.cameras.main.width;
  const camH = ctx.cameras.main.height;

  const overlay = ctx.add.container(0, 0);
  overlay.setScrollFactor(0);
  overlay.setDepth(200);
  overlay.setAlpha(0);
  const camZoom = ctx.cameras.main.zoom ?? 1;
  if (camZoom > 0) {
    const inv = 1 / camZoom;
    overlay.setScale?.(inv);
    overlay.setPosition?.((camW / 2) * (1 - inv), (camH / 2) * (1 - inv));
  }
  ctx.betaPipCamera?.ignore?.(overlay);
  ctx.levelCompleteOverlay = overlay;

  type PhaserPointerEvent = { stopPropagation?: () => void } | undefined;

  const backdrop = ctx.add.rectangle(camW / 2, camH / 2, camW, camH, 0x050814, 0.72);
  backdrop.setScrollFactor?.(0);
  backdrop.setInteractive();
  backdrop.on('pointerdown', () => {
    if (ctx.uiPointerConsumed) return;
    ctx.uiPointerConsumed = true;
    if (!activeDuel && ctx.canAdvanceLevel && nextLevelNumber !== null) {
      ctx.advanceToNextLevel();
    }
  });
  overlay.add(backdrop);

  const cardW = Math.min(620, camW - 36);
  const isCompact = cardW < 520;
  const cardH = activeDuel ? (isCompact ? 452 : 384) : isCompact ? 428 : 362;
  const cardBg = ctx.add.rectangle(camW / 2, camH / 2, cardW, cardH, 0x0b0f19, 0.94);
  cardBg.setScrollFactor?.(0);
  cardBg.setStrokeStyle(2, activeDuel ? 0xfbbf24 : 0x00e5ff, 0.9);
  cardBg.setInteractive();
  cardBg.on('pointerdown', (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
    ctx.uiPointerConsumed = true;
    ev?.stopPropagation?.();
  });
  overlay.add(cardBg);

  const buildCurrentDuelPayload = () => {
    const latestStore = useGameStore.getState();
    const run = latestStore.lastRun;
    return run
      ? buildDuelFromLastRun(run, DEFAULT_CHALLENGER_NAME)
      : buildDuelFromLastRun(
          {
            kind: 'campaign',
            levelId: Number(ctx.levelData.id) || 1,
            elapsedMs,
            jumps: ctx.jumpCount,
            ghostTrajectory: ctx.ghostRecorder?.getSerialized?.() ?? ''
          },
          DEFAULT_CHALLENGER_NAME
        );
  };

  const openDuelShare = (isRevenge: boolean) => {
    const latestStore = useGameStore.getState();
    latestStore.setPendingDuelShare({ duel: buildCurrentDuelPayload(), isRevenge });
  };

  const triggerShareCard = () => {
    const latestStore = useGameStore.getState();
    const latestLocale = latestStore.locale ?? 'en';
    const latestStrings = getStrings(latestLocale);
    const run = latestStore.lastRun;
    const isDuelWin = activeDuel ? elapsedMs < activeDuel.challengerTimeMs : false;
    const isDaily =
      run?.kind === 'daily' || /^daily:\d{4}-\d{2}-\d{2}$/.test(String(ctx.levelData.id ?? ''));
    const badge = isDuelWin ? 'DUEL VICTORY' : isDaily ? 'DAILY ISOTOPE' : undefined;
    const shareUrl = encodeDuelToUrl(buildCurrentDuelPayload());

    void shareReplayCard(
      {
        level: ctx.levelData,
        timeMs: elapsedMs,
        jumps: ctx.jumpCount,
        medal,
        coherenceTier: ctx.coherenceSystem?.getTier?.(),
        ghostTrajectory: run?.ghostTrajectory || ctx.ghostRecorder?.getSerialized?.() || undefined,
        badge,
        shareUrl,
        locale: latestLocale
      },
      { shareUrl }
    )
      .then((outcome) => {
        showRetroToast(
          ctx,
          outcome === 'shared'
            ? latestStrings.levelFinished.cardSharedToast
            : latestStrings.levelFinished.cardDownloadedToast
        );
      })
      .catch(() => {
        showRetroToast(ctx, latestStrings.levelFinished.cardErrorToast);
      });
  };

  if (activeDuel) {
    const deltaMs = elapsedMs - activeDuel.challengerTimeMs;
    const isVictory = elapsedMs < activeDuel.challengerTimeMs;
    const sign = deltaMs < 0 ? '-' : '+';
    const deltaStr = `${sign}${(Math.abs(deltaMs) / 1000).toFixed(2)}s`;

    const verdictText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 182 : 148),
      isVictory ? t.duel.victoryBadge(deltaStr) : t.duel.defeatBadge(deltaStr),
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '30px' : '38px',
        color: isVictory ? '#34d399' : '#f87171',
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    verdictText.setOrigin(0.5);
    verdictText.setScrollFactor?.(0);
    overlay.add(verdictText);

    const subtitleText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 142 : 108),
      isVictory
        ? t.duel.youBeat(activeDuel.challengerName, deltaStr)
        : t.duel.rivalTime(
            activeDuel.challengerName,
            formatDuelSeconds(activeDuel.challengerTimeMs)
          ),
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '18px' : '24px',
        color: '#fbbf24',
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    subtitleText.setOrigin(0.5);
    subtitleText.setScrollFactor?.(0);
    overlay.add(subtitleText);

    const medalInfo = getMedalDisplayInfo(medal, locale);
    const statsText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 102 : 70),
      `${formatScore(elapsedMs)}  •  ${t.hud.jumps(ctx.jumpCount)}  •  ${medalInfo.symbol} ${medalInfo.shortLabel}`,
      {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: isCompact ? '16px' : '21px',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    statsText.setOrigin(0.5);
    statsText.setScrollFactor?.(0);
    overlay.add(statsText);

    const revengeBtn = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 22 : 8),
      isVictory ? `⚔ ${t.duel.sendRevengeLink}` : `⚔ ${t.duel.challengeFriend.toUpperCase()}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '22px' : '28px',
        color: '#050814',
        backgroundColor: '#fbbf24',
        padding: { x: 18, y: 10 },
        wordWrap: { width: cardW - 32 }
      }
    );
    revengeBtn.setOrigin(0.5);
    revengeBtn.setScrollFactor?.(0);
    revengeBtn.setInteractive({ useHandCursor: true });
    revengeBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        openDuelShare(isVictory);
      }
    );
    overlay.add(revengeBtn);

    const duelShareCardBtn = ctx.add.text(
      camW / 2,
      camH / 2 + (isCompact ? 54 : 58),
      `🖼 ${t.hud.shareCardButton}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '19px' : '21px',
        color: '#00e5ff',
        backgroundColor: '#0c233c',
        padding: { x: 14, y: 6 },
        wordWrap: { width: cardW - 32 }
      }
    );
    duelShareCardBtn.setOrigin(0.5);
    duelShareCardBtn.setScrollFactor?.(0);
    duelShareCardBtn.setInteractive({ useHandCursor: true });
    duelShareCardBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        triggerShareCard();
      }
    );
    overlay.add(duelShareCardBtn);

    const rematchBtn = ctx.add.text(
      camW / 2 - (isCompact ? 76 : 96),
      camH / 2 + (isCompact ? 132 : 124),
      `↻ ${t.duel.rematch.toUpperCase()}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '20px' : '22px',
        color: '#00ffcc',
        backgroundColor: '#083344',
        padding: { x: 12, y: 6 }
      }
    );
    rematchBtn.setOrigin(0.5);
    rematchBtn.setScrollFactor?.(0);
    rematchBtn.setInteractive({ useHandCursor: true });
    rematchBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        useGameStore.getState().setPendingDuelShare(null);
        if (ctx.levelCompleteOverlay) {
          ctx.levelCompleteOverlay.destroy();
          ctx.levelCompleteOverlay = null;
        }
        ctx.isLevelCompleted = false;
        ctx.canAdvanceLevel = false;
        ctx.quickRespawn();
      }
    );
    overlay.add(rematchBtn);

    const exitBtn = ctx.add.text(
      camW / 2 + (isCompact ? 76 : 96),
      camH / 2 + (isCompact ? 132 : 124),
      t.hud.levelsButton,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '20px' : '22px',
        color: '#cbd5e1',
        backgroundColor: '#1e293b',
        padding: { x: 12, y: 6 }
      }
    );
    exitBtn.setOrigin(0.5);
    exitBtn.setScrollFactor?.(0);
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        soundManager.stopBgm();
        const s = useGameStore.getState();
        s.setSharedLevel(null);
        s.setActiveDuel(null);
        s.setPendingDuelShare(null);
        try {
          ctx.game.destroy(true);
        } catch {
          // safe
        }
        window.game = null;
        push('/levels');
      }
    );
    overlay.add(exitBtn);
  } else {
    const symbol = ctx.levelData.symbol || '?';
    const atom = ctx.levelData.atom || 'Element';
    const headerText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 174 : 138),
      t.hud.elementSynthesized(symbol, atom.toUpperCase()),
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '20px' : '28px',
        color: '#00e5ff',
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    headerText.setOrigin(0.5);
    headerText.setScrollFactor?.(0);
    overlay.add(headerText);

    let deltaLabel = t.hud.newRecord;
    if (prevBestMs > 0) {
      const diffSec = (elapsedMs - prevBestMs) / 1000;
      const sign = diffSec <= 0 ? '-' : '+';
      deltaLabel = `${sign}${Math.abs(diffSec).toFixed(2)}s`;
    }

    const medalInfo = getMedalDisplayInfo(medal, locale);
    const statsText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 134 : 102),
      `${formatScore(elapsedMs)}  •  ${t.hud.rec} ${formatScore(bestMs)}  •  ${deltaLabel}`,
      {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: isCompact ? '16px' : '22px',
        color: prevBestMs === 0 || elapsedMs <= prevBestMs ? '#34d399' : '#f8fafc',
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    statsText.setOrigin(0.5);
    statsText.setScrollFactor?.(0);
    overlay.add(statsText);

    const isCoherentRun = ctx.coherenceSystem?.isCoherentRun?.() ?? false;
    const styleScore = ctx.coherenceSystem?.getStyleScore?.() ?? 0;

    const medalText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? 102 : 74),
      `${medalInfo.symbol} ${medalInfo.label.toUpperCase()}  •  ${t.hud.jumps(ctx.jumpCount)}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '15px' : '19px',
        color: medalInfo.color,
        align: 'center',
        wordWrap: { width: cardW - 24 }
      }
    );
    medalText.setOrigin(0.5);
    medalText.setScrollFactor?.(0);
    overlay.add(medalText);

    if (isCoherentRun) {
      const coherentLabel =
        styleScore > 0 ? `⚡ COHERENT RUN  •  FLOW ${styleScore}` : '⚡ COHERENT RUN';
      const coherentBadge = ctx.add.text(
        camW / 2,
        camH / 2 - (isCompact ? 76 : 48),
        coherentLabel,
        {
          fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
          fontSize: isCompact ? '16px' : '20px',
          color: '#fbbf24',
          align: 'center',
          wordWrap: { width: cardW - 24 }
        }
      );
      coherentBadge.setOrigin(0.5);
      coherentBadge.setScrollFactor?.(0);
      overlay.add(coherentBadge);
    }

    const currentLvl = Number(ctx.levelData.id) || 1;
    const narrativeLines =
      ctx.levelData.explanations && ctx.levelData.explanations.length > 0
        ? ctx.levelData.explanations.slice(0, 2)
        : getNarrativeForLevel(currentLvl).slice(0, 2);

    const narrativeText = ctx.add.text(
      camW / 2,
      camH / 2 - (isCompact ? (isCoherentRun ? 32 : 44) : isCoherentRun ? 12 : 24),
      narrativeLines.join('\n'),
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '16px' : '18px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: cardW - 36 }
      }
    );
    narrativeText.setOrigin(0.5);
    narrativeText.setScrollFactor?.(0);
    overlay.add(narrativeText);

    const rawId = String(ctx.levelData.id ?? '');
    const isChronoLevel = /^chrono-\d+$/i.test(rawId);
    const isSchrodingerLevel = /^schrodinger-\d+$/i.test(rawId);
    const isQuantumModeLevel = isChronoLevel || isSchrodingerLevel;
    const nextChronoEntry = isChronoLevel ? getNextChronoLoopLevel(rawId.toLowerCase()) : undefined;
    const nextSchrodingerEntry = isSchrodingerLevel
      ? getNextSchrodingerLevel(rawId.toLowerCase())
      : undefined;
    const nextModeEntry = nextChronoEntry ?? nextSchrodingerEntry;

    const nextLevelData = nextModeEntry
      ? nextModeEntry.levelData
      : nextLevelNumber !== null
        ? ctx.resolveLevelData(nextLevelNumber) || getLevelMetadata(nextLevelNumber)
        : undefined;
    const primaryLabel = nextLevelData
      ? t.hud.nextLevel(nextLevelData.symbol, nextLevelData.atom)
      : isQuantumModeLevel
        ? t.hud.modesButton
        : t.hud.levelsButton;

    const nextBtn = ctx.add.text(camW / 2, camH / 2 + (isCompact ? 56 : 48), primaryLabel, {
      fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
      fontSize: isCompact ? '20px' : '22px',
      color: '#00ffcc',
      backgroundColor: '#083344',
      padding: { x: 12, y: 6 },
      wordWrap: { width: cardW - 32 }
    });
    nextBtn.setOrigin(0.5);
    nextBtn.setScrollFactor?.(0);
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        if (nextLevelNumber !== null || nextModeEntry) {
          ctx.advanceToNextLevel();
        } else {
          soundManager.stopBgm();
          const s = useGameStore.getState();
          s.setSharedLevel(null);
          s.setActiveDuel(null);
          s.setPendingDuelShare(null);
          try {
            ctx.game.destroy(true);
          } catch {
            // safe
          }
          window.game = null;
          push(isQuantumModeLevel ? '/modes' : '/levels');
        }
      }
    );
    overlay.add(nextBtn);

    const challengeBtn = ctx.add.text(
      camW / 2,
      camH / 2 + (isCompact ? 112 : 98),
      `⚔ ${t.duel.challengeFriend.toUpperCase()}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '19px' : '21px',
        color: '#fbbf24',
        backgroundColor: '#422006',
        padding: { x: 14, y: 6 },
        wordWrap: { width: cardW - 32 }
      }
    );
    challengeBtn.setOrigin(0.5);
    challengeBtn.setScrollFactor?.(0);
    challengeBtn.setInteractive({ useHandCursor: true });
    challengeBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        openDuelShare(false);
      }
    );
    overlay.add(challengeBtn);

    const shareCardBtn = ctx.add.text(
      camW / 2,
      camH / 2 + (isCompact ? 166 : 146),
      `🖼 ${t.hud.shareCardButton}`,
      {
        fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
        fontSize: isCompact ? '19px' : '21px',
        color: '#00e5ff',
        backgroundColor: '#0c233c',
        padding: { x: 14, y: 6 },
        wordWrap: { width: cardW - 32 }
      }
    );
    shareCardBtn.setOrigin(0.5);
    shareCardBtn.setScrollFactor?.(0);
    shareCardBtn.setInteractive({ useHandCursor: true });
    shareCardBtn.on(
      'pointerdown',
      (_p: unknown, _lx: unknown, _ly: unknown, ev?: PhaserPointerEvent) => {
        ctx.uiPointerConsumed = true;
        ev?.stopPropagation?.();
        triggerShareCard();
      }
    );
    overlay.add(shareCardBtn);
  }

  const isNewPb = prevBestMs === 0 || elapsedMs <= prevBestMs;
  const isGold = medal === 'gold';
  if ((isNewPb || isGold) && !store.reducedEffects) {
    if (isGold) {
      ctx.cameras.main.flash?.(260, 251, 191, 36, false);
    } else {
      ctx.cameras.main.flash?.(220, 0, 229, 255, false);
    }
    if (ctx.add?.circle && ctx.tweens?.add) {
      const palette = isGold
        ? [0xfbbf24, 0xfde047, 0x00e5ff, 0xec4899]
        : [0x00e5ff, 0x34d399, 0xc084fc, 0xfbbf24];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const dist = 110 + (i % 3) * 45;
        const p = ctx.add.circle(
          camW / 2,
          camH / 2,
          4 + (i % 2) * 2,
          palette[i % palette.length],
          0.9
        );
        p.setScrollFactor?.(0);
        p.setDepth?.(205);
        overlay.add(p);
        ctx.tweens.add({
          targets: p,
          x: camW / 2 + Math.cos(angle) * dist,
          y: camH / 2 + Math.sin(angle) * dist,
          alpha: 0,
          scale: 0.25,
          duration: 620,
          ease: 'Cubic.easeOut',
          onComplete: () => p.destroy()
        });
      }
    }
  }

  if (ctx.tweens?.add) {
    ctx.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 280,
      ease: 'Sine.easeOut'
    });
  } else {
    overlay.setAlpha(1);
  }
}
