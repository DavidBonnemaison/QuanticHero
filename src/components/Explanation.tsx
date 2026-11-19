import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { getNarrativeForLevel } from '../data/cosmicNarrative';
import { getLevelMetadata } from '../data/levels';
import { getStrings } from '../i18n/strings';
import { useGameStore } from '../store';
import styles from './Explanation.module.css';

interface LevelLike {
  explanations?: string[];
}

export default function Explanation(): React.ReactElement {
  const navigate = useNavigate();
  const currentLevel = useGameStore((state) => state.currentLevel);
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);
  const customLevels = useGameStore((state) => state.customLevels) as Record<
    string,
    LevelLike
  > | null;

  const staticLevel = getLevelMetadata(currentLevel);
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
        {t.explanation.gotIt}
      </button>
    </div>
  );
}
