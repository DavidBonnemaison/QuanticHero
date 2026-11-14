import QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useState } from 'react';
import formatScore from '../../tools/formatScore';
import { encodeLevelToUrl } from '../../tools/levelCodec';
import type { LevelData } from '../../types';
import styles from './ShareModal.module.css';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: LevelData;
  onPlay?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, level, onPlay }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const url = encodeLevelToUrl(level);
    setShareUrl(url);

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
  }, [isOpen, level]);

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="share-modal-backdrop"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          [X]
        </button>

        <div className={styles.header}>
          <h2 id="share-modal-title" className={styles.title}>
            === QUANTUM CHALLENGE ===
          </h2>
          <p className={styles.subtitle}>SCAN ARCADE QR CODE OR COPY CHALLENGE LINK</p>
        </div>

        <div className={styles.levelInfo}>
          <div className={styles.atomBadge}>
            [ {level.symbol || '?'} {level.atom || 'Custom Level'} ]
          </div>
          {level.authorTime !== undefined && level.authorTime > 0 && (
            <div className={styles.authorRecord}>
              RECORD TO BEAT: {formatScore(level.authorTime)}
            </div>
          )}
          {level.authorGhost && (
            <div className={styles.ghostBadge}>★ AUTHOR GHOST INCLUDED IN CHALLENGE ★</div>
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
              aria-label="Level URL"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className={styles.copyButton} onClick={handleCopy}>
              COPY LINK
            </button>
          </div>
          {copied && (
            <div className={styles.toast} role="status" aria-live="polite">
              ★ LINK COPIED TO CLIPBOARD! ★
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
