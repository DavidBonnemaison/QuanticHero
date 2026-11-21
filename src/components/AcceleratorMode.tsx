import Phaser from 'phaser';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeViewportSize, getInitialViewportSize } from '../config';
import { getStrings } from '../i18n/strings';
import {
  AcceleratorRunManager,
  type AcceleratorRunState
} from '../roguelite/AcceleratorRunManager';
import {
  type MutationRarity,
  findPotentialSynergies,
  getMutationById
} from '../roguelite/mutations';
import BootScene from '../scenes/BootScene';
import GameScene from '../scenes/GameScene';
import PreloadScene from '../scenes/PreloadScene';
import {
  buildAcceleratorShareText,
  generateAcceleratorCard
} from '../services/AcceleratorCardGenerator';
import { formatCardTime } from '../services/ReplayCardGenerator';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import styles from './AcceleratorMode.module.css';

export interface AcceleratorModeProps {
  runManager?: AcceleratorRunManager;
  disablePhaser?: boolean;
}

function HeartSvg({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${styles.heartIcon} ${filled ? styles.heartFull : styles.heartEmpty}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8 14s-5.5-3.4-6.8-6.6C.2 4.9 1.6 2 4.4 2c1.6 0 2.9.9 3.6 2.1C8.7 2.9 10 2 11.6 2c2.8 0 4.2 2.9 3.2 5.4C13.5 10.6 8 14 8 14z"
      />
    </svg>
  );
}

function getRarityCardClass(rarity: MutationRarity): string {
  switch (rarity) {
    case 'Exotic':
      return styles.rarityExotic;
    case 'Rare':
      return styles.rarityRare;
    default:
      return styles.rarityCommon;
  }
}

function getRarityBadgeClass(rarity: MutationRarity): string {
  switch (rarity) {
    case 'Exotic':
      return styles.rarityBadgeExotic;
    case 'Rare':
      return styles.rarityBadgeRare;
    default:
      return styles.rarityBadgeCommon;
  }
}

export default function AcceleratorMode({
  runManager: injectedManager,
  disablePhaser = false
}: AcceleratorModeProps): React.ReactElement {
  const navigate = useNavigate();
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);

  const managerRef = useRef<AcceleratorRunManager>(injectedManager ?? new AcceleratorRunManager());
  const gameRef = useRef<Phaser.Game | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [runState, setRunState] = useState<AcceleratorRunState>(() => {
    const mgr = managerRef.current;
    if (mgr.getState().status === 'idle') {
      return mgr.startRun();
    }
    return mgr.getState();
  });
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const getActiveGameScene = useCallback((): GameScene | null => {
    const game = gameRef.current;
    if (!game?.scene) return null;
    const scene = game.scene.getScene('Game') as GameScene | undefined;
    return scene ?? null;
  }, []);

  // Subscribe to AcceleratorRunManager updates
  useEffect(() => {
    const mgr = managerRef.current;
    return mgr.subscribe((nextState) => {
      setRunState(nextState);
    });
  }, []);

  // Bridge Phaser GameScene events <-> AcceleratorRunManager (Zero-Cut)
  useEffect(() => {
    const mgr = managerRef.current;

    const unsubRoomCleared = gameEvents.on('accelerator:room_cleared', ({ elapsedMs }) => {
      mgr.completeRoom(elapsedMs);
    });

    const unsubLifeLost = gameEvents.on('accelerator:life_lost', ({ deathPos }) => {
      const { gameOver } = mgr.loseLife();
      const scene = getActiveGameScene();
      if (!scene) return;
      if (gameOver) {
        scene.isLevelCompleted = true;
      } else {
        scene.quickRespawn(deathPos);
      }
    });

    return () => {
      unsubRoomCleared();
      unsubLifeLost();
    };
  }, [getActiveGameScene]);

  // Mount Phaser once for the entire Endless Run (Zero-Cut between chambers)
  useEffect(() => {
    if (disablePhaser) return;

    const initialChamber = managerRef.current.getState().currentChamber;
    if (initialChamber) {
      const store = useGameStore.getState();
      store.setActiveDuel(null);
      store.setSharedLevel(initialChamber);
    }

    const resolveStageSize = () => {
      const el = stageRef.current;
      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        return { width: el.clientWidth, height: el.clientHeight };
      }
      if (typeof window !== 'undefined') {
        const computed = computeViewportSize(window.innerWidth, window.innerHeight);
        return { width: computed.width, height: computed.height };
      }
      const fallback = getInitialViewportSize();
      return { width: fallback.width, height: fallback.height };
    };

    const handleResize = () => {
      const game = gameRef.current;
      if (!game?.scale) return;
      const { width, height } = resolveStageSize();
      if (width > 0 && height > 0) {
        game.scale.resize(width, height);
      }
    };

    const { width, height } = resolveStageSize();
    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: stageRef.current ?? 'accelerator-game',
      width,
      height,
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: stageRef.current ?? 'accelerator-game',
        width,
        height,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 700 },
          tileBias: 32,
          fps: 120,
          fixedStep: true,
          debug: false
        }
      },
      scene: [BootScene, PreloadScene, GameScene]
    };

    const gameInstance = new Phaser.Game(gameConfig);
    gameRef.current = gameInstance;
    window.game = gameInstance;

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      useGameStore.getState().setSharedLevel(null);
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch {
          // safe cleanup
        }
        gameRef.current = null;
        window.game = null;
      }
    };
  }, [disablePhaser]);

  const handleChooseMutation = useCallback(
    (choiceIndex: 0 | 1) => {
      const mgr = managerRef.current;
      const nextState = mgr.chooseMutation(choiceIndex);
      if (nextState.currentChamber) {
        const scene = getActiveGameScene();
        if (scene) {
          scene.loadAcceleratorChamber(nextState.currentChamber, mgr.getAggregatedModifiers());
        } else {
          useGameStore.getState().setSharedLevel(nextState.currentChamber);
        }
      }
    },
    [getActiveGameScene]
  );

  const handleNewRun = useCallback(() => {
    setCopiedFeedback(false);
    const mgr = managerRef.current;
    const nextState = mgr.startRun();
    if (nextState.currentChamber) {
      const scene = getActiveGameScene();
      if (scene) {
        scene.loadAcceleratorChamber(nextState.currentChamber, mgr.getAggregatedModifiers());
      } else {
        useGameStore.getState().setSharedLevel(nextState.currentChamber);
      }
    }
  }, [getActiveGameScene]);

  // Keyboard shortcuts [1] / [2] during mutation selection
  useEffect(() => {
    if (runState.status !== 'choosing_mutation') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '1' || event.code === 'Digit1' || event.code === 'Numpad1') {
        event.preventDefault();
        handleChooseMutation(0);
      } else if (event.key === '2' || event.code === 'Digit2' || event.code === 'Numpad2') {
        event.preventDefault();
        handleChooseMutation(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runState.status, handleChooseMutation]);

  const handleDownloadCard = useCallback(async () => {
    const blob = await generateAcceleratorCard({
      maxZ: runState.currentZ,
      roomsCleared: runState.roomsCleared,
      totalTimeMs: runState.totalTimeMs,
      mutations: runState.activeMutations,
      isNewRecord: runState.isNewRecord,
      locale
    });
    if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quantum-hero-accelerator-z${runState.currentZ}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [runState, locale]);

  const handleCopySummary = useCallback(async () => {
    const text = buildAcceleratorShareText({
      maxZ: runState.currentZ,
      roomsCleared: runState.roomsCleared,
      totalTimeMs: runState.totalTimeMs,
      mutations: runState.activeMutations,
      isNewRecord: runState.isNewRecord,
      locale
    });
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2400);
    } catch {
      setCopiedFeedback(false);
    }
  }, [runState, locale]);

  const heartSlots = Array.from({ length: Math.max(1, runState.maxLives) }, (_, idx) => idx);

  return (
    <div className={styles.viewport} data-testid="accelerator-mode">
      {/* Dedicated Accelerator HUD */}
      <header className={styles.hudBar} data-testid="accelerator-hud">
        <div className={styles.hudLeft}>
          <button
            type="button"
            className={styles.hudExitBtn}
            onClick={() => navigate('/modes')}
            data-testid="accelerator-exit-btn"
          >
            {t.accelerator.backToModes}
          </button>
          <span className={styles.elementPill} data-testid="accelerator-z-badge">
            Z = {runState.currentZ} · {runState.element.symbol} · {runState.element.name}
          </span>
        </div>

        <div className={styles.hudCenter}>
          <div
            className={styles.heartsRow}
            aria-label={`${t.accelerator.livesLabel} ${runState.lives}/${runState.maxLives}`}
            data-testid="accelerator-lives"
          >
            <span>{t.accelerator.livesLabel}</span>
            {heartSlots.map((slot) => (
              <HeartSvg key={slot} filled={slot < runState.lives} />
            ))}
          </div>
          <span className={styles.statChip} data-testid="accelerator-rooms">
            {t.accelerator.roomsLabel(runState.roomsCleared)}
          </span>
          <span className={styles.statChip} data-testid="accelerator-time">
            {formatCardTime(runState.totalTimeMs)}
          </span>
        </div>

        <div className={styles.hudRight}>
          <div className={styles.mutationStrip} data-testid="accelerator-active-mutations">
            <span className={styles.statChip}>
              {t.accelerator.mutationsLabel(runState.activeMutations.length)}
            </span>
            {runState.activeMutations.slice(-4).map((id, index) => {
              const def = getMutationById(id);
              return (
                <span key={`${id}-${index}`} className={styles.mutationTag}>
                  {def ? def.icon : id}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      {/* Live Zero-Cut Phaser Stage */}
      <div id="accelerator-game" ref={stageRef} className={styles.gameStage} />

      {/* Ultra-Fast Mutation Draft Overlay (Zero-Cut over live Phaser) */}
      {runState.status === 'choosing_mutation' && runState.pendingChoices && (
        <div className={styles.overlayBackdrop} data-testid="mutation-choice-overlay">
          <div className={styles.modalPanel} role="dialog" aria-modal="true">
            <div className={styles.fusionHeader}>
              <span>
                {t.accelerator.fusionHeader(
                  runState.currentZ,
                  runState.element.symbol,
                  runState.element.name
                )}
              </span>
              {runState.lastFusionDelta > 1 && (
                <span className={styles.surgeBadge}>{t.accelerator.fusionSurgeBadge}</span>
              )}
            </div>

            <h2 className={styles.modalTitle}>{t.accelerator.chooseMutationTitle}</h2>
            <p className={styles.modalHint}>{t.accelerator.chooseMutationHint}</p>

            <div className={styles.choicesGrid}>
              {runState.pendingChoices.map((mutation, idx) => {
                const choiceIdx = idx as 0 | 1;
                const synergies = findPotentialSynergies(runState.activeMutations, mutation.id);
                return (
                  <button
                    key={mutation.id}
                    type="button"
                    className={`${styles.mutationCard} ${getRarityCardClass(mutation.rarity)}`}
                    onClick={() => handleChooseMutation(choiceIdx)}
                    data-testid={`mutation-choice-${choiceIdx + 1}`}
                  >
                    <div className={styles.cardTopRow}>
                      <span className={styles.keyBadge}>
                        {t.accelerator.keyHint(choiceIdx + 1)}
                      </span>
                      <span
                        className={`${styles.rarityBadge} ${getRarityBadgeClass(mutation.rarity)}`}
                      >
                        {t.accelerator.rarityLabel(mutation.rarity)}
                      </span>
                    </div>
                    <div className={styles.cardIconName}>
                      <span className={styles.arcadeIcon}>{mutation.icon}</span>
                      <span className={styles.cardName}>
                        {locale === 'fr' ? mutation.nameFr : mutation.nameEn}
                      </span>
                    </div>
                    <div className={styles.cardDesc}>
                      {locale === 'fr' ? mutation.descriptionFr : mutation.descriptionEn}
                    </div>
                    {synergies.length > 0 && (
                      <div className={styles.synergyBanner} data-testid="mutation-synergy-hint">
                        {t.accelerator.synergyDetected(
                          locale === 'fr' ? synergies[0].nameFr : synergies[0].nameEn
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shareable End-of-Run Summary Overlay */}
      {runState.status === 'gameover' && (
        <div className={styles.overlayBackdrop} data-testid="accelerator-gameover-overlay">
          <div className={styles.modalPanel} role="dialog" aria-modal="true">
            <h2 className={styles.modalTitle}>{t.accelerator.runOverTitle}</h2>
            {runState.isNewRecord && (
              <div className={styles.newRecordPill} data-testid="accelerator-new-record">
                {t.accelerator.newRecordBadge}
              </div>
            )}

            <div className={styles.summaryStatsGrid}>
              <div className={styles.summaryStatBox}>
                <div className={styles.summaryStatLabel}>{t.accelerator.reachedZLabel}</div>
                <div className={styles.summaryStatValue} data-testid="summary-max-z">
                  Z = {runState.currentZ} ({runState.element.symbol})
                </div>
              </div>
              <div className={styles.summaryStatBox}>
                <div className={styles.summaryStatLabel}>{t.accelerator.roomsClearedLabel}</div>
                <div className={styles.summaryStatValue} data-testid="summary-rooms">
                  {runState.roomsCleared}
                </div>
              </div>
              <div className={styles.summaryStatBox}>
                <div className={styles.summaryStatLabel}>{t.accelerator.totalTimeLabel}</div>
                <div className={styles.summaryStatValue} data-testid="summary-time">
                  {formatCardTime(runState.totalTimeMs)}
                </div>
              </div>
            </div>

            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>{t.accelerator.mutationsSection}</div>
              <div className={styles.chipsWrap}>
                {runState.activeMutations.length === 0 ? (
                  <span className={styles.summaryChip}>{t.accelerator.noMutations}</span>
                ) : (
                  runState.activeMutations.map((id, i) => {
                    const def = getMutationById(id);
                    return (
                      <span key={`${id}-${i}`} className={styles.summaryChip}>
                        {def ? `${def.icon} ${locale === 'fr' ? def.nameFr : def.nameEn}` : id}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {runState.activeSynergies.length > 0 && (
              <div className={styles.summarySection}>
                <div className={styles.summarySectionTitle}>{t.accelerator.synergiesSection}</div>
                <div className={styles.chipsWrap}>
                  {runState.activeSynergies.map((syn) => (
                    <span key={syn.id} className={`${styles.summaryChip} ${styles.synergyChip}`}>
                      [SYN] {locale === 'fr' ? syn.nameFr : syn.nameEn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void handleDownloadCard()}
                data-testid="accelerator-download-card"
              >
                {t.accelerator.downloadCard}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void handleCopySummary()}
                data-testid="accelerator-copy-summary"
              >
                {copiedFeedback ? t.accelerator.summaryCopied : t.accelerator.copySummary}
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleNewRun}
                data-testid="accelerator-new-run"
              >
                {t.accelerator.newRun}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => navigate('/modes')}
                data-testid="accelerator-to-modes"
              >
                {t.accelerator.modesHub}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
