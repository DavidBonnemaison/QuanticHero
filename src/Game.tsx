import Phaser from 'phaser';
import type React from 'react';
import { useEffect, useRef } from 'react';
import config from './config';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';

declare global {
  interface Window {
    game: Phaser.Game | null;
  }
}

export const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
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

    return () => {
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
  }, []);

  return <div id="game" />;
};

export default GameContainer;
