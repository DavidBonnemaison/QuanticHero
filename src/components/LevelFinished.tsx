import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import styles from './LevelFinished.module.css';

export default function LevelFinished(): React.ReactElement {
  const navigate = useNavigate();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      : (levels as any)[`level${levelIndex}`] || {
          id: String(levelIndex),
          hue: '#070737',
          antiHue: '#c56805',
          symbol: '?',
          atom: 'Unknown'
        };

  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const handleNextLevel = () => {
    const nextLevelData = (levels as any)[`level${currentLevel}`];
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

  const handleEditInEditor = () => {
    saveSharedLevelToCustom(1);
    setSharedLevel(null);
    navigate('/editor');
  };

  const handleSaveToMyLevels = () => {
    saveSharedLevelToCustom(1);
    setSaveMessage('Niveau sauvegardé dans vos niveaux !');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className={styles.container}>
      {isShared && <div className={styles.customBadge}>Niveau Personnalisé</div>}
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
            className={`${styles.button} ${styles.buttonEdit}`}
            onClick={handleEditInEditor}
          >
            Éditer ce niveau
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSave}`}
            onClick={handleSaveToMyLevels}
          >
            Sauvegarder
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
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={handleNextLevel}
          >
            Next
          </button>
        </div>
      )}

      {saveMessage && <div className={styles.saveToast}>{saveMessage}</div>}
    </div>
  );
}
