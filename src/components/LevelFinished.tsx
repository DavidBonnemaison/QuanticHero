import type React from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import styles from './LevelFinished.module.css';

export default function LevelFinished(): React.ReactElement {
  const navigate = useNavigate();

  const currentLevel = useGameStore((state) => state.currentLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  const levelIndex = Math.max(1, currentLevel - 1);
  const currentLevelScore = scores[levelIndex] || { best: 0, last: 0 };
  const { last, best } = currentLevelScore;

  const currentLevelData = (levels as any)[`level${levelIndex}`] || {
    id: String(levelIndex),
    hue: '#070737',
    antiHue: '#c56805',
    symbol: '?',
    atom: 'Unknown'
  };
  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const handleNextLevel = () => {
    const nextLevelData = (levels as any)[`level${currentLevel}`];
    if (nextLevelData?.explanations && nextLevelData.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleRetry = () => {
    updateCurrentLevel(levelIndex);
    navigate('/game');
  };

  const handleGoToMenu = () => {
    navigate('/');
  };

  return (
    <div className={styles.container}>
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
    </div>
  );
}
