import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { getNarrativeForLevel } from '../data/cosmicNarrative';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import styles from './Explanation.module.css';

interface LevelLike {
  explanations?: string[];
}

export default function Explanation(): React.ReactElement {
  const navigate = useNavigate();
  const currentLevel = useGameStore((state) => state.currentLevel);
  const customLevels = useGameStore((state) => state.customLevels) as Record<
    string,
    LevelLike
  > | null;
  const levelMap = levels as unknown as Record<string, LevelLike | undefined>;

  const staticLevel = levelMap[`level${currentLevel}`];
  const customLevel = customLevels?.[`level${currentLevel}`];

  let explanations: string[] = [];
  if (staticLevel?.explanations && staticLevel.explanations.length > 0) {
    explanations = staticLevel.explanations;
  } else if (customLevel?.explanations && customLevel.explanations.length > 0) {
    explanations = customLevel.explanations;
  } else if (currentLevel >= 1 && currentLevel <= 118) {
    explanations = getNarrativeForLevel(currentLevel);
  }

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
