import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    Molecules.start();
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

  return (
    <div className={styles.menuWrapper}>
      <div id="container" />
      <h1 className={styles.title}>Quantum Hero</h1>
      <button type="button" className={styles.button} onClick={handleNewGame}>
        New game
      </button>
      <button type="button" className={styles.button} onClick={handleGoToLevels}>
        Levels
      </button>
      {installPrompt && (
        <button type="button" className={styles.button} onClick={handleInstallClick}>
          Install App
        </button>
      )}
    </div>
  );
}
