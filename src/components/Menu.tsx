import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../audio/SoundManager';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import { hapticFeedback } from '../tools/HapticFeedback';
import type { LevelData } from '../types';
import styles from './Menu.module.css';
import Molecules from './Molecules';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function Menu(): React.ReactElement {
  const navigate = useNavigate();
  const customLevels = useGameStore((state) => state.customLevels);
  const setLevels = useGameStore((state) => state.setLevels);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleMute = useGameStore((state) => state.toggleMute);
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const toggleHaptics = useGameStore((state) => state.toggleHaptics);
  const reducedEffects = useGameStore((state) => state.reducedEffects);
  const toggleReducedEffects = useGameStore((state) => state.toggleReducedEffects);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    Molecules.start();
    hapticFeedback.init();
    if (!customLevels) {
      setLevels(levels as unknown as Record<string, LevelData>);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      Molecules.end();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [customLevels, setLevels]);

  const handleNewGame = () => {
    updateCurrentLevel(1);
    navigate('/explanation');
  };

  const handleGoToLevels = () => {
    navigate('/levels');
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleToggleSound = () => {
    soundManager.init();
    soundManager.ensureContext();
    toggleMute();
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) {
      hapticFeedback.triggerJump();
    }
  };

  const handleToggleEffects = () => {
    toggleReducedEffects();
  };

  return (
    <div className={styles.menuWrapper}>
      <div className={styles.topControls}>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleHaptics}
          aria-label={hapticsEnabled ? 'Disable haptics' : 'Enable haptics'}
          title={hapticsEnabled ? 'Disable haptics' : 'Enable haptics'}
        >
          {hapticsEnabled ? '📳' : '📴'}
        </button>
        <button
          type="button"
          className={styles.soundButton}
          onClick={handleToggleEffects}
          aria-label={
            reducedEffects ? 'Enable full visual effects' : 'Enable reduced visual effects'
          }
          title={reducedEffects ? 'Enable full visual effects' : 'Enable reduced visual effects'}
        >
          {reducedEffects ? '⚡' : '✨'}
        </button>
      </div>
      <div id="container" />
      <h1 className={styles.title}>Quantum Hero</h1>
      <button type="button" className={styles.button} onClick={handleNewGame}>
        New game
      </button>
      <button type="button" className={styles.button} onClick={handleGoToLevels}>
        Levels
      </button>
      <button type="button" className={styles.button} onClick={() => navigate('/editor')}>
        Level Editor & Share
      </button>
      {installPrompt && (
        <button type="button" className={styles.button} onClick={handleInstallClick}>
          Install App
        </button>
      )}
    </div>
  );
}
