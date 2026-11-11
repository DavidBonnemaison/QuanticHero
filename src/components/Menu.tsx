import type React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import type { LevelData } from '../types';
import styles from './Menu.module.css';
import Molecules from './Molecules';

export default function Menu(): React.ReactElement {
  const navigate = useNavigate();
  const customLevels = useGameStore((state) => state.customLevels);
  const setLevels = useGameStore((state) => state.setLevels);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  useEffect(() => {
    Molecules.start();
    if (!customLevels) {
      setLevels(levels as unknown as Record<string, LevelData>);
    }
    return () => {
      Molecules.end();
    };
  }, [customLevels, setLevels]);

  const handleNewGame = () => {
    updateCurrentLevel(1);
    navigate('/explanation');
  };

  const handleGoToLevels = () => {
    navigate('/levels');
  };

  return (
    <div className={styles.menuWrapper}>
      <div id="container" />
      <h1 className={styles.title}>Quantum Hero</h1>
      <button type="button" className={styles.button} onClick={handleNewGame}>
        New game
      </button>
      <button type="button" className={styles.button} onClick={handleGoToLevels}>
        Levels
      </button>
    </div>
  );
}
