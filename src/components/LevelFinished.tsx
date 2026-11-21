import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedLevel, getLevelMetadata, loadLevel } from '../data/levels';
import { getStrings } from '../i18n/strings';
import { getMedalDisplayInfo } from '../services/MedalService';
import { shareReplayCard } from '../services/ReplayCardGenerator';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import {
  DEFAULT_CHALLENGER_NAME,
  buildDuelFromLastRun,
  encodeDuelToUrl,
  formatDuelSeconds
} from '../tools/levelCodec';
import { getNextLevelId } from '../tools/levelProgression';
import type { DuelChallenge, LevelData } from '../types';
import ShareModal from './Editor/ShareModal';
import styles from './LevelFinished.module.css';

export default function LevelFinished(): React.ReactElement {
  const navigate = useNavigate();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSharingCard, setIsSharingCard] = useState(false);
  const [duelShareState, setDuelShareState] = useState<{
    duel: DuelChallenge;
    isRevenge: boolean;
  } | null>(null);
  const [loadedShareLevel, setLoadedShareLevel] = useState<LevelData | null>(null);

  const currentLevel = useGameStore((state) => state.currentLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const sharedLevel = useGameStore((state) => state.sharedLevel);
  const setSharedLevel = useGameStore((state) => state.setSharedLevel);
  const activeDuel = useGameStore((state) => state.activeDuel);
  const setActiveDuel = useGameStore((state) => state.setActiveDuel);
  const lastRun = useGameStore((state) => state.lastRun);
  const saveSharedLevelToCustom = useGameStore((state) => state.saveSharedLevelToCustom);
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);

  const isShared = Boolean(sharedLevel);
  const levelIndex = isShared ? 0 : currentLevel === 115 ? 109 : Math.max(1, currentLevel - 1);
  const nextLevelId = isShared ? null : getNextLevelId(levelIndex);
  const currentLevelScore = scores[levelIndex] || { best: 0, last: 0 };
  const { last, best, medal, lastJumps, coherentRun, bestStyleScore, lastStyleScore } =
    currentLevelScore;
  const medalInfo = getMedalDisplayInfo(medal ?? (best > 0 ? 'bronze' : 'none'), locale);
  const displayStyleScore = lastStyleScore ?? bestStyleScore;

  const duelElapsedMs = lastRun?.elapsedMs ?? last;
  const duelDeltaMs = activeDuel ? duelElapsedMs - activeDuel.challengerTimeMs : 0;
  const isDuelVictory = activeDuel ? duelElapsedMs < activeDuel.challengerTimeMs : false;
  const duelDeltaStr = activeDuel
    ? `${duelDeltaMs < 0 ? '-' : '+'}${(Math.abs(duelDeltaMs) / 1000).toFixed(2)}s`
    : '';

  useEffect(() => {
    if (!isShared && levelIndex >= 1) {
      const cached = getCachedLevel(levelIndex);
      if (cached) {
        setLoadedShareLevel(cached);
      } else {
        void loadLevel(levelIndex).then((data) => {
          if (data) setLoadedShareLevel(data);
        });
      }
    }
  }, [isShared, levelIndex]);

  const currentLevelData =
    isShared && sharedLevel
      ? {
          id: sharedLevel.symbol || '★',
          hue: sharedLevel.hue || '#070737',
          antiHue: sharedLevel.antiHue || '#c56805',
          symbol: sharedLevel.symbol || '?',
          atom: sharedLevel.atom || t.levelFinished.customLevelFallback
        }
      : getLevelMetadata(levelIndex) || {
          id: String(levelIndex),
          hue: '#070737',
          antiHue: '#c56805',
          symbol: '?',
          atom: t.levelFinished.unknownFallback
        };

  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const buildCurrentDuelChallenge = (): DuelChallenge => {
    if (lastRun) {
      return buildDuelFromLastRun(lastRun, DEFAULT_CHALLENGER_NAME);
    }
    const dailyMatch = sharedLevel ? /^daily:(\d{4}-\d{2}-\d{2})$/.exec(sharedLevel.id) : null;
    if (dailyMatch) {
      return buildDuelFromLastRun(
        {
          kind: 'daily',
          dateKey: dailyMatch[1],
          elapsedMs: last || best,
          jumps: lastJumps ?? 0,
          ghostTrajectory: currentLevelScore.ghostTrajectory ?? ''
        },
        DEFAULT_CHALLENGER_NAME
      );
    }
    if (isShared && sharedLevel) {
      return buildDuelFromLastRun(
        {
          kind: 'custom',
          level: sharedLevel,
          elapsedMs: last || best,
          jumps: lastJumps ?? 0,
          ghostTrajectory: currentLevelScore.ghostTrajectory ?? ''
        },
        DEFAULT_CHALLENGER_NAME
      );
    }
    return buildDuelFromLastRun(
      {
        kind: 'campaign',
        levelId: levelIndex,
        elapsedMs: last || best,
        jumps: lastJumps ?? 0,
        ghostTrajectory: currentLevelScore.ghostTrajectory ?? ''
      },
      DEFAULT_CHALLENGER_NAME
    );
  };

  const handleOpenDuelShare = (isRevenge: boolean) => {
    setDuelShareState({
      duel: buildCurrentDuelChallenge(),
      isRevenge
    });
  };

  const handleNextLevel = () => {
    setActiveDuel(null);
    if (nextLevelId === null) {
      navigate('/levels');
      return;
    }
    updateCurrentLevel(nextLevelId);
    const nextLevelData = getLevelMetadata(nextLevelId);
    if (!nextLevelData) {
      navigate('/levels');
      return;
    }
    if (nextLevelData.explanations && nextLevelData.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleRetry = () => {
    if (!isShared) {
      updateCurrentLevel(levelIndex);
    }
    navigate('/game');
  };

  const handleGoToMenu = () => {
    setActiveDuel(null);
    if (isShared) {
      setSharedLevel(null);
    }
    navigate('/');
  };

  const handleSaveToMyLevels = () => {
    saveSharedLevelToCustom(1);
    setSaveMessage(t.levelFinished.savedToCustomToast);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const resolveCardLevel = async (): Promise<LevelData> => {
    if (isShared && sharedLevel) {
      return sharedLevel;
    }
    const direct = loadedShareLevel || getCachedLevel(levelIndex);
    if (direct) {
      return direct;
    }
    if (levelIndex >= 1) {
      const fetched = await loadLevel(levelIndex);
      if (fetched) return fetched;
    }
    return {
      id: String(id),
      hue,
      antiHue,
      symbol,
      atom,
      width: 800,
      height: 600,
      player: { position: { x: 100, y: 100 } },
      door: { x: 700, y: 500 },
      platforms: [],
      particles: [],
      spikes: []
    };
  };

  const handleShareCard = async () => {
    if (isSharingCard) return;
    setIsSharingCard(true);
    try {
      const cardLevel = await resolveCardLevel();
      const isDaily =
        lastRun?.kind === 'daily' ||
        Boolean(sharedLevel && /^daily:\d{4}-\d{2}-\d{2}$/.test(sharedLevel.id));
      const badge =
        activeDuel && isDuelVictory ? 'DUEL VICTORY' : isDaily ? 'DAILY ISOTOPE' : undefined;
      const duelChallenge = buildCurrentDuelChallenge();
      const shareUrl = encodeDuelToUrl(duelChallenge);
      const outcome = await shareReplayCard(
        {
          level: cardLevel,
          timeMs: lastRun?.elapsedMs ?? (last || best),
          jumps: lastRun?.jumps ?? lastJumps ?? 0,
          medal: medal ?? (best > 0 ? 'bronze' : 'none'),
          coherenceTier: coherentRun ? 'HYPER' : undefined,
          ghostTrajectory: lastRun?.ghostTrajectory || currentLevelScore.ghostTrajectory,
          badge,
          shareUrl,
          locale
        },
        { shareUrl }
      );
      setSaveMessage(
        outcome === 'shared'
          ? t.levelFinished.cardSharedToast
          : shareUrl
            ? t.levelFinished.cardDownloadedWithLinkToast
            : t.levelFinished.cardDownloadedToast
      );
      setTimeout(() => setSaveMessage(null), 3500);
    } catch {
      setSaveMessage(t.levelFinished.cardErrorToast);
      setTimeout(() => setSaveMessage(null), 3500);
    } finally {
      setIsSharingCard(false);
    }
  };

  return (
    <div className={styles.container}>
      {activeDuel && (
        <div
          data-testid="duel-verdict"
          className={`${styles.duelVerdict} ${isDuelVictory ? styles.duelVictory : styles.duelDefeat}`}
        >
          <div className={styles.duelVerdictTitle}>
            {isDuelVictory ? t.duel.victoryBadge(duelDeltaStr) : t.duel.defeatBadge(duelDeltaStr)}
          </div>
          <div className={styles.duelVerdictSubtitle}>
            {isDuelVictory
              ? t.duel.youBeat(activeDuel.challengerName, duelDeltaStr)
              : t.duel.rivalTime(
                  activeDuel.challengerName,
                  formatDuelSeconds(activeDuel.challengerTimeMs)
                )}
          </div>
        </div>
      )}

      {isShared && !activeDuel && (
        <div className={styles.customBadge}>
          {t.levelFinished.speedrunChallenge(
            atom,
            sharedLevel?.authorTime ? formatScore(sharedLevel.authorTime) : undefined
          )}
        </div>
      )}
      <h1 className={styles.done}>{atom}</h1>

      <div className={styles.scoresWrapper}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>{t.levelFinished.lastGame}</span>
          <span className={styles.scoreValue}>{formatScore(last)}</span>
          {best === last && best > 0 && (
            <div className={styles.bestBadge}>{t.levelFinished.newRecord}</div>
          )}
        </div>

        <div className={styles.scoreBox}>
          <span className={styles.scoreType}>{t.levelFinished.allTimeBest}</span>
          <span className={styles.scoreValue}>{formatScore(best)}</span>
        </div>
      </div>

      {medalInfo.medal !== 'none' && (
        <div style={{ color: medalInfo.color, fontSize: 22, marginBottom: 10 }}>
          {medalInfo.symbol} {medalInfo.label}
          {lastJumps !== undefined ? ` • ${t.levelFinished.jumpsCount(lastJumps)}` : ''}
        </div>
      )}

      {coherentRun && (
        <div
          data-testid="coherent-run-badge"
          style={{
            color: '#fbbf24',
            fontSize: 20,
            letterSpacing: '0.08em',
            marginBottom: 10,
            padding: '2px 12px',
            border: '1px solid rgba(251, 191, 36, 0.7)',
            borderRadius: 6,
            background: 'rgba(251, 191, 36, 0.12)'
          }}
        >
          ⚡ COHERENT RUN
          {displayStyleScore !== undefined && displayStyleScore > 0
            ? ` • FLOW ${displayStyleScore}`
            : ''}
        </div>
      )}

      <div className={styles.molecule} style={{ backgroundColor: hue, color: antiHue }}>
        <span className={styles.atomicId}>{id}</span>
        <span>{symbol}</span>
      </div>

      <div className={styles.duelCtaRow}>
        {activeDuel && isDuelVictory ? (
          <button
            type="button"
            className={styles.buttonRevenge}
            onClick={() => handleOpenDuelShare(true)}
          >
            ⚔ {t.duel.sendRevengeLink}
          </button>
        ) : (
          <button
            type="button"
            className={styles.buttonChallenge}
            onClick={() => handleOpenDuelShare(false)}
          >
            ⚔ {t.duel.challengeFriend}
          </button>
        )}
        <button
          type="button"
          className={styles.buttonShareCard}
          onClick={() => {
            void handleShareCard();
          }}
          disabled={isSharingCard}
        >
          🖼 {t.levelFinished.shareCard}
        </button>
      </div>

      {isShared ? (
        <div className={styles.buttonContainer} style={{ flexWrap: 'wrap', maxWidth: 440 }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMenu}`}
            onClick={handleGoToMenu}
          >
            {t.levelFinished.menu}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            {activeDuel ? t.duel.rematch : t.levelFinished.retry}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSave}`}
            onClick={handleSaveToMyLevels}
          >
            {t.levelFinished.save}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            {t.levelFinished.share}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={() => {
              setActiveDuel(null);
              setSharedLevel(null);
              navigate('/levels');
            }}
          >
            {t.levelFinished.levels}
          </button>
        </div>
      ) : (
        <div className={styles.buttonContainer}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMenu}`}
            onClick={handleGoToMenu}
          >
            {t.levelFinished.menu}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonRetry}`}
            onClick={handleRetry}
          >
            {activeDuel ? t.duel.rematch : t.levelFinished.retry}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonShare}`}
            onClick={() => setIsShareOpen(true)}
          >
            {t.levelFinished.share}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonNext}`}
            onClick={handleNextLevel}
          >
            {t.levelFinished.next}
          </button>
        </div>
      )}

      {saveMessage && <div className={styles.saveToast}>{saveMessage}</div>}

      {isShareOpen && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          level={{
            ...(isShared && sharedLevel
              ? sharedLevel
              : loadedShareLevel ||
                getCachedLevel(levelIndex) || {
                  id: String(levelIndex),
                  hue: '#070737',
                  antiHue: '#c56805',
                  symbol: '?',
                  atom: t.levelFinished.unknownFallback,
                  width: 800,
                  height: 600,
                  player: { position: { x: 100, y: 100 } },
                  door: { x: 700, y: 500 },
                  platforms: [],
                  particles: [],
                  spikes: []
                }),
            authorGhost: currentLevelScore.ghostTrajectory,
            authorTime: best || last
          }}
        />
      )}

      {duelShareState && (
        <ShareModal
          isOpen={true}
          onClose={() => setDuelShareState(null)}
          duel={duelShareState.duel}
          isRevenge={duelShareState.isRevenge}
        />
      )}
    </div>
  );
}
