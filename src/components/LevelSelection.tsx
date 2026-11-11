import type React from 'react';
import { useNavigate } from 'react-router-dom';
import * as levelsData from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import type { LevelData } from '../types';
import styles from './LevelSelection.module.css';

const allLevels = levelsData as unknown as Record<string, LevelData>;

export const LevelSelection: React.FC = () => {
  const navigate = useNavigate();
  const maxLevel = useGameStore((state) => state.maxLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  const raw = Object.keys(allLevels)
    .filter((key) => key.startsWith('level'))
    .sort((a, b) => Number(allLevels[a].id) - Number(allLevels[b].id))
    .map((key) => {
      const { id, hue, antiHue, symbol, atom } = allLevels[key];
      return { id, hue, antiHue, symbol, atom };
    });

  const enriched = raw.map((r) => ({
    ...r,
    score: scores[Number(r.id)] ? formatScore(scores[Number(r.id)].best) : '00:00:00'
  }));

  const isDisabled = (id: string | number) => Number(id) > maxLevel;

  const handleSelect = (n: string | number) => {
    if (isDisabled(n)) return;
    updateCurrentLevel(Number(n));
    const targetLevel = allLevels[`level${n}`];
    if (targetLevel?.explanations && targetLevel.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  return (
    <div className={styles.selectionContainer}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
          ← Menu
        </button>
        <h1 className={styles.title}>Level Selection</h1>
        <div style={{ width: 70 }} />
      </div>
      {enriched.map(({ id, hue, antiHue, symbol, atom, score: levelScore }) => {
        const disabled = isDisabled(id);
        return (
          <div
            key={`${id}-${symbol}`}
            className={`${styles.menuItem} ${disabled ? styles.menuItemDisabled : ''}`}
            onClick={() => handleSelect(id)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelect(id);
            }}
          >
            <div className={styles.atom} style={{ backgroundColor: hue, color: antiHue }}>
              {symbol}
              <div className={styles.atomicNumber}>{id}</div>
            </div>
            <div className={styles.atomDescription}>
              <h2 className={styles.atomTitle}>{atom}</h2>
              <div className={styles.atomScore}>{levelScore}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LevelSelection;
