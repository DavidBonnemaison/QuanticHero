import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { CHRONO_LOOP_LEVELS, type ChronoLoopEntry } from '../data/chronoLoopLevels';
import { SCHRODINGER_LEVELS, type SchrodingerLabEntry } from '../data/schrodingerLevels';
import { getStrings } from '../i18n/strings';
import { resolveAcceleratorElement } from '../roguelite/AcceleratorRunManager';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import styles from './QuantumModesHub.module.css';

export default function QuantumModesHub(): React.ReactElement {
  const navigate = useNavigate();
  const locale = useGameStore((state) => state.locale ?? 'en');
  const customModeScores = useGameStore((state) => state.customModeScores ?? {});
  const acceleratorBest = useGameStore((state) => state.acceleratorBest ?? null);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const setActiveDuel = useGameStore((state) => state.setActiveDuel);

  const t = getStrings(locale);

  const chronoClearedCount = CHRONO_LOOP_LEVELS.filter(
    (entry) => (customModeScores[entry.id]?.best ?? 0) > 0
  ).length;

  const schrodingerClearedCount = SCHRODINGER_LEVELS.filter(
    (entry) => (customModeScores[entry.id]?.best ?? 0) > 0
  ).length;

  const handlePlayChrono = (entry: ChronoLoopEntry) => {
    setActiveDuel(null);
    setSharedLevel(entry.levelData);
    navigate(`/game/chrono/${entry.id}`);
  };

  const handlePlaySchrodinger = (entry: SchrodingerLabEntry) => {
    setActiveDuel(null);
    setSharedLevel(entry.levelData);
    navigate(`/game/schrodinger/${entry.id}`);
  };

  return (
    <div className={styles.wrapper} data-testid="quantum-modes-hub">
      <div className={styles.inner}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/')}
            data-testid="modes-back-button"
          >
            {t.modes.backToMenu}
          </button>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{t.modes.title}</h1>
            <p className={styles.subtitle}>{t.modes.subtitle}</p>
          </div>
        </header>

        {/* Sector 01: Chrono-Loop (Spec-01) */}
        <section className={styles.modeSection} aria-labelledby="chrono-loop-heading">
          <div className={styles.modeSectionHeader}>
            <div className={styles.modeTitleRow}>
              <h2 id="chrono-loop-heading" className={styles.modeTitle}>
                {t.modes.chronoLoopTitle}
              </h2>
              <span className={styles.modeTag}>{t.modes.chronoLoopTag}</span>
            </div>
            <span className={styles.counterBadge} data-testid="chrono-cleared-counter">
              {t.modes.chronoCompletedCount(chronoClearedCount, CHRONO_LOOP_LEVELS.length)}
            </span>
          </div>
          <p className={styles.modeDesc}>{t.modes.chronoLoopDesc}</p>

          <div className={styles.chronoGrid}>
            {CHRONO_LOOP_LEVELS.map((entry) => {
              const score = customModeScores[entry.id];
              const isCleared = Boolean(score?.best && score.best > 0);
              const cycleSec = ((entry.levelData.timeLoop?.cycleMs ?? 7000) / 1000).toFixed(1);
              const maxEchoes = entry.levelData.timeLoop?.maxEchoes ?? 1;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`${styles.levelCard} ${isCleared ? styles.levelCardCleared : ''}`}
                  onClick={() => handlePlayChrono(entry)}
                  data-testid={`chrono-card-${entry.id}`}
                >
                  <div className={styles.levelCardTop}>
                    <span className={styles.levelCode}>
                      {entry.code} · {entry.levelData.symbol}
                    </span>
                    <span className={styles.levelDifficulty}>{entry.difficulty}</span>
                  </div>
                  <div className={styles.levelName}>
                    {locale === 'fr' ? entry.titleFr : entry.title}
                  </div>
                  <div className={styles.levelSummary}>
                    {locale === 'fr' ? entry.summaryFr : entry.summary}
                  </div>
                  <div className={styles.levelFooter}>
                    <span className={styles.cycleSpec}>
                      {t.modes.cycleLabel(cycleSec, maxEchoes)}
                    </span>
                    {isCleared && score?.best ? (
                      <span className={styles.bestScore}>
                        {t.modes.bestLabel(formatScore(score.best))}
                      </span>
                    ) : (
                      <span className={styles.unsolved}>{t.modes.notCleared}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sector 02: Schrodinger Labs (Spec-02) */}
        <section
          className={`${styles.modeSection} ${styles.schrodingerSection}`}
          aria-labelledby="schrodinger-heading"
          data-testid="schrodinger-mode-card"
        >
          <div className={styles.modeSectionHeader}>
            <div className={styles.modeTitleRow}>
              <h2 id="schrodinger-heading" className={styles.modeTitle}>
                {t.modes.schrodingerTitle}
              </h2>
              <span className={`${styles.modeTag} ${styles.modeTagViolet}`}>
                {t.modes.schrodingerTag}
              </span>
            </div>
            <span className={styles.counterBadge} data-testid="schrodinger-cleared-counter">
              {t.modes.schrodingerCompletedCount(
                schrodingerClearedCount,
                SCHRODINGER_LEVELS.length
              )}
            </span>
          </div>
          <p className={styles.modeDesc}>{t.modes.schrodingerDesc}</p>

          <div className={styles.chronoGrid}>
            {SCHRODINGER_LEVELS.map((entry) => {
              const score = customModeScores[entry.id];
              const isCleared = Boolean(score?.best && score.best > 0);
              const superposedCount =
                entry.levelData.platforms.filter((p) => Boolean(p.superposition)).length +
                entry.levelData.spikes.filter((s) => Boolean(s.superposition)).length;
              const beamCount = entry.levelData.observerBeams?.length ?? 0;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`${styles.levelCard} ${styles.schrodingerCard} ${
                    isCleared ? styles.levelCardCleared : ''
                  }`}
                  onClick={() => handlePlaySchrodinger(entry)}
                  data-testid={`schrodinger-card-${entry.id}`}
                >
                  <div className={styles.levelCardTop}>
                    <span className={`${styles.levelCode} ${styles.levelCodeViolet}`}>
                      {entry.code} · {entry.levelData.symbol}
                    </span>
                    <span className={styles.levelDifficulty}>{entry.difficulty}</span>
                  </div>
                  <div className={styles.levelName}>
                    {locale === 'fr' ? entry.titleFr : entry.title}
                  </div>
                  <div className={styles.levelSummary}>
                    {locale === 'fr' ? entry.summaryFr : entry.summary}
                  </div>
                  <div className={styles.levelFooter}>
                    <span className={styles.cycleSpec}>
                      {t.modes.observerSpecLabel(superposedCount, beamCount)}
                    </span>
                    {isCleared && score?.best ? (
                      <span className={styles.bestScore}>
                        {t.modes.bestLabel(formatScore(score.best))}
                      </span>
                    ) : (
                      <span className={styles.unsolved}>{t.modes.notCleared}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sector 03: Particle Accelerator (Spec-03) */}
        <section
          className={`${styles.placeholderCard} ${styles.acceleratorCard}`}
          aria-labelledby="accelerator-heading"
          data-testid="accelerator-mode-card"
        >
          <div className={styles.modeTitleRow}>
            <h2 id="accelerator-heading" className={styles.modeTitle}>
              {t.modes.acceleratorTitle}
            </h2>
            <span className={`${styles.modeTag} ${styles.modeTagGold}`}>
              {t.modes.acceleratorTag}
            </span>
          </div>
          <p className={styles.modeDesc}>{t.modes.acceleratorDesc}</p>
          <div className={styles.statusLine} data-testid="accelerator-best-record">
            {acceleratorBest
              ? t.modes.acceleratorBestRecord(
                  acceleratorBest.maxZ,
                  resolveAcceleratorElement(acceleratorBest.maxZ).symbol,
                  acceleratorBest.bestRooms ?? acceleratorBest.bestScore
                )
              : t.modes.acceleratorStatus}
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => navigate('/accelerator')}
            data-testid="accelerator-launch-button"
          >
            {t.modes.acceleratorAction}
          </button>
        </section>
      </div>
    </div>
  );
}
