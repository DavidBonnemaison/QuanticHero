import type React from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as levelsData from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import { isGodMode } from '../tools/godMode';
import type { LevelData } from '../types';
import styles from './LevelSelection.module.css';

const allLevels = levelsData as unknown as Record<string, LevelData>;

export const LevelSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const godMode = isGodMode();
  const maxLevel = useGameStore((state) => state.maxLevel);
  const maxEntanglementLevel = useGameStore((state) => state.maxEntanglementLevel ?? 110);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const ghostMode = useGameStore(
    (state) => state.ghostMode ?? (state.ghostEnabled ? 'optimal' : 'off')
  );
  const toggleGhost = useGameStore((state) => state.toggleGhost);

  const hasPersonalRun = Object.values(scores).some(
    (s) => s.best > 0 && Boolean(s.ghostTrajectory)
  );

  const ghostLabel =
    ghostMode === 'off'
      ? '[GHOST: OFF]'
      : ghostMode === 'optimal'
        ? '[GHOST: OPTIMAL]'
        : '[GHOST: BEST]';

  const isEntanglementUnlocked =
    godMode || maxLevel >= 10 || location.search.includes('entanglement=1');
  const [activeTab, setActiveTab] = useState<'classic' | 'entanglement'>(
    isEntanglementUnlocked &&
      (location.search.includes('tab=entanglement') || location.search.includes('entanglement=1'))
      ? 'entanglement'
      : 'classic'
  );

  const raw = Object.keys(allLevels)
    .filter((key) => key.startsWith('level'))
    .sort((a, b) => Number(allLevels[a].id) - Number(allLevels[b].id))
    .filter((key) => {
      const idNum = Number(allLevels[key].id);
      if (activeTab === 'entanglement') {
        return idNum >= 110 && idNum <= 114;
      }
      return idNum < 110;
    })
    .map((key) => {
      const { id, hue, antiHue, symbol, atom } = allLevels[key];
      return { id, hue, antiHue, symbol, atom };
    });

  const enriched = raw.map((r) => ({
    ...r,
    score: scores[Number(r.id)] ? formatScore(scores[Number(r.id)].best) : '00:00:00'
  }));

  const isDisabled = (id: string | number) => {
    if (godMode) return false;
    const num = Number(id);
    if (num >= 110) {
      return num > maxEntanglementLevel;
    }
    return num > maxLevel;
  };

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
          ◄ MENU
        </button>
        <h1 className={styles.title}>Level Selection{godMode ? ' [GOD]' : ''}</h1>
        <button
          type="button"
          className={`${styles.ghostToggle} ${ghostMode !== 'off' ? styles.ghostToggleActive : ''}`}
          onClick={() => toggleGhost(hasPersonalRun)}
          title={`Ghost replay mode: ${ghostMode}`}
          aria-label={ghostMode === 'off' ? 'Ghost disabled' : `Ghost enabled (${ghostMode})`}
        >
          {ghostLabel}
        </button>
      </div>

      {isEntanglementUnlocked && (
        <div className={styles.tabContainer}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'classic' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('classic')}
          >
            [ CLASSIC ATOMS ]
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${styles.entanglementTab} ${
              activeTab === 'entanglement' ? styles.tabButtonActive : ''
            }`}
            onClick={() => setActiveTab('entanglement')}
          >
            [ ENTANGLEMENT Ψ ⊗ Ψ ]<span className={styles.entanglementTabBadge}>110-114</span>
          </button>
        </div>
      )}
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
