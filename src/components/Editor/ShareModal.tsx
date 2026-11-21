import QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useState } from 'react';
import { getLevelMetadata } from '../../data/levels';
import { getStrings } from '../../i18n/strings';
import { useGameStore } from '../../store';
import formatScore from '../../tools/formatScore';
import {
  DEFAULT_CHALLENGER_NAME,
  encodeDuelToUrl,
  encodeLevelToUrl,
  formatDuelSeconds,
  sanitizeChallengerName
} from '../../tools/levelCodec';
import type { DuelChallenge, LevelData } from '../../types';
import styles from './ShareModal.module.css';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  level?: LevelData;
  duel?: DuelChallenge;
  isRevenge?: boolean;
  onPlay?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  level,
  duel,
  isRevenge = false,
  onPlay
}) => {
  const locale = useGameStore((state) => state.locale ?? 'en');
  const t = getStrings(locale);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [challengerName, setChallengerName] = useState<string>(
    duel?.challengerName || DEFAULT_CHALLENGER_NAME
  );

  useEffect(() => {
    if (isOpen && duel) {
      setChallengerName(duel.challengerName || DEFAULT_CHALLENGER_NAME);
    }
  }, [isOpen, duel]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    let url = '';
    if (duel) {
      const effectiveDuel: DuelChallenge = {
        ...duel,
        challengerName: sanitizeChallengerName(challengerName)
      };
      url = encodeDuelToUrl(effectiveDuel);
    } else if (level) {
      url = encodeLevelToUrl(level);
    }
    setShareUrl(url);
    if (!url) return;

    // Generate high resolution QR Code
    let isCancelled = false;
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#05051a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((dataUrl) => {
        if (!isCancelled) {
          setQrCodeDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, level, duel, challengerName]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      await handleCopy();
      return;
    }
    try {
      const sanitizedTag = sanitizeChallengerName(challengerName);
      const title = isRevenge ? 'Quantum Hero — Revenge Duel!' : 'Quantum Hero — Ghost Tennis Duel';
      const text = duel
        ? `Beat ${sanitizedTag}'s ${formatDuelSeconds(duel.challengerTimeMs)} ghost run in Quantum Hero!`
        : 'Play my Quantum Hero challenge!';
      await navigator.share({ title, text, url: shareUrl });
    } catch {
      // User cancelled share sheet or share failed
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const duelBadgeText = (() => {
    if (!duel) return '';
    if (duel.kind === 'campaign') {
      const meta = getLevelMetadata(duel.levelId);
      return meta
        ? `[ ${meta.symbol} ${meta.atom} (#${duel.levelId}) ]`
        : `[ ATOM #${duel.levelId} ]`;
    }
    if (duel.kind === 'daily') {
      return `[ DAILY ISOTOPE ${duel.dateKey} ]`;
    }
    return `[ ${duel.level.symbol || '?'} ${duel.level.atom || 'Custom Level'} ]`;
  })();

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="share-modal-backdrop"
    >
      <div
        className={`${styles.modal} ${duel ? styles.duelModal : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          [X]
        </button>

        <div className={styles.header}>
          <h2 id="share-modal-title" className={`${styles.title} ${duel ? styles.duelTitle : ''}`}>
            {duel
              ? isRevenge
                ? t.duel.modalTitleRevenge
                : t.duel.modalTitleDuel
              : '=== QUANTUM CHALLENGE ==='}
          </h2>
          <p className={styles.subtitle}>
            {duel ? t.duel.modalSubtitle : 'SCAN ARCADE QR CODE OR COPY CHALLENGE LINK'}
          </p>
        </div>

        <div className={styles.levelInfo}>
          {duel ? (
            <>
              <div className={styles.atomBadge}>{duelBadgeText}</div>
              <div className={styles.authorRecord}>
                {sanitizeChallengerName(challengerName)} —{' '}
                {formatDuelSeconds(duel.challengerTimeMs)} • {t.hud.jumps(duel.challengerJumps)}
              </div>
              {duel.ghostTrajectory && (
                <div className={styles.ghostBadge}>
                  {t.duel.ghostIncluded.replace(/^★\s+/, '★\u00A0').replace(/\s+★$/, '\u00A0★')}
                </div>
              )}
              <div className={styles.duelTagRow}>
                <label htmlFor="duel-tag-input" className={styles.duelTagLabel}>
                  {t.duel.nicknameLabel}:
                </label>
                <input
                  id="duel-tag-input"
                  type="text"
                  maxLength={12}
                  value={challengerName}
                  placeholder={t.duel.nicknamePlaceholder}
                  onChange={(e) => setChallengerName(e.target.value)}
                  className={styles.duelTagInput}
                  aria-label={t.duel.nicknameLabel}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.atomBadge}>
                [ {level?.symbol || '?'} {level?.atom || 'Custom Level'} ]
              </div>
              {level?.authorTime !== undefined && level.authorTime > 0 && (
                <div className={styles.authorRecord}>
                  RECORD TO BEAT: {formatScore(level.authorTime)}
                </div>
              )}
              {level?.authorGhost && (
                <div className={styles.ghostBadge}>
                  {'★\u00A0AUTHOR GHOST INCLUDED IN CHALLENGE\u00A0★'}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.qrContainer}>
          <div className={styles.qrCard}>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Level QR Code"
                className={styles.qrImage}
                data-testid="qr-code-image"
              />
            ) : (
              <div className={styles.qrLoading}>GENERATING QR CODE...</div>
            )}
          </div>
          <div className={styles.qrHint}>[ SCAN WITH A SMARTPHONE CAMERA ]</div>
        </div>

        <div className={styles.urlSection}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={styles.urlInput}
              aria-label={duel ? 'Duel URL' : 'Level URL'}
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className={styles.copyButton} onClick={handleCopy}>
              {duel ? t.duel.copyLink : 'COPY LINK'}
            </button>
          </div>
          {copied && (
            <div className={styles.toast} role="status" aria-live="polite">
              {duel ? t.duel.linkCopied : '★ LINK COPIED TO CLIPBOARD! ★'}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={onClose}
          >
            [ CLOSE ]
          </button>
          {duel && canNativeShare && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.nativeShareButton}`}
              onClick={handleNativeShare}
            >
              [ {t.duel.shareNative} ↗ ]
            </button>
          )}
          {onPlay && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.playButton}`}
              onClick={onPlay}
            >
              [ PLAY CHALLENGE ▶ ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
