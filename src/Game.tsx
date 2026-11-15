import Phaser from 'phaser';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import config from './config';
import { loadLevel, preloadLevel } from './data/levels';
import { getMoleculeById } from './data/molecules';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import { useGameStore } from './store';
import { decodeLevelFromUrl } from './tools/levelCodec';

declare global {
  interface Window {
    game: Phaser.Game | null;
  }
}

export const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { moleculeId } = useParams<{ moleculeId?: string }>();

  useEffect(() => {
    let cancelled = false;

    if (moleculeId) {
      const recipe = getMoleculeById(moleculeId);
      if (recipe) {
        useGameStore.getState().setSharedLevel(recipe.levelData);
      }
    } else if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('custom=') || search.includes('custom=')) {
        const decoded = decodeLevelFromUrl(hash || search);
        if (decoded) {
          useGameStore.getState().setSharedLevel(decoded);
        }
      }
    }

    const startPhaser = async () => {
      const currentLevel = useGameStore.getState().currentLevel || 1;
      await Promise.all([loadLevel(1), loadLevel(currentLevel)]);
      preloadLevel(currentLevel + 1);

      if (cancelled) return;

      const gameConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'game',
        width: config.width,
        height: config.height,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 700 },
            debug: false
          }
        },
        scene: [BootScene, PreloadScene, GameScene]
      };

      const gameInstance = new Phaser.Game(gameConfig);
      gameRef.current = gameInstance;
      window.game = gameInstance;
    };

    void startPhaser();

    return () => {
      cancelled = true;
      if (moleculeId) {
        useGameStore.getState().setSharedLevel(null);
      }
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch {
          // game may have already been destroyed on level completion
        }
        gameRef.current = null;
        window.game = null;
      }
    };
  }, [moleculeId]);

  return <div id="game" />;
};

export default GameContainer;
