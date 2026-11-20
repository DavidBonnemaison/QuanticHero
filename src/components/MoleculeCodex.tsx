import type React from 'react';
import { useEffect } from 'react';
import { SECRET_MOLECULES } from '../data/molecules';
import { type Locale, getStrings } from '../i18n/strings';
import { getMedalDisplayInfo } from '../services/MedalService';
import formatScore from '../tools/formatScore';
import type { IsotopeMedal, ScoreItem } from '../types';
import styles from './MoleculeCodex.module.css';

export interface MoleculeCodexProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedMolecules: string[];
  moleculeScores: Record<string, ScoreItem>;
  locale: Locale;
  onPlayMolecule: (moleculeId: string) => void;
}

export const MoleculeCodex: React.FC<MoleculeCodexProps> = ({
  isOpen,
  onClose,
  unlockedMolecules,
  moleculeScores,
  locale,
  onPlayMolecule
}) => {
  const t = getStrings(locale);
  const c = t.codex;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unlockedSet = new Set(unlockedMolecules);
  const unlockedCount = SECRET_MOLECULES.filter((mol) => unlockedSet.has(mol.id)).length;
  const totalCount = SECRET_MOLECULES.length;

  return (
    <div
      className={styles.backdrop}
      data-testid="molecule-codex-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="molecule-codex-title"
        className={styles.drawer}
        data-testid="molecule-codex-dialog"
      >
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <h2 id="molecule-codex-title" className={styles.title}>
                ⚗️ {c.title}
              </h2>
              <span className={styles.counterBadge} data-testid="codex-unlocked-counter">
                {c.unlockedCounter(unlockedCount, totalCount)}
              </span>
            </div>
            <p className={styles.subtitle}>{c.subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={c.close}
          >
            ✕ {c.close}
          </button>
        </div>

        <div className={styles.grid} data-testid="codex-slots-grid">
          {SECRET_MOLECULES.map((mol, index) => {
            const isUnlocked = unlockedSet.has(mol.id);
            const scoreEntry = moleculeScores[mol.id];
            const medal: IsotopeMedal =
              scoreEntry?.medal ?? (scoreEntry?.best && scoreEntry.best > 0 ? 'bronze' : 'none');
            const medalInfo = getMedalDisplayInfo(medal, locale);
            const hintText = locale === 'fr' ? mol.hintFr : mol.hint;

            if (!isUnlocked) {
              return (
                <article
                  key={mol.id}
                  data-testid={`codex-slot-${mol.id}`}
                  data-unlocked="false"
                  className={`${styles.card} ${styles.cardLocked}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={`${styles.formulaBadge} ${styles.formulaBadgeLocked}`}>?</div>
                    <div className={styles.cardTitleGroup}>
                      <span className={styles.cardSlotIndex}>
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className={styles.cardLockedTitle}>{c.undiscovered}</h3>
                    </div>
                  </div>
                  <div className={styles.hintBox}>
                    <span className={styles.hintLabel}>{c.hintLabel}</span>
                    <p className={styles.hintText}>{hintText}</p>
                  </div>
                </article>
              );
            }

            return (
              <article
                key={mol.id}
                data-testid={`codex-slot-${mol.id}`}
                data-unlocked="true"
                className={`${styles.card} ${styles.cardUnlocked}`}
                style={{
                  borderColor: `${mol.levelData.antiHue}66`
                }}
              >
                <div className={styles.cardHeader}>
                  <div
                    className={styles.formulaBadge}
                    style={{
                      backgroundColor: mol.levelData.hue,
                      color: mol.levelData.antiHue,
                      borderColor: `${mol.levelData.antiHue}88`
                    }}
                  >
                    {mol.formula}
                  </div>
                  <div className={styles.cardTitleGroup}>
                    <span className={styles.cardSlotIndex}>
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className={styles.cardName}>{mol.name}</h3>
                  </div>
                </div>

                <p className={styles.mechanicSummary}>{mol.mechanicSummary}</p>

                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>{c.bestTime}</span>
                    <span className={styles.statValue}>
                      {scoreEntry?.best && scoreEntry.best > 0
                        ? formatScore(scoreEntry.best)
                        : c.noRecord}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>{c.medal}</span>
                    <span className={styles.statValue} style={{ color: medalInfo.color }}>
                      {medal !== 'none' ? `${medalInfo.symbol} ` : ''}
                      {medalInfo.shortLabel}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.playButton}
                  onClick={() => onPlayMolecule(mol.id)}
                  aria-label={`${c.play} ${mol.formula} ${mol.name}`}
                >
                  {c.play}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MoleculeCodex;
