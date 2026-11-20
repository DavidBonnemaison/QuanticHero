import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { soundManager } from '../audio/SoundManager';
import { getAllLevelMetadata, getLevelMetadata } from '../data/levels';
import { SECRET_MOLECULES, findMoleculeByElements, getMoleculeById } from '../data/molecules';
import { getElementSpectroscopy, isNobleGas } from '../data/spectroscopy';
import { getStrings } from '../i18n/strings';
import { TOTAL_PERIODIC_ELEMENTS, countGoldMedals } from '../services/MedalService';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import { isGodMode } from '../tools/godMode';
import { isEntanglementLevelId } from '../tools/levelProgression';
import type { IsotopeMedal } from '../types';
import styles from './LevelSelection.module.css';
import { MoleculeCodex } from './MoleculeCodex';
import { PeriodicTable, type PeriodicTableElementItem } from './PeriodicTable';

export const LevelSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const godMode = isGodMode();
  const maxLevel = useGameStore((state) => state.maxLevel);
  const maxEntanglementLevel = useGameStore((state) => state.maxEntanglementLevel ?? 110);
  const scores = useGameStore((state) => state.scores);
  const unlockedMolecules = useGameStore((state) => state.unlockedMolecules ?? []);
  const moleculeScores = useGameStore((state) => state.moleculeScores ?? {});
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
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [noBondToast, setNoBondToast] = useState(false);
  const [rejectedAtomZs, setRejectedAtomZs] = useState<number[]>([]);
  const [spectralFlash, setSpectralFlash] = useState(false);
  const [synthesisBanner, setSynthesisBanner] = useState<{
    formula: string;
    name: string;
    aSymbol: string;
    bSymbol: string;
  } | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldAtomZRef = useRef<number | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
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

  const isDisabled = (id: string | number) => {
    if (godMode) return false;
    const num = Number(id);
    if (isEntanglementLevelId(num)) {
      return num > maxEntanglementLevel;
    }
    return num > maxLevel;
  };

  const enriched = useMemo<PeriodicTableElementItem[]>(() => {
    return getAllLevelMetadata()
      .filter((meta) => {
        const idNum = Number(meta.id);
        if (activeTab === 'entanglement') {
          return isEntanglementLevelId(idNum);
        }
        return !isEntanglementLevelId(idNum);
      })
      .map((meta) => {
        const idNum = Number(meta.id);
        const scoreEntry = scores[idNum];
        const medal: IsotopeMedal =
          scoreEntry?.medal ?? (scoreEntry?.best && scoreEntry.best > 0 ? 'bronze' : 'none');
        return {
          id: idNum,
          symbol: meta.symbol,
          atom: meta.atom,
          hue: meta.hue,
          antiHue: meta.antiHue,
          score: scoreEntry ? formatScore(scoreEntry.best) : '00:00:00',
          bestMs: scoreEntry?.best,
          bestJumps: scoreEntry?.bestJumps,
          medal,
          disabled: godMode
            ? false
            : isEntanglementLevelId(idNum)
              ? idNum > maxEntanglementLevel
              : idNum > maxLevel,
          isNobleGas: isNobleGas(idNum),
          isEntanglement: isEntanglementLevelId(idNum),
          noblePlayground: meta.noblePlayground,
          parJumps: meta.parJumps,
          authorTime: meta.authorTime
        };
      });
  }, [activeTab, godMode, maxEntanglementLevel, maxLevel, scores]);

  const tryCombineElements = (z1: number, z2: number) => {
    const recipe = findMoleculeByElements(z1, z2);
    setSelectedAtomZ(null);
    heldAtomZRef.current = null;

    if (!recipe) {
      soundManager.playAlchemyReject();
      setRejectedAtomZs([z1, z2]);
      setNoBondToast(true);
      if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
      rejectTimerRef.current = setTimeout(() => {
        setRejectedAtomZs([]);
      }, 550);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setNoBondToast(false);
      }, 2200);
      return;
    }

    setNoBondToast(false);
    setRejectedAtomZs([]);
    soundManager.playAlchemySynthesis();
    setSpectralFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setSpectralFlash(false);
    }, 620);

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

  const handleAtomClick = (id: number, e: React.MouseEvent) => {
    if (e.shiftKey || alchemyMode) {
      e.preventDefault();
      if (selectedAtomZ === null) {
        setSelectedAtomZ(id);
      } else if (selectedAtomZ === id) {
        setSelectedAtomZ(null);
      } else {
        tryCombineElements(selectedAtomZ, id);
      }
      return;
    }
    handleSelect(id);
  };

  const handleAtomTouchStart = (id: number, e: React.TouchEvent) => {
    if (e.touches.length >= 2 && heldAtomZRef.current !== null && heldAtomZRef.current !== id) {
      e.preventDefault();
      tryCombineElements(heldAtomZRef.current, id);
      return;
    }
    if (e.touches.length === 1) {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        heldAtomZRef.current = id;
        setSelectedAtomZ(id);
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

  const selectedAtomSymbol =
    selectedAtomZ !== null ? getElementSpectroscopy(selectedAtomZ).symbol : null;

  return (
    <div className={styles.selectionContainer}>
      {spectralFlash && (
        <div
          className={styles.spectralFlash}
          data-testid="alchemy-spectral-flash"
          aria-hidden="true"
        />
      )}

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

        <button
          type="button"
          className={styles.codexButton}
          data-testid="open-codex-button"
          onClick={() => setIsCodexOpen(true)}
        >
          📖 {t.levelSelection.codexButton(unlockedMolecules.length, SECRET_MOLECULES.length)}
        </button>
      </div>

      {alchemyMode && (
        <div className={styles.alchemyStatusHint} data-testid="alchemy-status-hint">
          {selectedAtomSymbol
            ? t.levelSelection.alchemySelectPartner(selectedAtomSymbol)
            : t.levelSelection.alchemyDragHint}
        </div>
      )}

      {noBondToast && (
        <div
          className={styles.noBondToast}
          data-testid="alchemy-no-bond-toast"
          role="status"
          aria-live="polite"
        >
          ⚡ {t.levelSelection.noStableBond}
        </div>
      )}

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

      <PeriodicTable
        elements={enriched}
        locale={locale}
        activeTab={activeTab}
        isEntanglementUnlocked={isEntanglementUnlocked}
        onOpenEntanglement={() => setActiveTab('entanglement')}
        alchemyMode={alchemyMode}
        selectedAtomZ={selectedAtomZ}
        rejectedAtomZs={rejectedAtomZs}
        onAtomClick={handleAtomClick}
        onAtomSelect={handleSelect}
        onAtomCombine={tryCombineElements}
        onAtomTouchStart={handleAtomTouchStart}
        onAtomTouchEnd={handleAtomTouchEnd}
      />

      <MoleculeCodex
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        unlockedMolecules={unlockedMolecules}
        moleculeScores={moleculeScores}
        locale={locale}
        onPlayMolecule={(molId) => {
          setIsCodexOpen(false);
          navigate(`/game/molecule/${molId}`);
        }}
      />
    </div>
  );
};

export default LevelSelection;
