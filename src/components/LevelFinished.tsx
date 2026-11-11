import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import type { LevelData } from '../types';
import ShareModal from './Editor/ShareModal';
import styles from './LevelFinished.module.css';

const allLevels = levels as unknown as Record<string, LevelData>;

export default function LevelFinished(): React.ReactElement {
  const navigate = useNavigate();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const currentLevel = useGameStore((state) => state.currentLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const sharedLevel = useGameStore((state) => state.sharedLevel);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const saveSharedLevelToCustom = useGameStore((state) => state.saveSharedLevelToCustom);

  const isShared = Boolean(sharedLevel);
  const levelIndex = isShared ? 0 : Math.max(1, currentLevel - 1);
  const currentLevelScore = scores[levelIndex] || { best: 0, last: 0 };
  const { last, best } = currentLevelScore;

  const currentLevelData =
    isShared && sharedLevel
      ? {
          id: sharedLevel.symbol || '★',
          hue: sharedLevel.hue || '#070737',
          antiHue: sharedLevel.antiHue || '#c56805',
          symbol: sharedLevel.symbol || '?',
          atom: sharedLevel.atom || 'Custom Level'
        }
      : allLevels[`level${levelIndex}`] || {
          id: String(levelIndex),
          hue: '#070737',
          antiHue: '#c56805',
          symbol: '?',
          atom: 'Unknown'
        };

  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const handleNextLevel = () => {
    const nextLevelData = allLevels[`level${currentLevel}`];
    if (!nextLevelData) {
      navigate('/levels');
      return;
    }
    if (nextLevelData?.explanations && nextLevelData.explanations.length > 0) {
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
    setSaveMessage('Level saved to your custom levels!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className={styles.container}>
      {isShared && (
        <div className={styles.customBadge}>
          {sharedLevel?.authorTime
            ? `★ SPEEDRUN CHALLENGE: ${atom} (${formatScore(sharedLevel.authorTime)}) ★`
            : `★ SPEEDRUN CHALLENGE: ${atom} ★`}
        </div>
      )}
      <h1 className={styles.done}>{atom}</h1>

      <div className={styles.scoresWrapper}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>Last game</span>
          <span className={styles.scoreValue}>{formatScore(last)}</span>
          {best === last && best > 0 && <div className={styles.bestBadge}>New record !</div>}
        </div>

        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>All Time Best</span>
          <span className={styles.scoreValue}>{formatScore(best)}</span>
        </div>
      </div>

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
            Menu
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            Retry
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSave}`}
            onClick={handleSaveToMyLevels}
          >
            Save
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            Share
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={() => {
              setSharedLevel(null);
              navigate('/levels');
            }}
          >
            Levels
          </button>
        </div>
      ) : (
        <div className={styles.buttonContainer}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMenu}`}
            onClick={handleGoToMenu}
          >
            Menu
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            Retry
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            Share
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={handleNextLevel}
          >
            Next
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
              : allLevels[`level${levelIndex}`] || {
                  id: String(levelIndex),
                  hue: '#070737',
                  antiHue: '#c56805',
                  symbol: '?',
                  atom: 'Unknown',
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
