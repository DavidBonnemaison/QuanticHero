import type React from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import styles from './Explanation.module.css';

export default function Explanation(): React.ReactElement {
  const navigate = useNavigate();
  const currentLevel = useGameStore((state) => state.currentLevel);
  const levelData = (levels as any)[`level${currentLevel}`] || { explanations: [] };
  const explanations: string[] = levelData.explanations || [];

  const handlePlay = () => {
    navigate('/game');
  };

  return (
    <div className={styles.container}>
      <div className={styles.text}>
        {explanations.map((e, i) => (
          <p key={`exp-${i}`}>{e}</p>
        ))}
      </div>
      <button type="button" className={styles.button} onClick={handlePlay}>
        Got it
      </button>
    </div>
  );
}
