import Phaser from 'phaser';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Game.module.css';
import { computeViewportSize, getInitialViewportSize } from './config';
import { loadLevel, preloadLevel } from './data/levels';
import { getMoleculeById } from './data/molecules';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import { generateDailyIsotope } from './services/DailyIsotopeService';
import { useGameStore } from './store';
import { decodeLevelFromUrl } from './tools/levelCodec';

declare global {
  interface Window {
    game: Phaser.Game | null;
  }
}

export interface GameContainerProps {
  isDaily?: boolean;
}

export const GameContainer: React.FC<GameContainerProps> = ({ isDaily = false }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { moleculeId } = useParams<{ moleculeId?: string }>();

  useEffect(() => {
    let cancelled = false;

    if (moleculeId) {
      const recipe = getMoleculeById(moleculeId);
      if (recipe) {
        useGameStore.getState().setSharedLevel(recipe.levelData);
      }
    } else if (!isDaily && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('custom=') || search.includes('custom=')) {
        const decoded = decodeLevelFromUrl(hash || search);
        if (decoded) {
          useGameStore.getState().setSharedLevel(decoded);
        }
      }
    }

    const resolveStageSize = () => {
      const el = stageRef.current;
      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        return { width: el.clientWidth, height: el.clientHeight };
      }
      if (typeof window !== 'undefined') {
        const computed = computeViewportSize(window.innerWidth, window.innerHeight);
        return { width: computed.width, height: computed.height };
      }
      const fallback = getInitialViewportSize();
      return { width: fallback.width, height: fallback.height };
    };

    const handleViewportResize = () => {
      const game = gameRef.current;
      if (!game?.scale) return;
      const { width, height } = resolveStageSize();
      if (width > 0 && height > 0) {
        game.scale.resize(width, height);
      }
    };

    const startPhaser = async () => {
      if (isDaily) {
        const dailyLevel = await generateDailyIsotope();
        if (cancelled) return;
        useGameStore.getState().setSharedLevel(dailyLevel);
      } else {
        const currentLevel = useGameStore.getState().currentLevel || 1;
        await Promise.all([loadLevel(1), loadLevel(currentLevel)]);
        preloadLevel(currentLevel + 1);
      }

      if (cancelled) return;

      const { width, height } = resolveStageSize();

      const gameConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: stageRef.current ?? 'game',
        width,
        height,
        scale: {
          mode: Phaser.Scale.RESIZE,
          parent: stageRef.current ?? 'game',
          width,
          height,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleViewportResize();
      });
      resizeObserver.observe(stageRef.current);
    }

    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('orientationchange', handleViewportResize);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('orientationchange', handleViewportResize);
      if (moleculeId || isDaily) {
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
  }, [moleculeId, isDaily]);

  return (
    <div className={styles.viewport}>
      <div id="game" ref={stageRef} className={styles.gameStage} />
    </div>
  );
};

export default GameContainer;
