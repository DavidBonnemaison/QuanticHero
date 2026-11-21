import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../audio/SoundManager';
import { getLevelMetadata } from '../data/levels';
import { getStrings } from '../i18n/strings';
import {
  getDailyIsotopePreview,
  getPreviousDateKey,
  getTimeUntilNextDailyUtc
} from '../services/DailyIsotopeService';
import { useGameStore } from '../store';
import { hapticFeedback } from '../tools/HapticFeedback';
import formatScore from '../tools/formatScore';
import { MAX_CLASSIC_LEVEL } from '../tools/levelProgression';
import styles from './Menu.module.css';
import QuantumOrbitalBackground from './QuantumOrbitalBackground';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function Menu(): React.ReactElement {
  const navigate = useNavigate();
  const currentLevel = useGameStore((state) => state.currentLevel);
  const maxLevel = useGameStore((state) => state.maxLevel);
  const scores = useGameStore((state) => state.scores);
  const dailyHistory = useGameStore((state) => state.dailyHistory ?? {});
  const dailyStreak = useGameStore(
    (state) => state.dailyStreak ?? { current: 0, longest: 0, lastCompletedDate: null }
  );
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleMute = useGameStore((state) => state.toggleMute);
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const toggleHaptics = useGameStore((state) => state.toggleHaptics);
  const reducedEffects = useGameStore((state) => state.reducedEffects);
  const toggleReducedEffects = useGameStore((state) => state.toggleReducedEffects);
  const heroSkin = useGameStore((state) => state.heroSkin ?? 'gameboy');
  const toggleHeroSkin = useGameStore((state) => state.toggleHeroSkin);
  const locale = useGameStore((state) => state.locale ?? 'en');
  const toggleLocale = useGameStore((state) => state.toggleLocale);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState(() => getTimeUntilNextDailyUtc());

  const t = getStrings(locale);
  const dailyPreview = getDailyIsotopePreview();
  const todayDailyEntry = dailyHistory[dailyPreview.dateKey];
  const isStreakActive =
    dailyStreak.lastCompletedDate === dailyPreview.dateKey ||
    dailyStreak.lastCompletedDate === getPreviousDateKey(dailyPreview.dateKey);
  const effectiveStreak = isStreakActive ? dailyStreak.current : 0;
  const hasProgress = maxLevel > 1 || Object.keys(scores).length > 0;
  const resumeLevel =
    currentLevel >= 1 && currentLevel <= MAX_CLASSIC_LEVEL
      ? currentLevel
      : Math.min(Math.max(maxLevel, 1), MAX_CLASSIC_LEVEL);
  const resumeMeta = getLevelMetadata(resumeLevel);
  const resumeSymbol = resumeMeta?.symbol ?? '?';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDailyCountdown(getTimeUntilNextDailyUtc());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasActiveDuelLink =
      window.location.hash.includes('duel=') || window.location.search.includes('duel=');
    if (!hasActiveDuelLink) {
      useGameStore.getState().setActiveDuel(null);
    }
    hapticFeedback.init();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const startFreshGame = () => {
    useGameStore.getState().resetGame();
    updateCurrentLevel(1);
    setShowResetConfirm(false);
    navigate('/explanation');
  };

  const handleContinue = () => {
    setSharedLevel(null);
    updateCurrentLevel(resumeLevel);
    navigate('/game');
  };

  const handleDailyIsotope = () => {
    navigate('/daily');
  };

  const handleNewGameClick = () => {
    if (hasProgress) {
      setShowResetConfirm(true);
      return;
    }
    startFreshGame();
  };

  const handleGoToLevels = () => {
    navigate('/levels');
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleToggleSound = () => {
    soundManager.init();
    soundManager.ensureContext();
    toggleMute();
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) {
      hapticFeedback.triggerJump();
    }
  };

  const handleToggleEffects = () => {
    toggleReducedEffects();
  };

  return (
    <div className={styles.menuWrapper}>
      <div className={styles.topControls}>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleSound}
          aria-label={isMuted ? t.menu.unmuteSound : t.menu.muteSound}
          title={isMuted ? t.menu.unmuteSound : t.menu.muteSound}
        >
          {isMuted ? t.menu.soundOff : t.menu.soundOn}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleHaptics}
          aria-label={hapticsEnabled ? t.menu.disableHaptics : t.menu.enableHaptics}
          title={hapticsEnabled ? t.menu.disableHaptics : t.menu.enableHaptics}
        >
          {hapticsEnabled ? t.menu.hapticsOn : t.menu.hapticsOff}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleEffects}
          aria-label={reducedEffects ? t.menu.enableFullEffects : t.menu.enableReducedEffects}
          title={reducedEffects ? t.menu.enableFullEffects : t.menu.enableReducedEffects}
        >
          {reducedEffects ? t.menu.fxLo : t.menu.fxHi}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={toggleHeroSkin}
          aria-label={t.menu.switchSkinLabel}
          title={t.menu.switchSkinLabel}
          data-testid="skin-toggle"
        >
          {heroSkin === 'gameboy'
            ? t.menu.skinGameboy
            : heroSkin === 'neo'
              ? t.menu.skinNeo
              : heroSkin === 'quantum'
                ? t.menu.skinQuantum
                : t.menu.skinClassic}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={toggleLocale}
          aria-label={t.menu.switchLanguageLabel}
          title={t.menu.switchLanguageLabel}
          data-testid="locale-toggle"
        >
          <span className={locale === 'en' ? styles.langActive : styles.langInactive}>EN</span>
          <span>/</span>
          <span className={locale === 'fr' ? styles.langActive : styles.langInactive}>FR</span>
        </button>
      </div>
      <QuantumOrbitalBackground />
      <h1 className={styles.title}>{t.menu.title}</h1>
      <button
        type="button"
        className={styles.dailyCard}
        onClick={handleDailyIsotope}
        data-testid="daily-isotope-card"
      >
        <div className={styles.dailyCardHeader}>
          <span className={styles.dailyCardTitle}>
            {t.menu.dailyIsotopeTitle(dailyPreview.symbol, dailyPreview.atom)}
          </span>
          {effectiveStreak > 0 && (
            <span className={styles.dailyStreakBadge} data-testid="daily-streak-badge">
              {t.menu.dailyStreak(effectiveStreak)}
            </span>
          )}
        </div>
        <div className={styles.dailyCardMeta}>
          {todayDailyEntry ? (
            <span className={styles.dailyCompletedBadge} data-testid="daily-completed-status">
              {t.menu.dailyCompleted} · {t.menu.dailyBestTime(formatScore(todayDailyEntry.bestMs))}
            </span>
          ) : (
            <span className={styles.dailyDifficultyTag}>
              #{dailyPreview.z} · {t.menu.dailyDifficulty(dailyPreview.difficulty)}
            </span>
          )}
          <span className={styles.dailyCountdown} data-testid="daily-countdown">
            {t.menu.dailyNextIn(dailyCountdown.formatted)}
          </span>
        </div>
      </button>
      {hasProgress && (
        <button
          type="button"
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={handleContinue}
        >
          {t.menu.continueAtom(resumeLevel, resumeSymbol)}
        </button>
      )}
      {!hasProgress && (
        <button
          type="button"
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={handleNewGameClick}
        >
          {t.menu.newGame}
        </button>
      )}
      <button type="button" className={styles.button} onClick={handleGoToLevels}>
        {t.menu.periodicTable}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => navigate('/modes')}
        data-testid="quantum-modes-button"
      >
        {t.menu.quantumModes}
      </button>
      {hasProgress && (
        <button
          type="button"
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={handleNewGameClick}
        >
          {t.menu.newGame}
        </button>
      )}
      {installPrompt && (
        <button type="button" className={styles.button} onClick={handleInstallClick}>
          {t.menu.installApp}
        </button>
      )}

      {showResetConfirm && (
        <div className={styles.modalBackdrop} role="presentation">
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
          >
            <h2 id="reset-confirm-title" className={styles.modalTitle}>
              {t.menu.confirmResetTitle}
            </h2>
            <p className={styles.modalMessage}>{t.menu.confirmResetMessage}</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={() => setShowResetConfirm(false)}
              >
                {t.menu.cancel}
              </button>
              <button type="button" className={styles.modalConfirmButton} onClick={startFreshGame}>
                {t.menu.confirmResetAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
