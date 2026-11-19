import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllLevelMetadata, getLevelMetadata } from '../data/levels';
import { findMoleculeByElements, getMoleculeById } from '../data/molecules';
import { getElementSpectroscopy } from '../data/spectroscopy';
import { getStrings } from '../i18n/strings';
import {
  TOTAL_PERIODIC_ELEMENTS,
  countGoldMedals,
  getMedalDisplayInfo
} from '../services/MedalService';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import { isGodMode } from '../tools/godMode';
import { isEntanglementLevelId } from '../tools/levelProgression';
import type { IsotopeMedal } from '../types';
import styles from './LevelSelection.module.css';

export const LevelSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const godMode = isGodMode();
  const maxLevel = useGameStore((state) => state.maxLevel);
  const maxEntanglementLevel = useGameStore((state) => state.maxEntanglementLevel ?? 110);
  const scores = useGameStore((state) => state.scores);
  const unlockedMolecules = useGameStore((state) => state.unlockedMolecules ?? []);
  const unlockMolecule = useGameStore((state) => state.unlockMolecule);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const ghostMode = useGameStore(
    (state) => state.ghostMode ?? (state.ghostEnabled ? 'optimal' : 'off')
  );
  const toggleGhost = useGameStore((state) => state.toggleGhost);
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);

  const [alchemyMode, setAlchemyMode] = useState(false);
  const [selectedAtomZ, setSelectedAtomZ] = useState<number | null>(null);
  const [synthesisBanner, setSynthesisBanner] = useState<{
    formula: string;
    name: string;
    aSymbol: string;
    bSymbol: string;
  } | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldAtomZRef = useRef<number | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const hasPersonalRun = Object.values(scores).some(
    (s) => s.best > 0 && Boolean(s.ghostTrajectory)
  );
  const goldCount = countGoldMedals(scores);
  const ghostLabel = t.ghost[ghostMode];

  const isEntanglementUnlocked =
    godMode || maxLevel >= 10 || location.search.includes('entanglement=1');
  const [activeTab, setActiveTab] = useState<'classic' | 'entanglement'>(
    isEntanglementUnlocked &&
      (location.search.includes('tab=entanglement') || location.search.includes('entanglement=1'))
      ? 'entanglement'
      : 'classic'
  );

  const raw = getAllLevelMetadata()
    .filter((meta) => {
      const idNum = Number(meta.id);
      if (activeTab === 'entanglement') {
        return isEntanglementLevelId(idNum);
      }
      return !isEntanglementLevelId(idNum);
    })
    .map(({ id, hue, antiHue, symbol, atom }) => ({ id, hue, antiHue, symbol, atom }));

  const enriched = raw.map((r) => {
    const scoreEntry = scores[Number(r.id)];
    const medal: IsotopeMedal =
      scoreEntry?.medal ?? (scoreEntry?.best && scoreEntry.best > 0 ? 'bronze' : 'none');
    return {
      ...r,
      score: scoreEntry ? formatScore(scoreEntry.best) : '00:00:00',
      bestJumps: scoreEntry?.bestJumps,
      medal
    };
  });

  const isDisabled = (id: string | number) => {
    if (godMode) return false;
    const num = Number(id);
    if (isEntanglementLevelId(num)) {
      return num > maxEntanglementLevel;
    }
    return num > maxLevel;
  };

  const tryCombineElements = (z1: number, z2: number) => {
    const recipe = findMoleculeByElements(z1, z2);
    setSelectedAtomZ(null);
    heldAtomZRef.current = null;
    if (!recipe) return;

    unlockMolecule(recipe.id);
    const aSpec = getElementSpectroscopy(z1);
    const bSpec = getElementSpectroscopy(z2);
    setSynthesisBanner({
      formula: recipe.formula,
      name: recipe.name,
      aSymbol: aSpec.symbol,
      bSymbol: bSpec.symbol
    });

    const isTestEnv = Boolean(import.meta.env?.VITEST);
    if (isTestEnv) {
      navigate(`/game/molecule/${recipe.id}`);
    } else {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        navigate(`/game/molecule/${recipe.id}`);
      }, 650);
    }
  };

  const handleSelect = (n: string | number) => {
    if (isDisabled(n)) return;
    setSharedLevel(null);
    updateCurrentLevel(Number(n));
    const targetLevel = getLevelMetadata(n);
    if (targetLevel?.explanations && targetLevel.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleAtomClick = (id: string | number, e: React.MouseEvent) => {
    const z = Number(id);
    if (e.shiftKey || alchemyMode) {
      e.preventDefault();
      if (selectedAtomZ === null) {
        setSelectedAtomZ(z);
      } else if (selectedAtomZ === z) {
        setSelectedAtomZ(null);
      } else {
        tryCombineElements(selectedAtomZ, z);
      }
      return;
    }
    handleSelect(id);
  };

  const handleAtomTouchStart = (id: string | number, e: React.TouchEvent) => {
    const z = Number(id);
    if (e.touches.length >= 2 && heldAtomZRef.current !== null && heldAtomZRef.current !== z) {
      e.preventDefault();
      tryCombineElements(heldAtomZRef.current, z);
      return;
    }
    if (e.touches.length === 1) {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        heldAtomZRef.current = z;
        setSelectedAtomZ(z);
      }, 260);
    }
  };

  const handleAtomTouchEnd = (e: React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (e.touches.length === 0) {
      heldAtomZRef.current = null;
    }
  };

  const getMedalClass = (medal: IsotopeMedal): string => {
    if (medal === 'gold') return styles.medalGold;
    if (medal === 'silver') return styles.medalSilver;
    if (medal === 'bronze') return styles.medalBronze;
    return '';
  };

  return (
    <div className={styles.selectionContainer}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
          {t.levelSelection.backToMenu}
        </button>
        <h1 className={styles.title}>
          {t.levelSelection.title}
          {godMode ? ' [GOD]' : ''}
        </h1>
        <button
          type="button"
          className={`${styles.ghostToggle} ${ghostMode !== 'off' ? styles.ghostToggleActive : ''}`}
          onClick={() => toggleGhost(hasPersonalRun)}
          title={t.levelSelection.ghostModeTitle(ghostMode)}
          aria-label={
            ghostMode === 'off'
              ? t.levelSelection.ghostDisabled
              : t.levelSelection.ghostEnabled(ghostMode)
          }
        >
          {ghostLabel}
        </button>
      </div>

      <div className={styles.isotopeSummary} data-testid="gold-isotope-counter">
        <span className={styles.goldStar}>★</span>
        <span>
          {t.levelSelection.goldIsotopes} <strong>{goldCount}</strong> / {TOTAL_PERIODIC_ELEMENTS}
        </span>
      </div>

      <div className={styles.alchemyToolbar}>
        <button
          type="button"
          className={`${styles.alchemyButton} ${alchemyMode ? styles.alchemyButtonActive : ''}`}
          onClick={() => {
            setAlchemyMode((prev) => !prev);
            setSelectedAtomZ(null);
          }}
          aria-pressed={alchemyMode}
        >
          ⚗️ {t.levelSelection.chemicalBond}{' '}
          {alchemyMode ? t.levelSelection.chemicalBondOn : t.levelSelection.chemicalBondHint}
        </button>
      </div>

      {synthesisBanner && (
        <div className={styles.covalentBanner} data-testid="covalent-bond-banner">
          <span>{synthesisBanner.aSymbol}</span>
          <span className={styles.covalentBondLine} />
          <span>{synthesisBanner.bSymbol}</span>
          <span>➔</span>
          <strong>
            {synthesisBanner.formula} — {synthesisBanner.name}
          </strong>
        </div>
      )}

      {unlockedMolecules.length > 0 && (
        <div className={styles.moleculesShelf} data-testid="unlocked-molecules-shelf">
          {unlockedMolecules.map((molId) => {
            const mol = getMoleculeById(molId);
            if (!mol) return null;
            return (
              <button
                key={mol.id}
                type="button"
                className={styles.moleculeChip}
                onClick={() => navigate(`/game/molecule/${mol.id}`)}
                title={mol.mechanicSummary}
              >
                ⚗️ {mol.formula} ({mol.name})
              </button>
            );
          })}
        </div>
      )}

      {isEntanglementUnlocked && (
        <div className={styles.tabContainer}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'classic' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('classic')}
          >
            {t.levelSelection.classicTab}
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${styles.entanglementTab} ${
              activeTab === 'entanglement' ? styles.tabButtonActive : ''
            }`}
            onClick={() => setActiveTab('entanglement')}
          >
            {t.levelSelection.entanglementTab}
            <span className={styles.entanglementTabBadge}>110-114</span>
          </button>
        </div>
      )}
      {enriched.map(({ id, hue, antiHue, symbol, atom, score: levelScore, bestJumps, medal }) => {
        const disabled = isDisabled(id);
        const medalInfo = getMedalDisplayInfo(medal, locale);
        const isSelectedAlchemy = selectedAtomZ === Number(id);
        return (
          <div
            key={`${id}-${symbol}`}
            className={`${styles.menuItem} ${getMedalClass(medal)} ${
              disabled ? styles.menuItemDisabled : ''
            } ${isSelectedAlchemy ? styles.menuItemSelectedAlchemy : ''}`}
            onClick={(e) => handleAtomClick(id, e)}
            onTouchStart={(e) => handleAtomTouchStart(id, e)}
            onTouchEnd={handleAtomTouchEnd}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelect(id);
            }}
          >
            <div className={styles.atom} style={{ backgroundColor: hue, color: antiHue }}>
              {symbol}
              <div className={styles.atomicNumber}>{id}</div>
              {medal !== 'none' && (
                <span
                  className={styles.medalStar}
                  style={{ color: medalInfo.color }}
                  title={medalInfo.label}
                  aria-label={medalInfo.label}
                >
                  {medalInfo.symbol}
                </span>
              )}
            </div>
            <div className={styles.atomDescription}>
              <h2 className={styles.atomTitle}>{atom}</h2>
              <div className={styles.atomScore}>
                <span>{levelScore}</span>
                {bestJumps !== undefined && (
                  <span className={styles.jumpBadge}>
                    {' '}
                    • {bestJumps}
                    {t.levelSelection.jumpSuffix}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LevelSelection;
