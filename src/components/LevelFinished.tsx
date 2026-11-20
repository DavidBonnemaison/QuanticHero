import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedLevel, getLevelMetadata, loadLevel } from '../data/levels';
import { getStrings } from '../i18n/strings';
import { getMedalDisplayInfo } from '../services/MedalService';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import { getNextLevelId } from '../tools/levelProgression';
import type { LevelData } from '../types';
import ShareModal from './Editor/ShareModal';
import styles from './LevelFinished.module.css';

export default function LevelFinished(): React.ReactElement {
  const navigate = useNavigate();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [loadedShareLevel, setLoadedShareLevel] = useState<LevelData | null>(null);

  const currentLevel = useGameStore((state) => state.currentLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const sharedLevel = useGameStore((state) => state.sharedLevel);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const saveSharedLevelToCustom = useGameStore((state) => state.saveSharedLevelToCustom);
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);

  const isShared = Boolean(sharedLevel);
  const levelIndex = isShared ? 0 : currentLevel === 115 ? 109 : Math.max(1, currentLevel - 1);
  const nextLevelId = isShared ? null : getNextLevelId(levelIndex);
  const currentLevelScore = scores[levelIndex] || { best: 0, last: 0 };
  const { last, best, medal, lastJumps } = currentLevelScore;
  const medalInfo = getMedalDisplayInfo(medal ?? (best > 0 ? 'bronze' : 'none'), locale);

  useEffect(() => {
    if (!isShared && levelIndex >= 1) {
      const cached = getCachedLevel(levelIndex);
      if (cached) {
        setLoadedShareLevel(cached);
      } else {
        void loadLevel(levelIndex).then((data) => {
          if (data) setLoadedShareLevel(data);
        });
      }
    }
  }, [isShared, levelIndex]);

  const currentLevelData =
    isShared && sharedLevel
      ? {
          id: sharedLevel.symbol || '★',
          hue: sharedLevel.hue || '#070737',
          antiHue: sharedLevel.antiHue || '#c56805',
          symbol: sharedLevel.symbol || '?',
          atom: sharedLevel.atom || t.levelFinished.customLevelFallback
        }
      : getLevelMetadata(levelIndex) || {
          id: String(levelIndex),
          hue: '#070737',
          antiHue: '#c56805',
          symbol: '?',
          atom: t.levelFinished.unknownFallback
        };

  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const handleNextLevel = () => {
    if (nextLevelId === null) {
      navigate('/levels');
      return;
    }
    updateCurrentLevel(nextLevelId);
    const nextLevelData = getLevelMetadata(nextLevelId);
    if (!nextLevelData) {
      navigate('/levels');
      return;
    }
    if (nextLevelData.explanations && nextLevelData.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleRetry = () => {
    if (!isShared) {
      updateCurrentLevel(levelIndex);
    }
    navigate('/game');
  };

  const handleGoToMenu = () => {
    if (isShared) {
      setSharedLevel(null);
    }
    navigate('/');
  };

  const handleSaveToMyLevels = () => {
    saveSharedLevelToCustom(1);
    setSaveMessage(t.levelFinished.savedToCustomToast);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className={styles.container}>
      {isShared && (
        <div className={styles.customBadge}>
          {t.levelFinished.speedrunChallenge(
            atom,
            sharedLevel?.authorTime ? formatScore(sharedLevel.authorTime) : undefined
          )}
        </div>
      )}
      <h1 className={styles.done}>{atom}</h1>

      <div className={styles.scoresWrapper}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>{t.levelFinished.lastGame}</span>
          <span className={styles.scoreValue}>{formatScore(last)}</span>
          {best === last && best > 0 && (
            <div className={styles.bestBadge}>{t.levelFinished.newRecord}</div>
          )}
        </div>

        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>{t.levelFinished.allTimeBest}</span>
          <span className={styles.scoreValue}>{formatScore(best)}</span>
        </div>
      </div>

      {medalInfo.medal !== 'none' && (
        <div style={{ color: medalInfo.color, fontSize: 22, marginBottom: 10 }}>
          {medalInfo.symbol} {medalInfo.label}
          {lastJumps !== undefined ? ` • ${t.levelFinished.jumpsCount(lastJumps)}` : ''}
        </div>
      )}

      <div className={styles.molecule} style={{ backgroundColor: hue, color: antiHue }}>
        <span className={styles.atomicId}>{id}</span>
        <span>{symbol}</span>
      </div>

      {isShared ? (
        <div className={styles.buttonContainer} style={{ flexWrap: 'wrap', maxWidth: 440 }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMenu}`}
            onClick={handleGoToMenu}
          >
            {t.levelFinished.menu}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            {t.levelFinished.retry}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSave}`}
            onClick={handleSaveToMyLevels}
          >
            {t.levelFinished.save}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            {t.levelFinished.share}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={() => {
              setSharedLevel(null);
              navigate('/levels');
            }}
          >
            {t.levelFinished.levels}
          </button>
        </div>
      ) : (
        <div className={styles.buttonContainer}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMenu}`}
            onClick={handleGoToMenu}
          >
            {t.levelFinished.menu}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            {t.levelFinished.retry}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            {t.levelFinished.share}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={handleNextLevel}
          >
            {t.levelFinished.next}
          </button>
        </div>
      )}

      {saveMessage && <div className={styles.saveToast}>{saveMessage}</div>}

      {isShareOpen && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          level={{
            ...(isShared && sharedLevel
              ? sharedLevel
              : loadedShareLevel ||
                getCachedLevel(levelIndex) || {
                  id: String(levelIndex),
                  hue: '#070737',
                  antiHue: '#c56805',
                  symbol: '?',
                  atom: t.levelFinished.unknownFallback,
                  width: 800,
                  height: 600,
                  player: { position: { x: 100, y: 100 } },
                  door: { x: 700, y: 500 },
                  platforms: [],
                  particles: [],
                  spikes: []
                }),
            authorGhost: currentLevelScore.ghostTrajectory,
            authorTime: best || last
          }}
        />
      )}
    </div>
  );
}
