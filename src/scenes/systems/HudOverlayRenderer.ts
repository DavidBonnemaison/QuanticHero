import { soundManager } from '../../audio/SoundManager';
import { getNarrativeForLevel } from '../../data/cosmicNarrative';
import { getLevelMetadata } from '../../data/levels';
import { getStrings } from '../../i18n/strings';
import { getMedalDisplayInfo } from '../../services/MedalService';
import { push } from '../../shims/navigation';
import { useGameStore } from '../../store';
import { formatScore } from '../../tools/formatScore';
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

  const title = ctx.add.text(
    ctx.cameras.main.width / 2,
    ctx.cameras.main.height / 2,
    `${ctx.levelData.id} - ${ctx.levelData.atom}`,
    {
      fontFamily: 'VT323',
      fontSize: '48px',
      color: ctx.levelData.antiHue,
      align: 'center'
    }
  );
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

const activeToastMap = new WeakMap<
  GameSceneContext,
  { destroy: () => void }
>();

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
    fontFamily: 'VT323',
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

  const locale = useGameStore.getState().locale ?? 'en';
  const t = getStrings(locale);
  const camW = ctx.cameras.main.width;
  const camH = ctx.cameras.main.height;

  const overlay = ctx.add.container(0, 0);
  overlay.setScrollFactor(0);
  overlay.setDepth(200);
  overlay.setAlpha(0);
  ctx.levelCompleteOverlay = overlay;

  const backdrop = ctx.add.rectangle(camW / 2, camH / 2, camW, camH, 0x050814, 0.72);
  backdrop.setInteractive();
  backdrop.on('pointerdown', () => {
    if (ctx.canAdvanceLevel && nextLevelNumber !== null) {
      ctx.advanceToNextLevel();
    }
  });
  overlay.add(backdrop);

  const cardW = Math.min(620, camW - 36);
  const isCompact = cardW < 520;
  const cardH = isCompact ? 344 : 264;
  const cardBg = ctx.add.rectangle(camW / 2, camH / 2, cardW, cardH, 0x0b0f19, 0.94);
  cardBg.setStrokeStyle(2, 0x00e5ff, 0.9);
  overlay.add(cardBg);

  const symbol = ctx.levelData.symbol || '?';
  const atom = ctx.levelData.atom || 'Element';
  const headerText = ctx.add.text(
    camW / 2,
    camH / 2 - (isCompact ? 136 : 96),
    t.hud.elementSynthesized(symbol, atom.toUpperCase()),
    {
      fontFamily: 'VT323',
      fontSize: isCompact ? '20px' : '28px',
      color: '#00e5ff',
      align: 'center',
      wordWrap: { width: cardW - 24 }
    }
  );
  headerText.setOrigin(0.5);
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
    camH / 2 - (isCompact ? 96 : 60),
    `${formatScore(elapsedMs)}  •  ${t.hud.rec} ${formatScore(bestMs)}  •  ${deltaLabel}`,
    {
      fontFamily: 'VT323',
      fontSize: isCompact ? '16px' : '22px',
      color: prevBestMs === 0 || elapsedMs <= prevBestMs ? '#34d399' : '#f8fafc',
      align: 'center',
      wordWrap: { width: cardW - 24 }
    }
  );
  statsText.setOrigin(0.5);
  overlay.add(statsText);

  const medalText = ctx.add.text(
    camW / 2,
    camH / 2 - (isCompact ? 64 : 34),
    `${medalInfo.symbol} ${medalInfo.label.toUpperCase()}  •  ${t.hud.jumps(ctx.jumpCount)}`,
    {
      fontFamily: 'VT323',
      fontSize: isCompact ? '15px' : '19px',
      color: medalInfo.color,
      align: 'center',
      wordWrap: { width: cardW - 24 }
    }
  );
  medalText.setOrigin(0.5);
  overlay.add(medalText);

  const currentLvl = Number(ctx.levelData.id) || 1;
  const narrativeLines =
    ctx.levelData.explanations && ctx.levelData.explanations.length > 0
      ? ctx.levelData.explanations.slice(0, 2)
      : getNarrativeForLevel(currentLvl).slice(0, 2);

  const narrativeText = ctx.add.text(
    camW / 2,
    camH / 2 - (isCompact ? 16 : -2),
    narrativeLines.join('\n'),
    {
      fontFamily: 'VT323',
      fontSize: isCompact ? '16px' : '18px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: cardW - 36 }
    }
  );
  narrativeText.setOrigin(0.5);
  overlay.add(narrativeText);

  const nextLevelData =
    nextLevelNumber !== null
      ? ctx.resolveLevelData(nextLevelNumber) || getLevelMetadata(nextLevelNumber)
      : undefined;
  const primaryLabel = nextLevelData
    ? t.hud.nextLevel(nextLevelData.symbol, nextLevelData.atom)
    : t.hud.levelsButton;

  const nextBtn = ctx.add.text(camW / 2, camH / 2 + 78, primaryLabel, {
    fontFamily: 'VT323',
    fontSize: isCompact ? '20px' : '22px',
    color: '#00ffcc',
    backgroundColor: '#083344',
    padding: { x: 12, y: 6 },
    wordWrap: { width: cardW - 32 }
  });
  nextBtn.setOrigin(0.5);
  nextBtn.setInteractive({ useHandCursor: true });
  nextBtn.on('pointerdown', () => {
    ctx.uiPointerConsumed = true;
    if (nextLevelNumber !== null) {
      ctx.advanceToNextLevel();
    } else {
      soundManager.stopBgm();
      useGameStore.getState().setSharedLevel(null);
      try {
        ctx.game.destroy(true);
      } catch {
        // safe
      }
      window.game = null;
      push('/levels');
    }
  });
  overlay.add(nextBtn);

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
