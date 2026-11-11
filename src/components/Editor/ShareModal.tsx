import QRCode from 'qrcode';
import type React from 'react';
import { useEffect, useState } from 'react';
import { encodeLevelToUrl } from '../../tools/levelCodec';
import type { LevelData } from '../../types';
import styles from './ShareModal.module.css';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: LevelData;
  onPlay?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  level,
  onPlay
}) => {
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
      width: 280,
      margin: 2,
      color: {
        dark: '#070737',
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
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const platformCount = level.platforms?.length ?? 0;
  const particleCount = level.particles?.length ?? 0;

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
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <div className={styles.header}>
          <h2 id="share-modal-title" className={styles.title}>
            Partage de Niveau
          </h2>
          <p className={styles.subtitle}>
            Scannez le QR Code ou copiez le lien pour jouer immédiatement sans inscription.
          </p>
        </div>

        <div className={styles.levelInfo}>
          <span className={styles.atomBadge}>
            {level.symbol || '?'} {level.atom || 'Custom Level'}
          </span>
          <span className={styles.levelStats}>
            {platformCount} plateformes • {particleCount} particules • {shareUrl.length} car.
          </span>
        </div>

        <div className={styles.qrContainer}>
          <div className={styles.qrCard}>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code du niveau"
                className={styles.qrImage}
                data-testid="qr-code-image"
              />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#333'
                }}
              >
                Génération du QR Code...
              </div>
            )}
          </div>
          <div className={styles.qrHint}>
            <span>📱</span> Scannez avec l'appareil photo d'un smartphone
          </div>
        </div>

        <div className={styles.urlSection}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={styles.urlInput}
              aria-label="URL du niveau"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
            >
              Copier le lien
            </button>
          </div>
          {copied && (
            <div className={styles.toast} role="status" aria-live="polite">
              Lien copié dans le presse-papier !
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={onClose}
          >
            Fermer
          </button>
          {onPlay && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.playButton}`}
              onClick={onPlay}
            >
              Tester immédiatement ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
